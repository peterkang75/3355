const express = require('express');
const prisma = require('../db');
const { requireAuth, requireOperator } = require('../middleware/auth');

const router = express.Router();

// ── 월별 거래 집계 헬퍼 ───────────────────────────────────────────────────
async function getMonthlyStats(yearMonth) {
  const prefix = yearMonth; // "2026-04"

  const transactions = await prisma.transaction.findMany({
    where: { date: { startsWith: prefix } },
    select: { type: true, category: true, description: true, amount: true, memberId: true },
  });

  let totalIncome = 0;    // payment + donation (크레딧 납부 제외)
  let totalExpense = 0;   // expense (크레딧 자동 차감/납부 제외)
  let totalCharge = 0;    // charge (미수금 발생)
  let totalPaid = 0;      // payment (실납부)
  const incomeByCategory = {};
  const expenseByCategory = {};

  for (const t of transactions) {
    if (t.type === 'payment' &&
        t.category !== '크레딧 자동 납부' &&
        t.category !== '크레딧 납부' &&
        t.category !== '크레딧 자동 차감') {
      totalIncome += t.amount;
      const key = t.category || t.description || '기타 수입';
      incomeByCategory[key] = (incomeByCategory[key] || 0) + t.amount;
      totalPaid += t.amount;
    } else if (t.type === 'donation') {
      totalIncome += t.amount;
      const key = '도네이션';
      incomeByCategory[key] = (incomeByCategory[key] || 0) + t.amount;
    } else if (t.type === 'expense' &&
               t.category !== '크레딧 자동 차감' &&
               t.category !== '크레딧 납부') {
      totalExpense += t.amount;
      const key = t.category || t.description || '기타 지출';
      expenseByCategory[key] = (expenseByCategory[key] || 0) + t.amount;
    } else if (t.type === 'credit') {
      // 크레딧 지급 = 클럽 지출 (과납 환급, 상금 등)
      totalExpense += t.amount;
      const key = t.category || t.description || '크레딧 지급';
      expenseByCategory[key] = (expenseByCategory[key] || 0) + t.amount;
    } else if (t.type === 'charge') {
      totalCharge += t.amount;
    }
  }

  return { totalIncome, totalExpense, totalCharge, totalPaid, incomeByCategory, expenseByCategory };
}

// ── GET /api/settlement/closed — 마감된 정산서 목록 ──────────────────────
router.get('/closed', requireAuth, async (req, res) => {
  try {
    const settlements = await prisma.monthlySettlement.findMany({
      where: { isClosed: true },
      orderBy: { yearMonth: 'desc' },
    });

    const results = await Promise.all(settlements.map(async (s) => {
      const stats = await getMonthlyStats(s.yearMonth);
      return {
        yearMonth: s.yearMonth,
        carryover: s.carryover || 0,
        totalIncome: stats.totalIncome,
        totalExpense: stats.totalExpense,
        netBalance: (s.carryover || 0) + stats.totalIncome - stats.totalExpense,
        closedAt: s.closedAt,
      };
    }));

    res.json(results);
  } catch (error) {
    console.error('Error fetching closed settlements:', error);
    res.status(500).json({ error: 'Failed to fetch closed settlements' });
  }
});

// ── GET /api/settlement/:yearMonth/category — 카테고리별 거래 상세 ──────────
router.get('/:yearMonth/category', requireAuth, async (req, res) => {
  try {
    const { yearMonth } = req.params;
    const { key, side } = req.query; // key: 카테고리명, side: 'income'|'expense'

    if (!key || !side) return res.status(400).json({ error: 'key and side are required' });

    const transactions = await prisma.transaction.findMany({
      where: { date: { startsWith: yearMonth } },
      select: {
        id: true, type: true, category: true, description: true,
        amount: true, date: true, memo: true,
        receiptImages: true, receiptImage: true,
        member: { select: { name: true, nickname: true } },
        booking: { select: { title: true, courseName: true } },
      },
      orderBy: { date: 'desc' },
    });

    // getMonthlyStats와 동일한 로직으로 해당 카테고리 거래 필터링
    const matched = transactions.filter(t => {
      if (side === 'income') {
        if (t.type === 'payment' &&
            t.category !== '크레딧 자동 납부' &&
            t.category !== '크레딧 납부' &&
            t.category !== '크레딧 자동 차감') {
          const txKey = t.category || t.description || '기타 수입';
          return txKey === key;
        }
        if (t.type === 'donation') return key === '도네이션';
      } else if (side === 'expense') {
        if (t.type === 'expense' &&
            t.category !== '크레딧 자동 차감' &&
            t.category !== '크레딧 납부') {
          const txKey = t.category || t.description || '기타 지출';
          return txKey === key;
        }
        if (t.type === 'credit') {
          const txKey = t.category || t.description || '크레딧 지급';
          return txKey === key;
        }
      }
      return false;
    });

    res.json(matched);
  } catch (error) {
    console.error('Error fetching category transactions:', error);
    res.status(500).json({ error: 'Failed to fetch category transactions' });
  }
});

// ── GET /api/settlement/:yearMonth — 월별 정산 보고서 ─────────────────────
router.get('/:yearMonth', requireAuth, async (req, res) => {
  try {
    const { yearMonth } = req.params; // "2026-04"

    // 이 달 정산 레코드 (이월금 포함)
    const settlement = await prisma.monthlySettlement.findUnique({
      where: { yearMonth },
    });

    // 이 달 통계
    const stats = await getMonthlyStats(yearMonth);
    const carryover = settlement?.carryover || 0;
    const netBalance = carryover + stats.totalIncome - stats.totalExpense;

    // 이 달 미수금 (전체 기간 미수금에서 이 달 청구분)
    const thisMonthCharges = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { date: { startsWith: yearMonth }, type: 'charge' },
    });
    const thisMonthPaymentsForCharge = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        date: { startsWith: yearMonth },
        type: 'payment',
        category: { notIn: ['크레딧 자동 납부', '크레딧 납부', '크레딧 자동 차감'] },
      },
    });
    const outstanding = Math.max(0,
      (thisMonthCharges._sum.amount || 0) - (thisMonthPaymentsForCharge._sum.amount || 0)
    );

    res.json({
      yearMonth,
      carryover,
      ...stats,
      netBalance,
      outstanding,
      isClosed: settlement?.isClosed || false,
      closedAt: settlement?.closedAt || null,
      notes: settlement?.notes || '',
    });
  } catch (error) {
    console.error('Error fetching settlement:', error);
    res.status(500).json({ error: 'Failed to fetch settlement' });
  }
});

// ── PUT /api/settlement/:yearMonth/carryover — 이월금 수동 설정 ──────────
router.put('/:yearMonth/carryover', requireAuth, requireOperator, async (req, res) => {
  try {
    const { yearMonth } = req.params;
    const { carryover, notes } = req.body;

    const settlement = await prisma.monthlySettlement.upsert({
      where: { yearMonth },
      update: { carryover: parseInt(carryover) || 0, notes },
      create: { yearMonth, carryover: parseInt(carryover) || 0, notes },
    });

    res.json(settlement);
  } catch (error) {
    console.error('Error updating carryover:', error);
    res.status(500).json({ error: 'Failed to update carryover' });
  }
});

// ── POST /api/settlement/:yearMonth/close — 월 마감 (다음달 이월 자동 생성) ─
router.post('/:yearMonth/close', requireAuth, requireOperator, async (req, res) => {
  try {
    const { yearMonth } = req.params;

    const stats = await getMonthlyStats(yearMonth);
    const settlement = await prisma.monthlySettlement.findUnique({ where: { yearMonth } });
    const carryover = settlement?.carryover || 0;
    const netBalance = carryover + stats.totalIncome - stats.totalExpense;

    // 다음달 계산
    const [year, month] = yearMonth.split('-').map(Number);
    const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;

    await prisma.$transaction(async (tx) => {
      // 이번달 마감
      await tx.monthlySettlement.upsert({
        where: { yearMonth },
        update: { isClosed: true, closedAt: new Date(), closedBy: req.member.id },
        create: { yearMonth, carryover, isClosed: true, closedAt: new Date(), closedBy: req.member.id },
      });

      // 다음달 이월금 설정
      await tx.monthlySettlement.upsert({
        where: { yearMonth: nextMonth },
        update: { carryover: Math.round(netBalance) },
        create: { yearMonth: nextMonth, carryover: Math.round(netBalance) },
      });
    });

    res.json({ success: true, nextMonth, carryoverToNext: Math.round(netBalance) });
  } catch (error) {
    console.error('Error closing settlement:', error);
    res.status(500).json({ error: 'Failed to close settlement' });
  }
});

// ── POST /api/settlement/:yearMonth/reopen — 마감 취소 ───────────────────
router.post('/:yearMonth/reopen', requireAuth, requireOperator, async (req, res) => {
  try {
    const { yearMonth } = req.params;
    await prisma.monthlySettlement.update({
      where: { yearMonth },
      data: { isClosed: false, closedAt: null, closedBy: null },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error reopening settlement:', error);
    res.status(500).json({ error: 'Failed to reopen settlement' });
  }
});

// ── GET /api/settlement/:yearMonth/report — 상세 정산서 ─────────────────────
router.get('/:yearMonth/report', requireAuth, async (req, res) => {
  try {
    const { yearMonth } = req.params;

    const settlement = await prisma.monthlySettlement.findUnique({ where: { yearMonth } });
    const carryover = settlement?.carryover || 0;

    // 이달 거래 전체 (메모·회원·북킹 포함)
    const transactions = await prisma.transaction.findMany({
      where: { date: { startsWith: yearMonth } },
      select: {
        id: true, type: true, category: true, description: true, memo: true,
        amount: true, date: true,
        member: { select: { name: true, nickname: true } },
        booking: { select: { title: true, courseName: true } },
      },
      orderBy: { date: 'asc' },
    });

    // 수입 카테고리별 그룹
    const incomeMap = {};
    const expenseMap = {};
    let totalIncome = 0, totalExpense = 0;

    for (const t of transactions) {
      const isIncome = t.type === 'payment' &&
        !['크레딧 자동 납부', '크레딧 납부', '크레딧 자동 차감'].includes(t.category);
      const isDonation = t.type === 'donation';
      const isExpense = t.type === 'expense' &&
        !['크레딧 자동 차감', '크레딧 납부'].includes(t.category);
      const isCredit = t.type === 'credit';

      const item = {
        id: t.id,
        date: t.date,
        memberName: t.member?.nickname || t.member?.name || '',
        memo: t.memo || (t.description && t.description !== (t.category || '') ? t.description : '') || '',
        amount: t.amount,
      };

      if (isIncome) {
        totalIncome += t.amount;
        const key = t.category || t.description || '기타 수입';
        if (!incomeMap[key]) incomeMap[key] = { category: key, total: 0, items: [] };
        incomeMap[key].total += t.amount;
        incomeMap[key].items.push(item);
      } else if (isDonation) {
        totalIncome += t.amount;
        if (!incomeMap['도네이션']) incomeMap['도네이션'] = { category: '도네이션', total: 0, items: [] };
        incomeMap['도네이션'].total += t.amount;
        incomeMap['도네이션'].items.push(item);
      } else if (isExpense) {
        totalExpense += t.amount;
        const key = t.category || t.description || '기타 지출';
        if (!expenseMap[key]) expenseMap[key] = { category: key, total: 0, items: [] };
        expenseMap[key].total += t.amount;
        expenseMap[key].items.push(item);
      } else if (isCredit) {
        totalExpense += t.amount;
        const key = t.category || t.description || '크레딧 지급';
        if (!expenseMap[key]) expenseMap[key] = { category: key, total: 0, items: [] };
        expenseMap[key].total += t.amount;
        expenseMap[key].items.push(item);
      }
    }

    const netBalance = carryover + totalIncome - totalExpense;

    // 이달 라운딩 목록
    const [y, m] = yearMonth.split('-');
    const startDate = `${y}-${m}-01`;
    const endDate = `${y}-${m}-31`;
    const bookings = await prisma.booking.findMany({
      where: { date: { gte: startDate, lte: endDate }, type: '정기모임' },
      select: { title: true, courseName: true, date: true, time: true, participants: true },
      orderBy: { date: 'asc' },
    });

    res.json({
      yearMonth,
      carryover,
      totalIncome,
      totalExpense,
      netBalance,
      isClosed: settlement?.isClosed || false,
      closedAt: settlement?.closedAt || null,
      incomeByCategory: Object.values(incomeMap).sort((a, b) => b.total - a.total),
      expenseByCategory: Object.values(expenseMap).sort((a, b) => b.total - a.total),
      bookings: bookings.map(b => ({
        title: b.title || b.courseName,
        courseName: b.courseName,
        date: b.date,
        time: b.time,
        participantCount: Array.isArray(b.participants) ? b.participants.length : 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching settlement report:', error);
    res.status(500).json({ error: 'Failed to fetch settlement report' });
  }
});

module.exports = router;
