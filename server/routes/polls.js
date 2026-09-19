// server/routes/polls.js
// 정모 참석 투표 — 카카오톡 투표를 대체한다.
//
// 핵심: 투표 = 참가 신청. "참석" 선택지를 고르면 그 즉시 참가자 명단에 들어가고
// 참가비 청구가 발행된다. 그래서 회원은 바로 입금하고 영수증을 올릴 수 있고,
// 총무는 카톡 결과를 손으로 옮겨 적을 일이 없어진다.
//
// 참가/청구 로직은 새로 만들지 않고 utils/participation.js 를 그대로 호출한다.

const express = require('express');
const prisma = require('../db');
const { requireAuth, requireOperator } = require('../middleware/auth');
const {
  parseParticipant,
  issueRoundingChargeForMember,
  cancelParticipationForPoll,
  canQuietlyDropCharge,
} = require('../utils/participation');

const router = express.Router();

// ── 공통 헬퍼 ────────────────────────────────────────────────────────────────

const isPollClosed = (poll) => {
  if (poll.closedAt) return true;
  if (poll.closesAt && new Date() > new Date(poll.closesAt)) return true;
  return false;
};

// 저장된 options(Json)를 항상 같은 모양으로 꺼낸다
const readOptions = (poll) => {
  const raw = Array.isArray(poll.options) ? poll.options : [];
  return raw.map((o, i) => ({
    key: String(o.key || `opt${i + 1}`),
    label: String(o.label || ''),
    kind: o.kind === 'absent' ? 'absent' : 'attend',
    fee: (o.fee === null || o.fee === undefined || o.fee === '') ? null : Number(o.fee),
    sortOrder: Number.isFinite(o.sortOrder) ? o.sortOrder : i,
  })).sort((a, b) => a.sortOrder - b.sortOrder);
};

// 방장이 보낸 선택지를 검증·정규화. 불참은 항상 맨 아래 1개 보장.
const normalizeOptions = (input) => {
  const list = Array.isArray(input) ? input : [];
  const attend = [];
  let absent = null;

  list.forEach((o, i) => {
    const label = String(o?.label || '').trim();
    if (!label) return;
    const kind = o?.kind === 'absent' ? 'absent' : 'attend';
    const feeRaw = o?.fee;
    const fee = (feeRaw === null || feeRaw === undefined || feeRaw === '') ? null : Number(feeRaw);
    if (fee !== null && (!Number.isFinite(fee) || fee < 0)) return;

    if (kind === 'absent') {
      if (!absent) absent = { key: 'absent', label, kind: 'absent', fee: null, sortOrder: 999 };
      return;
    }
    attend.push({ key: o?.key ? String(o.key) : `attend${attend.length + 1}`, label, kind: 'attend', fee, sortOrder: i });
  });

  if (attend.length === 0) return null;
  if (!absent) absent = { key: 'absent', label: '불참', kind: 'absent', fee: null, sortOrder: 999 };

  // key 중복 방지
  const seen = new Set();
  attend.forEach((o, i) => {
    while (seen.has(o.key)) o.key = `${o.key}_${i}`;
    seen.add(o.key);
  });

  return [...attend.map((o, i) => ({ ...o, sortOrder: i })), absent];
};

// 화면에 뿌릴 모양으로 만든다.
//
// 참석 인원의 진실은 booking.participants 다. 투표 기록만 세면 방장이 명단을
// 직접 손봤을 때 숫자가 어긋난다. 그래서 참석 선택지는 "그 선택지에 투표했고
// 지금도 명단에 있는 사람"만 센다.
async function buildPollView(poll, viewerId) {
  const booking = poll.booking;
  const options = readOptions(poll);

  const participants = (booking?.participants || []).map(parseParticipant).filter(Boolean);
  const participantPhones = new Set(participants.map(p => p?.phone).filter(Boolean));

  const voterIds = poll.votes.map(v => v.memberId);
  const voterMembers = voterIds.length
    ? await prisma.member.findMany({
        where: { id: { in: voterIds } },
        select: { id: true, name: true, nickname: true, phone: true, photo: true },
      })
    : [];
  const byId = new Map(voterMembers.map(m => [m.id, m]));

  const optionViews = options.map(o => {
    const voters = poll.votes
      .filter(v => v.optionKey === o.key)
      .map(v => byId.get(v.memberId))
      .filter(Boolean)
      // 참석 선택지는 실제 명단에 남아 있는 사람만 집계
      .filter(m => (o.kind === 'attend' ? participantPhones.has(m.phone) : true))
      .map(m => ({ id: m.id, name: m.name, nickname: m.nickname, photo: m.photo || null }));

    return { ...o, count: voters.length, voters };
  });

  // 아직 투표하지 않은 회원 (총무가 독촉할 대상)
  const votedIds = new Set(poll.votes.map(v => v.memberId));
  const allMembers = await prisma.member.findMany({
    where: { isActive: true, isGuest: false, approvalStatus: 'approved' },
    select: { id: true, name: true, nickname: true, phone: true },
    orderBy: { name: 'asc' },
  });
  const notVoted = allMembers.filter(m => !votedIds.has(m.id))
    .map(m => ({ id: m.id, name: m.name, nickname: m.nickname }));

  // 투표 없이 방장이 직접 넣은 참가자 (숫자가 왜 다른지 설명하기 위함)
  const votedAttendPhones = new Set(
    optionViews.filter(o => o.kind === 'attend').flatMap(o => o.voters.map(v => {
      const m = byId.get(v.id);
      return m?.phone;
    })).filter(Boolean)
  );
  const addedByHost = participants.filter(p => p?.phone && !votedAttendPhones.has(p.phone)).length;

  const myVote = viewerId ? (poll.votes.find(v => v.memberId === viewerId)?.optionKey || null) : null;

  return {
    id: poll.id,
    bookingId: poll.bookingId,
    title: poll.title,
    closesAt: poll.closesAt,
    closedAt: poll.closedAt,
    isClosed: isPollClosed(poll),
    createdAt: poll.createdAt,
    booking: booking ? {
      id: booking.id,
      title: booking.title,
      courseName: booking.courseName,
      date: booking.date,
      time: booking.time,
      type: booking.type,
      maxMembers: booking.maxMembers,
    } : null,
    options: optionViews,
    totalVoted: poll.votes.length,
    participantCount: participants.length,
    addedByHost,
    notVoted,
    myVote,
  };
}

const POLL_INCLUDE = { booking: true, votes: true };

// ── 조회 ─────────────────────────────────────────────────────────────────────

// 홈 화면 상단에 띄울 "지금 열려 있는 투표" 1건
router.get('/active', requireAuth, async (req, res) => {
  try {
    const polls = await prisma.attendancePoll.findMany({
      where: { closedAt: null },
      include: POLL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    const open = polls.filter(p => !isPollClosed(p));
    if (open.length === 0) return res.json(null);

    // 라운딩 날짜가 가장 가까운 것
    open.sort((a, b) => String(a.booking?.date || '').localeCompare(String(b.booking?.date || '')));
    res.json(await buildPollView(open[0], req.member.id));
  } catch (error) {
    console.error('Error fetching active poll:', error);
    res.status(500).json({ error: 'Failed to fetch active poll' });
  }
});

// 특정 라운딩의 투표
router.get('/booking/:bookingId', requireAuth, async (req, res) => {
  try {
    const poll = await prisma.attendancePoll.findUnique({
      where: { bookingId: req.params.bookingId },
      include: POLL_INCLUDE,
    });
    if (!poll) return res.json(null);
    res.json(await buildPollView(poll, req.member.id));
  } catch (error) {
    console.error('Error fetching poll by booking:', error);
    res.status(500).json({ error: 'Failed to fetch poll' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const poll = await prisma.attendancePoll.findUnique({
      where: { id: req.params.id },
      include: POLL_INCLUDE,
    });
    if (!poll) return res.status(404).json({ error: '투표를 찾을 수 없습니다.' });
    res.json(await buildPollView(poll, req.member.id));
  } catch (error) {
    console.error('Error fetching poll:', error);
    res.status(500).json({ error: 'Failed to fetch poll' });
  }
});

// ── 생성 · 수정 · 종료 · 삭제 (운영진) ──────────────────────────────────────

router.post('/', requireAuth, requireOperator, async (req, res) => {
  try {
    const { bookingId, title, options, closesAt } = req.body;

    if (!bookingId) return res.status(400).json({ error: '라운딩을 선택해주세요.' });
    if (!title || !String(title).trim()) return res.status(400).json({ error: '투표 제목을 입력해주세요.' });

    const normalized = normalizeOptions(options);
    if (!normalized) return res.status(400).json({ error: '참석 선택지를 1개 이상 입력해주세요.' });

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: '라운딩을 찾을 수 없습니다.' });

    const existing = await prisma.attendancePoll.findUnique({ where: { bookingId } });
    if (existing) return res.status(400).json({ error: '이 라운딩에는 이미 투표가 있습니다.' });

    const poll = await prisma.attendancePoll.create({
      data: {
        bookingId,
        title: String(title).trim(),
        options: normalized,
        closesAt: closesAt ? new Date(closesAt) : null,
        createdBy: req.member.id,
      },
      include: POLL_INCLUDE,
    });

    // 투표 마감 = 참가 신청 마감. 두 개가 따로 놀면 반드시 어긋난다.
    if (closesAt) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { registrationDeadline: new Date(closesAt).toISOString() },
      });
    }

    req.io.emit('polls:updated');
    req.io.emit('bookings:updated');
    res.json(await buildPollView(poll, req.member.id));
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

router.put('/:id', requireAuth, requireOperator, async (req, res) => {
  try {
    const { title, options, closesAt } = req.body;
    const poll = await prisma.attendancePoll.findUnique({ where: { id: req.params.id } });
    if (!poll) return res.status(404).json({ error: '투표를 찾을 수 없습니다.' });

    const data = {};
    if (title !== undefined) {
      if (!String(title).trim()) return res.status(400).json({ error: '투표 제목을 입력해주세요.' });
      data.title = String(title).trim();
    }
    if (options !== undefined) {
      const normalized = normalizeOptions(options);
      if (!normalized) return res.status(400).json({ error: '참석 선택지를 1개 이상 입력해주세요.' });
      data.options = normalized;
    }
    if (closesAt !== undefined) {
      data.closesAt = closesAt ? new Date(closesAt) : null;
      await prisma.booking.update({
        where: { id: poll.bookingId },
        data: { registrationDeadline: closesAt ? new Date(closesAt).toISOString() : null },
      });
    }

    const updated = await prisma.attendancePoll.update({
      where: { id: req.params.id },
      data,
      include: POLL_INCLUDE,
    });

    req.io.emit('polls:updated');
    req.io.emit('bookings:updated');
    res.json(await buildPollView(updated, req.member.id));
  } catch (error) {
    console.error('Error updating poll:', error);
    res.status(500).json({ error: 'Failed to update poll' });
  }
});

router.post('/:id/close', requireAuth, requireOperator, async (req, res) => {
  try {
    const poll = await prisma.attendancePoll.findUnique({ where: { id: req.params.id } });
    if (!poll) return res.status(404).json({ error: '투표를 찾을 수 없습니다.' });
    if (poll.closedAt) return res.status(400).json({ error: '이미 종료된 투표입니다.' });

    const updated = await prisma.attendancePoll.update({
      where: { id: req.params.id },
      data: { closedAt: new Date() },
      include: POLL_INCLUDE,
    });

    req.io.emit('polls:updated');
    res.json(await buildPollView(updated, req.member.id));
  } catch (error) {
    console.error('Error closing poll:', error);
    res.status(500).json({ error: 'Failed to close poll' });
  }
});

router.post('/:id/reopen', requireAuth, requireOperator, async (req, res) => {
  try {
    const poll = await prisma.attendancePoll.findUnique({ where: { id: req.params.id } });
    if (!poll) return res.status(404).json({ error: '투표를 찾을 수 없습니다.' });

    const updated = await prisma.attendancePoll.update({
      where: { id: req.params.id },
      data: { closedAt: null },
      include: POLL_INCLUDE,
    });

    req.io.emit('polls:updated');
    res.json(await buildPollView(updated, req.member.id));
  } catch (error) {
    console.error('Error reopening poll:', error);
    res.status(500).json({ error: 'Failed to reopen poll' });
  }
});

// 투표만 지운다. 이미 발행된 청구와 참가자 명단은 건드리지 않는다.
router.delete('/:id', requireAuth, requireOperator, async (req, res) => {
  try {
    await prisma.attendancePoll.delete({ where: { id: req.params.id } });
    req.io.emit('polls:updated');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting poll:', error);
    res.status(500).json({ error: 'Failed to delete poll' });
  }
});

// ── 투표하기 ────────────────────────────────────────────────────────────────

router.post('/:id/vote', requireAuth, async (req, res) => {
  try {
    const { optionKey } = req.body;

    const poll = await prisma.attendancePoll.findUnique({
      where: { id: req.params.id },
      include: { booking: true },
    });
    if (!poll) return res.status(404).json({ error: '투표를 찾을 수 없습니다.' });
    if (isPollClosed(poll)) return res.status(400).json({ error: '투표가 종료되었습니다.' });

    const options = readOptions(poll);
    const option = options.find(o => o.key === optionKey);
    if (!option) return res.status(400).json({ error: '선택지를 골라주세요.' });

    const member = await prisma.member.findUnique({ where: { id: req.member.id } });
    if (!member) return res.status(404).json({ error: '회원을 찾을 수 없습니다.' });
    if (member.isGuest) return res.status(403).json({ error: '게스트는 투표할 수 없습니다.' });

    const booking = poll.booking;
    const participants = (booking.participants || []).map(parseParticipant).filter(Boolean);
    const joined = participants.some(p => p?.phone === member.phone);

    const previous = await prisma.attendanceVote.findUnique({
      where: { pollId_memberId: { pollId: poll.id, memberId: member.id } },
    });
    const previousOption = previous ? options.find(o => o.key === previous.optionKey) : null;

    let updatedParticipants = participants;

    if (option.kind === 'attend') {
      const feeChanged = joined && previousOption && previousOption.kind === 'attend'
        && (previousOption.fee ?? null) !== (option.fee ?? null);

      if (!joined) {
        // 정원 확인 (컴페티션은 인원 무제한)
        if (booking.type !== '컴페티션') {
          const max = booking.maxMembers || 4;
          if (participants.length >= max) {
            return res.status(400).json({ error: '정원이 마감되었습니다. 방장에게 문의해주세요.' });
          }
        }
        updatedParticipants = [
          ...participants,
          { name: member.name, nickname: member.nickname, phone: member.phone },
        ];
      }

      if (feeChanged) {
        // 같은 참석이지만 금액이 다른 선택지로 바꾼 경우 (예: 컴피티션 → 소셜).
        // 아직 한 푼도 안 냈을 때만 청구를 새로 발행한다.
        const { ok } = await canQuietlyDropCharge(booking, member);
        if (!ok) {
          return res.status(400).json({
            error: '이미 참가비가 오간 상태라 선택을 바꿀 수 없습니다. 총무에게 문의해주세요.',
          });
        }
        await prisma.transaction.deleteMany({
          where: { memberId: member.id, bookingId: booking.id, type: 'charge' },
        });
      }

      const existingCharge = await prisma.transaction.findFirst({
        where: { memberId: member.id, bookingId: booking.id, type: { in: ['charge', 'expense'] } },
      });
      if (!existingCharge) {
        await issueRoundingChargeForMember(member, booking, {
          feeOverride: option.fee,
          optionLabel: option.fee !== null ? option.label : null,
        });
      }

      // 취소했다가 다시 참석 — 총무가 아직 손대지 않은 정산 대기는 없애준다
      await prisma.roundCancellation.deleteMany({
        where: { bookingId: booking.id, memberId: member.id, status: 'pending' },
      });
    } else {
      // 불참
      if (joined) {
        updatedParticipants = participants.filter(p => p?.phone !== member.phone);
        await cancelParticipationForPoll(booking, member, member.id);
      }
    }

    if (updatedParticipants !== participants) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { participants: updatedParticipants.map(p => JSON.stringify(p)) },
      });
    }

    await prisma.attendanceVote.upsert({
      where: { pollId_memberId: { pollId: poll.id, memberId: member.id } },
      create: { pollId: poll.id, memberId: member.id, optionKey: option.key },
      update: { optionKey: option.key },
    });

    const fresh = await prisma.attendancePoll.findUnique({
      where: { id: poll.id },
      include: POLL_INCLUDE,
    });

    req.io.emit('polls:updated');
    req.io.emit('bookings:updated');
    req.io.emit('transactions:updated');
    req.io.emit('members:updated');
    res.json(await buildPollView(fresh, member.id));
  } catch (error) {
    console.error('Error voting:', error);
    res.status(500).json({ error: '투표 처리에 실패했습니다.' });
  }
});

module.exports = router;
