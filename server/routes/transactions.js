const express = require("express");
const prisma = require("../db");
const { recalculateAndUpdateBalance } = require('../utils/balance');
const { requireAuth, requireOperator } = require('../middleware/auth');

const router = express.Router();

// 모든 거래 내역 조회 (페이지네이션 지원, 이미지 제외)
router.get("/", requireAuth, requireOperator, async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const skip = (page - 1) * limit;
    const includeCharges = req.query.includeCharges === 'true';
    const bookingId = req.query.bookingId;

    let whereClause = includeCharges ? {} : { type: { not: "charge" } };
    if (bookingId && bookingId !== 'all') {
      whereClause = { ...whereClause, bookingId };
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        select: {
          id: true,
          type: true,
          amount: true,
          description: true,
          category: true,
          memo: true,
          date: true,
          createdAt: true,
          memberId: true,
          bookingId: true,
          createdBy: true,
          member: { select: { id: true, name: true, nickname: true } },
          booking: { select: { id: true, title: true, courseName: true, date: true } },
          executor: { select: { id: true, name: true, nickname: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: skip,
      }),
      prisma.transaction.count({ where: whereClause }),
    ]);

    res.json({
      transactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// 거래 상세 정보 조회 (영수증 이미지 포함)
router.get("/:id/details", requireAuth, requireOperator, async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      select: { id: true, receiptImage: true, receiptImages: true },
    });

    if (!transaction) return res.status(404).json({ error: "Transaction not found" });

    res.json(transaction);
  } catch (error) {
    console.error("Error fetching transaction details:", error);
    res.status(500).json({ error: "Failed to fetch transaction details" });
  }
});

// 회원별 거래 내역 조회 (이미지 제외)
router.get("/member/:memberId", requireAuth, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { memberId: req.params.memberId },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        category: true,
        memo: true,
        date: true,
        createdAt: true,
        booking: { select: { id: true, title: true, courseName: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    res.json(transactions);
  } catch (error) {
    console.error("Error fetching member transactions:", error);
    res.status(500).json({ error: "Failed to fetch member transactions" });
  }
});

// 회원 잔액 계산
router.get("/balance/:memberId", requireAuth, async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.memberId },
      select: { balance: true },
    });
    res.json({ balance: member?.balance || 0 });
  } catch (error) {
    console.error("Error calculating member balance:", error);
    res.status(500).json({ error: "Failed to calculate balance" });
  }
});

// 클럽 전체 잔액 및 카테고리별 내역
router.get('/club-balance', requireAuth, requireOperator, async (req, res) => {
  try {
    const [incomeAgg, expenseAgg, creditExpenseAgg, creditAgg, incomeGroups, expenseGroups] = await Promise.all([
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: { in: ['payment', 'donation'] } } }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'expense' } }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'expense', category: { in: ['크레딧 자동 차감', '크레딧 납부'] } } }),
      prisma.transaction.aggregate({ _sum: { amount: true }, where: { type: 'credit' } }),
      prisma.transaction.groupBy({ by: ['category', 'description'], _sum: { amount: true }, where: { type: { in: ['payment', 'donation'] } } }),
      prisma.transaction.groupBy({ by: ['category'], _sum: { amount: true }, where: { type: 'expense' } })
    ]);

    const totalIncome = incomeAgg._sum.amount || 0;
    const totalExpense = expenseAgg._sum.amount || 0;
    const totalCreditExpense = creditExpenseAgg._sum.amount || 0;
    const totalCreditIssued = creditAgg._sum.amount || 0;
    const realExpense = totalExpense - totalCreditExpense;
    const balance = totalIncome - realExpense - totalCreditIssued;

    const incomeBreakdown = {};
    incomeGroups.forEach(g => {
      let key = g.category || '기타 수입';
      if (key === '기타 수입' && g.description) {
        if (g.description.includes(' - ')) key = g.description.split(' - ')[0];
        else if (g.description.includes(' (')) key = g.description.split(' (')[0];
        else key = g.description;
      }
      incomeBreakdown[key] = (incomeBreakdown[key] || 0) + (g._sum.amount || 0);
    });

    const expenseBreakdown = {};
    expenseGroups.forEach(g => {
      const key = g.category || '기타 지출';
      expenseBreakdown[key] = (expenseBreakdown[key] || 0) + (g._sum.amount || 0);
    });

    res.json({ balance, incomeBreakdown, expenseBreakdown });
  } catch (error) {
    console.error('Error calculating club stats:', error);
    res.status(500).json({ error: 'Failed to calculate club stats' });
  }
});

// 장부에 기록된 라운딩 목록 조회
router.get("/bookings", requireAuth, requireOperator, async (req, res) => {
  try {
    const bookingsWithTransactions = await prisma.booking.findMany({
      where: { transactions: { some: {} } },
      select: { id: true, title: true, courseName: true, date: true },
      orderBy: { date: 'desc' }
    });
    res.json(bookingsWithTransactions);
  } catch (error) {
    console.error('Error fetching bookings with transactions:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// 회원별 미수금 조회 — member.balance 기준 (전체 누적 미납액)
router.get("/outstanding", requireAuth, requireOperator, async (req, res) => {
  try {
    const members = await prisma.member.findMany({
      where: {
        balance: { lt: 0 },
        OR: [
          { isActive: true },
          { isGuest: true, approvalStatus: 'guest' },
        ],
      },
      select: { id: true, name: true, nickname: true, isGuest: true, balance: true },
    });

    const outstandingBalances = members
      .map((member) => ({
        memberId: member.id,
        memberName: member.name,
        memberNickname: member.nickname,
        isGuest: member.isGuest || false,
        balance: member.balance,
      }))
      .sort((a, b) => {
        if (a.isGuest !== b.isGuest) return a.isGuest ? 1 : -1; // 게스트는 뒤로
        return a.balance - b.balance;
      });

    res.json(outstandingBalances);
  } catch (error) {
    console.error("Error fetching outstanding balances:", error);
    res.status(500).json({ error: "Failed to fetch outstanding balances" });
  }
});

// 거래 생성
router.post("/", requireAuth, requireOperator, async (req, res) => {
  try {
    const { memberId, bookingId, type } = req.body;

    if (bookingId && memberId && type === "charge") {
      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          memberId,
          bookingId,
          type: { in: ["charge", "expense"] },
        },
      });

      if (existingTransaction) {
        return res.status(400).json({
          error: "이미 해당 라운딩에 대한 청구가 존재합니다.",
          existingTransactionId: existingTransaction.id
        });
      }
    }

    const transaction = await prisma.transaction.create({
      data: req.body,
      include: { member: true, booking: true },
    });

    if (transaction.memberId) {
      await recalculateAndUpdateBalance(transaction.memberId);
    }

    req.io.emit("transactions:updated");
    req.io.emit("members:updated");
    res.json(transaction);
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

// 청구 생성 (크레딧 자동 차감 포함)
router.post("/charge-with-credit", requireAuth, requireOperator, async (req, res) => {
  try {
    const { memberId, amount, description, date, bookingId, createdBy } = req.body;

    if (!memberId || !amount || amount <= 0) {
      return res.status(400).json({ error: "memberId and positive amount are required" });
    }

    if (bookingId) {
      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          memberId,
          bookingId,
          type: { in: ["charge", "expense"] },
        },
      });

      if (existingTransaction) {
        return res.status(400).json({
          error: "이미 해당 라운딩에 대한 청구가 존재합니다.",
          existingTransactionId: existingTransaction.id
        });
      }
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { balance: true },
    });

    const currentBalance = member?.balance || 0;
    const creditBalance = currentBalance > 0 ? currentBalance : 0;
    const creditToUse = Math.min(creditBalance, amount);
    const today = date || new Date().toISOString().split("T")[0];
    const transactions = [];
    const remainingCharge = amount - creditToUse;

    await prisma.$transaction(async (tx) => {
      if (creditToUse > 0) {
        const baseCategory = description.split(" - ")[0].replace("청구", "").trim() || "참가비";

        const expenseTx = await tx.transaction.create({
          data: {
            type: "expense",
            amount: creditToUse,
            description: `${baseCategory} (크레딧 자동 차감)`,
            category: "크레딧 자동 차감",
            date: today,
            memberId,
            bookingId: bookingId || null,
            createdBy: createdBy || null,
          },
        });
        transactions.push(expenseTx);

        const paymentTx = await tx.transaction.create({
          data: {
            type: "payment",
            amount: creditToUse,
            description: `${baseCategory} (크레딧 자동 차감)`,
            category: "크레딧 자동 차감",
            date: today,
            memberId,
            bookingId: bookingId || null,
            createdBy: createdBy || null,
          },
        });
        transactions.push(paymentTx);
      }

      if (remainingCharge > 0) {
        const chargeTx = await tx.transaction.create({
          data: {
            type: "charge",
            amount: remainingCharge,
            description,
            date: today,
            memberId,
            bookingId: bookingId || null,
            createdBy: createdBy || null,
          },
        });
        transactions.push(chargeTx);
      }
    });

    const newBalance = await recalculateAndUpdateBalance(memberId);

    req.io.emit("transactions:updated");
    req.io.emit("members:updated");
    res.json({ success: true, transactions, creditUsed: creditToUse, remainingCharge, newBalance });
  } catch (error) {
    console.error("Error creating charge with credit:", error);
    res.status(500).json({ error: "Failed to create charge with credit" });
  }
});

// 크레딧을 도네이션으로 전환
router.post("/credit-to-donation", requireAuth, async (req, res) => {
  try {
    const { memberId, amount, memo } = req.body;

    if (!memberId || !amount || amount <= 0) {
      return res.status(400).json({ error: "memberId and positive amount are required" });
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { balance: true },
    });

    const currentBalance = member?.balance || 0;
    if (currentBalance < amount) {
      return res.status(400).json({ error: "크레딧 잔액이 부족합니다" });
    }

    const today = new Date().toISOString().split("T")[0];
    let creditDonationTx, clubDonationTx;

    await prisma.$transaction(async (tx) => {
      creditDonationTx = await tx.transaction.create({
        data: {
          type: "creditDonation",
          amount,
          description: memo ? `도네이션 (크레딧): ${memo}` : "도네이션 (크레딧)",
          category: "크레딧 도네이션",
          date: today,
          memberId,
        },
      });

      clubDonationTx = await tx.transaction.create({
        data: {
          type: "donation",
          amount,
          description: memo ? `도네이션: ${memo}` : "도네이션",
          category: "도네이션",
          date: today,
          memberId,
        },
      });
    });

    const newBalance = await recalculateAndUpdateBalance(memberId);

    req.io.emit("transactions:updated");
    req.io.emit("members:updated");
    res.json({ success: true, creditDonationTx, clubDonationTx, newBalance });
  } catch (error) {
    console.error("Error converting credit to donation:", error);
    res.status(500).json({ error: "Failed to convert credit to donation" });
  }
});

// 크레딧으로 미수금 납부
router.post("/credit-to-payment", requireAuth, async (req, res) => {
  try {
    const { memberId, amount, chargeId, memo } = req.body;

    if (!memberId || !amount || amount <= 0) {
      return res.status(400).json({ error: "memberId and positive amount are required" });
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { balance: true },
    });

    const currentBalance = member?.balance || 0;
    if (currentBalance < amount) {
      return res.status(400).json({ error: "크레딧 잔액이 부족합니다" });
    }

    const today = new Date().toISOString().split("T")[0];
    let chargeInfo = null;

    if (chargeId) {
      chargeInfo = await prisma.transaction.findUnique({
        where: { id: chargeId },
        include: { booking: true },
      });
    }

    const bookingName = chargeInfo?.booking?.courseName || chargeInfo?.description || "미수금";
    const description = memo ? `크레딧 납부: ${memo}` : `크레딧으로 납부 (${bookingName})`;

    let expenseTx, paymentTx;
    await prisma.$transaction(async (tx) => {
      expenseTx = await tx.transaction.create({
        data: {
          type: "expense",
          amount,
          description,
          category: "크레딧 납부",
          date: today,
          memberId,
          bookingId: chargeInfo?.bookingId || null,
        },
      });

      paymentTx = await tx.transaction.create({
        data: {
          type: "payment",
          amount,
          description,
          category: "크레딧 납부",
          date: today,
          memberId,
          bookingId: chargeInfo?.bookingId || null,
        },
      });
    });

    const newBalance = await recalculateAndUpdateBalance(memberId);

    req.io.emit("transactions:updated");
    req.io.emit("members:updated");
    res.json({ success: true, expenseTx, paymentTx, newBalance });
  } catch (error) {
    console.error("Error converting credit to payment:", error);
    res.status(500).json({ error: "Failed to convert credit to payment" });
  }
});

// 거래 수정
router.put("/:id", requireAuth, requireOperator, async (req, res) => {
  try {
    const { amount, date, description, category, memo, bookingId, receiptImage, receiptImages } = req.body;

    const existingTransaction = await prisma.transaction.findUnique({
      where: { id: req.params.id },
    });

    if (!existingTransaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const updateData = {
      amount: amount !== undefined ? parseFloat(amount) : existingTransaction.amount,
      date: date || existingTransaction.date,
      description: description !== undefined ? description : existingTransaction.description,
    };

    if (category !== undefined) updateData.category = category || null;
    if (memo !== undefined) updateData.memo = memo || null;
    if (bookingId !== undefined) updateData.bookingId = bookingId || null;
    if (receiptImage !== undefined) updateData.receiptImage = receiptImage || null;
    if (receiptImages !== undefined) updateData.receiptImages = receiptImages || [];

    const updatedTransaction = await prisma.transaction.update({
      where: { id: req.params.id },
      data: updateData,
      include: { member: true, booking: true, executor: true },
    });

    if (updatedTransaction.memberId) {
      await recalculateAndUpdateBalance(updatedTransaction.memberId);
    }

    req.io.emit("transactions:updated");
    req.io.emit("members:updated");
    res.json(updatedTransaction);
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ error: "Failed to update transaction" });
  }
});

// 거래 삭제 (크레딧 도네이션 쌍 삭제 지원)
router.delete("/:id", requireAuth, requireOperator, async (req, res) => {
  try {
    const targetTx = await prisma.transaction.findUnique({
      where: { id: req.params.id },
    });

    if (!targetTx) {
      return res.json({ success: true, alreadyDeleted: true });
    }

    let siblingTx = null;
    const targetCreatedAt = new Date(targetTx.createdAt);
    const twoSecondsMs = 2000;

    if (targetTx.type === "donation" && targetTx.category === "도네이션" && targetTx.memberId) {
      const candidates = await prisma.transaction.findMany({
        where: { type: "creditDonation", memberId: targetTx.memberId, amount: targetTx.amount, date: targetTx.date },
      });
      siblingTx = candidates.find((c) => Math.abs(new Date(c.createdAt).getTime() - targetCreatedAt.getTime()) <= twoSecondsMs);
    } else if (targetTx.type === "creditDonation" && targetTx.memberId) {
      const candidates = await prisma.transaction.findMany({
        where: { type: "donation", category: "도네이션", memberId: targetTx.memberId, amount: targetTx.amount, date: targetTx.date },
      });
      siblingTx = candidates.find((c) => Math.abs(new Date(c.createdAt).getTime() - targetCreatedAt.getTime()) <= twoSecondsMs);
    }

    if (siblingTx) {
      await prisma.transaction.delete({ where: { id: siblingTx.id } });
      console.log(`🔗 Paired deletion: deleted sibling ${siblingTx.type} (${siblingTx.id})`);
    }

    await prisma.transaction.delete({ where: { id: req.params.id } });

    const memberIds = new Set();
    if (targetTx.memberId) memberIds.add(targetTx.memberId);
    if (siblingTx?.memberId) memberIds.add(siblingTx.memberId);
    for (const mid of memberIds) {
      await recalculateAndUpdateBalance(mid);
    }

    req.io.emit("transactions:updated");
    req.io.emit("members:updated");
    res.json({ success: true, pairedDeletion: !!siblingTx });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

// 청구 트랜잭션 삭제 (회원 ID + 라운딩 ID)
router.delete("/charge/:memberId/:bookingId", requireAuth, requireOperator, async (req, res) => {
  try {
    const { memberId, bookingId } = req.params;

    const transaction = await prisma.transaction.findFirst({
      where: { memberId, bookingId, type: "charge" },
    });

    if (!transaction) {
      return res.json({ success: true });
    }

    await prisma.transaction.delete({ where: { id: transaction.id } });
    await recalculateAndUpdateBalance(memberId);

    req.io.emit("transactions:updated");
    req.io.emit("members:updated");
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting charge transaction:", error);
    res.status(500).json({ error: "Failed to delete charge transaction" });
  }
});

// 입금항목 조회
router.get("/income-categories", requireAuth, async (req, res) => {
  try {
    const categories = await prisma.incomeCategory.findMany({ orderBy: { createdAt: "asc" } });
    res.json(categories);
  } catch (error) {
    console.error("Error fetching income categories:", error);
    res.status(500).json({ error: "Failed to fetch income categories" });
  }
});

// 입금항목 생성
router.post("/income-categories", requireAuth, requireOperator, async (req, res) => {
  try {
    const { name } = req.body;
    const category = await prisma.incomeCategory.create({ data: { name } });
    res.json(category);
  } catch (error) {
    console.error("Error creating income category:", error);
    res.status(500).json({ error: "Failed to create income category" });
  }
});

// 입금항목 삭제
router.delete("/income-categories/:id", requireAuth, requireOperator, async (req, res) => {
  try {
    await prisma.incomeCategory.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting income category:", error);
    res.status(500).json({ error: "Failed to delete income category" });
  }
});

// 출금항목 조회
router.get("/expense-categories", requireAuth, async (req, res) => {
  try {
    const categories = await prisma.expenseCategory.findMany({ orderBy: { createdAt: "asc" } });
    res.json(categories);
  } catch (error) {
    console.error("Error fetching expense categories:", error);
    res.status(500).json({ error: "Failed to fetch expense categories" });
  }
});

// 출금항목 생성
router.post("/expense-categories", requireAuth, requireOperator, async (req, res) => {
  try {
    const { name } = req.body;
    const category = await prisma.expenseCategory.create({ data: { name } });
    res.json(category);
  } catch (error) {
    console.error("Error creating expense category:", error);
    res.status(500).json({ error: "Failed to create expense category" });
  }
});

// 출금항목 삭제
router.delete("/expense-categories/:id", requireAuth, requireOperator, async (req, res) => {
  try {
    await prisma.expenseCategory.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense category:", error);
    res.status(500).json({ error: "Failed to delete expense category" });
  }
});

// 현금 납부 처리 — charge를 payment로 전환
router.post("/mark-paid", requireAuth, requireOperator, async (req, res) => {
  try {
    const { chargeId, memo } = req.body;

    if (!chargeId) {
      return res.status(400).json({ error: "chargeId is required" });
    }

    const charge = await prisma.transaction.findUnique({
      where: { id: chargeId },
      include: { booking: true },
    });

    if (!charge) {
      return res.status(404).json({ error: "Charge not found" });
    }
    if (charge.type !== "charge") {
      return res.status(400).json({ error: "Transaction is not a charge" });
    }

    // 자동청구 참가비는 charge 날짜 기준으로 수입 기록 (처리일 기준 X)
    const paymentDate = charge.date;
    const bookingLabel = charge.booking?.courseName
      ? `${charge.booking.courseName} 참가비`
      : charge.description || "참가비";
    const description = memo
      ? `${bookingLabel} (현금 납부: ${memo})`
      : `${bookingLabel} (현금 납부)`;

    let paymentTx;
    await prisma.$transaction(async (tx) => {
      paymentTx = await tx.transaction.create({
        data: {
          type: "payment",
          amount: charge.amount,
          description,
          category: "참가비",
          date: paymentDate,
          memberId: charge.memberId,
          bookingId: charge.bookingId || null,
          createdBy: req.member.id,
        },
      });
    });

    const newBalance = await recalculateAndUpdateBalance(charge.memberId);

    req.io.emit("transactions:updated");
    req.io.emit("members:updated");
    res.json({ success: true, paymentTx, newBalance });
  } catch (error) {
    console.error("Error marking charge as paid:", error);
    res.status(500).json({ error: "Failed to mark as paid" });
  }
});

module.exports = router;
