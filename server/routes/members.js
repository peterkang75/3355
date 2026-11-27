const express = require("express");
const prisma = require("../db");
const { requireAuth, requireOperator, requireAdmin } = require('../middleware/auth');
const { recalculateAndUpdateBalance } = require('../utils/balance');

const router = express.Router();

// GET /members, POST /members — 공개 (로그인 화면에서 필요)

router.get("/", async (req, res) => {
  try {
    const includePhoto = req.query.includePhoto === 'true';
    const includeInactive = req.query.includeInactive === 'true';
    const members = await prisma.member.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
        nickname: true,
        gender: true,
        birthYear: true,
        region: true,
        isClubMember: true,
        club: true,
        handicap: true,
        gaHandy: true,
        houseHandy: true,
        golflinkNumber: true,
        gaRegisteredName: true,
        clubMemberNumber: true,
        isAdmin: true,
        role: true,
        balance: true,
        photo: includePhoto,
        isActive: true,
        approvalStatus: true,
        canManageFees: true,
        isFeeExempt: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true
      }
    });
    res.json(members);
  } catch (error) {
    console.error("Error fetching members:", error);
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
    });
    if (!member) return res.status(404).json({ error: "Member not found" });
    res.json(member);
  } catch (error) {
    console.error("Error fetching member:", error);
    res.status(500).json({ error: "Failed to fetch member" });
  }
});

router.post("/", async (req, res) => {
  try {
    const existingMember = await prisma.member.findFirst({
      where: { phone: req.body.phone },
    });

    if (existingMember) {
      return res.status(409).json({
        error: "DUPLICATE_PHONE",
        message: `이미 회원가입이 되어있습니다. [${existingMember.nickname || existingMember.name}]`,
        nickname: existingMember.nickname || existingMember.name,
      });
    }

    const approvalSetting = await prisma.appSettings.findUnique({
      where: { feature: "memberApprovalRequired" },
    });

    const requiresApproval = approvalSetting?.enabled || false;

    const member = await prisma.member.create({
      data: {
        ...req.body,
        approvalStatus: requiresApproval ? "pending" : "approved",
      },
    });
    req.io.emit("members:updated");
    res.json(member);
  } catch (error) {
    console.error("Error creating member:", error);
    res.status(500).json({ error: "Failed to create member" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  // 자기 자신은 수정 가능, 타인 수정은 운영진 이상만 가능
  const isSelf = req.member.id === req.params.id;
  const { isOperator } = require('../utils/roles');
  if (!isSelf && !isOperator(req.member)) {
    return res.status(403).json({ error: '운영진 이상 권한이 필요합니다.' });
  }

  try {
    // 일반 회원이 자신의 정보를 수정할 때는 허용된 필드만 수정 가능
    let data = req.body;
    if (isSelf && !isOperator(req.member)) {
      const { name, nickname, phone, club, gaHandy, houseHandy, handicap,
              golflinkNumber, gaRegisteredName, clubMemberNumber, photo, gender, birthYear,
              region, isClubMember } = req.body;
      data = { name, nickname, phone, club, gaHandy, houseHandy, handicap,
               golflinkNumber, gaRegisteredName, clubMemberNumber, photo, gender, birthYear,
               region, isClubMember };
      // undefined 필드 제거
      Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
    }

    const member = await prisma.member.update({
      where: { id: req.params.id },
      data,
    });
    req.io.emit("members:updated");
    res.json(member);
  } catch (error) {
    console.error("Error updating member:", error);
    res.status(500).json({ error: "Failed to update member" });
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    req.io.emit("members:updated");
    res.json({ success: true, member });
  } catch (error) {
    console.error("Error deactivating member:", error);
    res.status(500).json({ error: "Failed to deactivate member" });
  }
});

router.patch("/:id/toggle-admin", requireAuth, requireAdmin, async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
    });

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const updated = await prisma.member.update({
      where: { id: req.params.id },
      data: { isAdmin: !member.isAdmin },
    });

    req.io.emit("members:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error toggling admin status:", error);
    res.status(500).json({ error: "Failed to toggle admin status" });
  }
});

router.patch("/:id/toggle-active", requireAuth, requireOperator, async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
    });

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const updated = await prisma.member.update({
      where: { id: req.params.id },
      data: { isActive: member.isActive === false ? true : false },
    });

    req.io.emit("members:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error toggling active status:", error);
    res.status(500).json({ error: "Failed to toggle active status" });
  }
});

router.patch("/:id/toggle-fees-permission", requireAuth, requireOperator, async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
    });

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const updated = await prisma.member.update({
      where: { id: req.params.id },
      data: { canManageFees: !member.canManageFees },
    });

    req.io.emit("members:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error toggling fees permission:", error);
    res.status(500).json({ error: "Failed to toggle fees permission" });
  }
});

router.patch("/:id/role", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;

    if (!["관리자", "방장", "운영진", "클럽운영진", "회원"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const updated = await prisma.member.update({
      where: { id: req.params.id },
      data: {
        role,
        isAdmin: role === "관리자",
      },
    });

    req.io.emit("members:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error updating member role:", error);
    res.status(500).json({ error: "Failed to update member role" });
  }
});

router.patch("/:id/approve", requireAuth, requireOperator, async (req, res) => {
  try {
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: { approvalStatus: "approved" },
    });
    req.io.emit("members:updated");
    res.json(member);
  } catch (error) {
    console.error("Error approving member:", error);
    res.status(500).json({ error: "Failed to approve member" });
  }
});

router.patch("/:id/reject", requireAuth, requireOperator, async (req, res) => {
  try {
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: { approvalStatus: "rejected" },
    });
    req.io.emit("members:updated");
    res.json(member);
  } catch (error) {
    console.error("Error rejecting member:", error);
    res.status(500).json({ error: "Failed to reject member" });
  }
});

// 게스트 멤버 완전 삭제 (트랜잭션 포함)
router.delete("/:id/guest", requireAuth, requireOperator, async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
      select: { id: true, isGuest: true, approvalStatus: true },
    });

    if (!member) return res.status(404).json({ error: '회원을 찾을 수 없습니다.' });
    if (!member.isGuest) return res.status(400).json({ error: '게스트 회원만 삭제할 수 있습니다.' });

    // 트랜잭션 먼저 삭제, 그 다음 멤버 삭제
    await prisma.transaction.deleteMany({ where: { memberId: req.params.id } });
    await prisma.member.delete({ where: { id: req.params.id } });

    req.io.emit('members:updated');
    req.io.emit('transactions:updated');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting guest member:', error);
    res.status(500).json({ error: 'Failed to delete guest member' });
  }
});

// 게스트 → 기존 회원 전환: 게스트 기록(청구·스코어·명단 등)을 회원에게 옮기고 게스트 기록은 삭제
// body: { memberId, extraCharge? } — extraCharge(예: 연회비)는 운영자가 넣었을 때만 청구
router.post("/:id/convert-to-member", requireAuth, requireOperator, async (req, res) => {
  try {
    const { memberId } = req.body;
    const extra = Number(req.body.extraCharge) || 0;
    if (extra < 0) return res.status(400).json({ error: '추가 청구 금액이 올바르지 않습니다.' });

    const [guest, target] = await Promise.all([
      prisma.member.findUnique({ where: { id: req.params.id } }),
      memberId ? prisma.member.findUnique({ where: { id: memberId } }) : null,
    ]);
    if (!guest || !guest.isGuest) return res.status(400).json({ error: '게스트만 전환할 수 있습니다.' });
    if (!target || target.isGuest) return res.status(400).json({ error: '전환할 회원을 찾을 수 없습니다.' });

    const g = guest.id, t = target.id;

    // 안전장치 1: 같은 라운딩에 회원 청구가 이미 있으면 옮기면 이중 청구가 된다
    const guestTxs = await prisma.transaction.findMany({ where: { memberId: g }, select: { id: true, bookingId: true, date: true, description: true, category: true } });
    const bookingIds = [...new Set(guestTxs.map(x => x.bookingId).filter(Boolean))];
    if (bookingIds.length) {
      const dup = await prisma.transaction.findFirst({ where: { memberId: t, type: 'charge', bookingId: { in: bookingIds } } });
      if (dup) return res.status(400).json({ error: '이 회원에게 같은 라운딩 청구가 이미 있습니다. 중복 청구를 먼저 정리해 주세요.' });
    }
    // 안전장치 2: 마감된 달의 거래를 옮기면 마감 정산서의 회원/게스트 구분이 바뀐다
    const months = [...new Set(guestTxs.map(x => (x.date || '').slice(0, 7)).filter(Boolean))];
    if (months.length) {
      const closed = await prisma.monthlySettlement.findFirst({ where: { yearMonth: { in: months }, isClosed: true } });
      if (closed) return res.status(400).json({ error: `${closed.yearMonth} 정산이 마감되어 전환할 수 없습니다.` });
    }

    const asParticipant = { name: target.name, nickname: target.nickname, phone: target.phone };
    const isGuestEntry = (p) => p && (p.id === g || p.phone === guest.phone);
    const isTargetEntry = (p) => p && (p.phone === target.phone || p.memberId === t || p.id === t);

    // 명단(participants)·조편성(teams)에 게스트 phone이 들어 있는 라운딩
    const bookings = await prisma.booking.findMany({ select: { id: true, participants: true, teams: true } });
    const bookingUpdates = [];
    for (const b of bookings) {
      const raw = b.participants || [];
      const parsed = raw.map(s => { try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return null; } });
      const inParticipants = parsed.some(isGuestEntry);
      const teamsRaw = typeof b.teams === 'string' ? b.teams : (b.teams ? JSON.stringify(b.teams) : null);
      const inTeams = teamsRaw?.includes(guest.phone);
      if (!inParticipants && !inTeams) continue;

      const data = {};
      if (inParticipants) {
        // 회원이 이미 명단에 있으면 게스트 줄만 빼고, 없으면 게스트 줄을 회원으로 바꾼다
        const alreadyIn = parsed.some(isTargetEntry);
        data.participants = raw
          .map((s, i) => (isGuestEntry(parsed[i]) ? (alreadyIn ? null : JSON.stringify(asParticipant)) : s))
          .filter(Boolean);
      }
      if (inTeams) {
        try {
          const arr = JSON.parse(teamsRaw).map(team => ({
            ...team,
            members: (team.members || []).map(m => isGuestEntry(m) ? { ...asParticipant } : m),
          }));
          data.teams = typeof b.teams === 'string' ? JSON.stringify(arr) : arr;
        } catch { /* 조편성 형식이 깨져 있으면 손대지 않는다 */ }
      }
      bookingUpdates.push(prisma.booking.update({ where: { id: b.id }, data }));
    }

    // 회원이 이미 누른 반응과 겹치는 게스트 반응은 지운다 (같은 대상에 하트 두 개 불가)
    const targetReactions = await prisma.reaction.findMany({ where: { memberId: t }, select: { targetType: true, targetId: true, type: true } });
    const dupKeys = new Set(targetReactions.map(r => `${r.targetType}|${r.targetId}|${r.type}`));
    const guestReactions = await prisma.reaction.findMany({ where: { memberId: g } });
    const dupReactionIds = guestReactions.filter(r => dupKeys.has(`${r.targetType}|${r.targetId}|${r.type}`)).map(r => r.id);

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
    // shortcut: 스코어 gameMetadata 안에 적힌 게스트 phone은 바꾸지 않는다 — 이미 경기한 게스트를 전환하는 일이 생기면 보강
    await prisma.$transaction([
      ...bookingUpdates,
      // 회원 청구와 같은 모양으로: 설명의 "(게스트)" 빼고, 게스트 전용 분류는 회원 분류로
      ...guestTxs.map(x => prisma.transaction.update({
        where: { id: x.id },
        data: {
          memberId: t,
          description: x.description?.replace(/\s*\(게스트\)\s*$/, ''),
          category: x.category === '게스트 참가비' ? null : x.category === '게스트 참가비납부' ? '회비납부' : x.category,
        },
      })),
      prisma.transaction.updateMany({ where: { createdBy: g }, data: { createdBy: t } }),
      prisma.score.updateMany({ where: { userId: g }, data: { userId: t } }),
      prisma.score.updateMany({ where: { markerId: g }, data: { markerId: t } }),
      prisma.ntpRecord.updateMany({ where: { memberId: g }, data: { memberId: t, memberName: target.nickname || target.name } }),
      prisma.winnerPrediction.updateMany({ where: { predictedWinnerId: g }, data: { predictedWinnerId: t } }),
      prisma.feedPost.updateMany({ where: { authorId: g }, data: { authorId: t } }),
      prisma.comment.updateMany({ where: { authorId: g }, data: { authorId: t } }),
      prisma.reaction.deleteMany({ where: { id: { in: dupReactionIds } } }),
      prisma.reaction.updateMany({ where: { memberId: g }, data: { memberId: t } }),
      prisma.roundingMedia.updateMany({ where: { uploaderPhone: guest.phone }, data: { uploaderPhone: target.phone, uploaderName: target.nickname || target.name } }),
      prisma.activityLog.updateMany({ where: { memberId: g }, data: { memberId: t } }),
      prisma.member.update({ where: { id: t }, data: { isActive: true } }),
      ...(extra > 0 ? [prisma.transaction.create({
        data: { type: 'charge', amount: extra, description: '연회비', date: today, memberId: t, createdBy: req.member.id },
      })] : []),
      prisma.member.delete({ where: { id: g } }), // 남은 것(투표·예측 투표 등)은 함께 삭제됨
    ]);
    await recalculateAndUpdateBalance(t);

    req.io.emit('members:updated');
    req.io.emit('bookings:updated');
    req.io.emit('transactions:updated');
    res.json({ success: true, memberId: t, movedBookings: bookingUpdates.length });
  } catch (error) {
    console.error('Error converting guest to member:', error);
    res.status(500).json({ error: '회원 전환에 실패했습니다.' });
  }
});

module.exports = router;
