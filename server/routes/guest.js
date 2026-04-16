const express = require('express');
const prisma = require('../db');
const { requireAuth, requireOperator } = require('../middleware/auth');
const { recalculateAndUpdateBalance } = require('../utils/balance');
const crypto = require('crypto');

const router = express.Router();

// ── 초대링크 생성 (운영진) ────────────────────────────────────────────────────
router.post('/bookings/:bookingId/invite', requireAuth, requireOperator, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const token = crypto.randomBytes(16).toString('hex'); // 32자 hex 토큰

    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: { inviteToken: token },
    });

    const inviteUrl = `${req.protocol}://${req.get('host')}/invite/${token}`;
    res.json({ token, inviteUrl });
  } catch (error) {
    console.error('Error generating invite token:', error);
    res.status(500).json({ error: 'Failed to generate invite link' });
  }
});

// ── 초대링크 삭제 (운영진) ────────────────────────────────────────────────────
router.delete('/bookings/:bookingId/invite', requireAuth, requireOperator, async (req, res) => {
  try {
    const { bookingId } = req.params;
    await prisma.booking.update({
      where: { id: bookingId },
      data: { inviteToken: null },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting invite token:', error);
    res.status(500).json({ error: 'Failed to delete invite link' });
  }
});

// ── 초대링크 정보 조회 (인증 불필요) ─────────────────────────────────────────
router.get('/invite/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const booking = await prisma.booking.findFirst({
      where: { inviteToken: token },
      select: {
        id: true,
        title: true,
        courseName: true,
        date: true,
        time: true,
        type: true,
        playEnabled: true,
        playManuallyDisabled: true,
        participants: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: '유효하지 않거나 만료된 초대링크입니다.' });
    }

    // participants 에서 사전 등록된 게스트 추출 (isGuest:true + phone이 guest_ 로 시작)
    const participants = (booking.participants || []).map(p => {
      try { return typeof p === 'string' ? JSON.parse(p) : p; } catch { return null; }
    }).filter(Boolean);

    const preAddedGuests = participants
      .filter(p => p.isGuest === true)
      .map(p => ({ name: p.name, handicap: p.handicap != null ? parseFloat(p.handicap) : 36 }));

    console.log('[invite] participants:', participants.length, '/ preAddedGuests:', JSON.stringify(preAddedGuests));

    const { participants: _, ...bookingData } = booking;
    res.json({ booking: { ...bookingData, preAddedGuests } });
  } catch (error) {
    console.error('Error fetching invite info:', error);
    res.status(500).json({ error: 'Failed to fetch invite info' });
  }
});

// ── 게스트 등록 (인증 불필요) ─────────────────────────────────────────────────
router.post('/invite/:token/register', async (req, res) => {
  try {
    const { token } = req.params;
    const { guestName, handicap } = req.body;

    if (!guestName || !guestName.trim()) {
      return res.status(400).json({ error: '이름을 입력해주세요.' });
    }

    const booking = await prisma.booking.findFirst({
      where: { inviteToken: token },
    });

    if (!booking) {
      return res.status(404).json({ error: '유효하지 않거나 만료된 초대링크입니다.' });
    }

    // 이미 같은 이름의 게스트가 이 라운딩에 Member로 등록되어 있는지 확인
    const existingGuest = await prisma.member.findFirst({
      where: {
        isGuest: true,
        name: guestName.trim(),
        bookings: { some: { id: booking.id } },
      },
    });

    if (existingGuest) {
      // 이미 등록된 게스트 → 기존 정보 반환 (재접속 허용)
      return res.json({
        guestMemberId: existingGuest.id,
        bookingId: booking.id,
        guestName: existingGuest.name,
        alreadyRegistered: true,
      });
    }

    // participants 에서 사전 등록된 게스트 핸디캡 가져오기 (조직자가 미리 입력한 값 우선)
    const currentParticipants = booking.participants || [];
    const parsedParticipants = currentParticipants.map(p => {
      try { return typeof p === 'string' ? JSON.parse(p) : p; } catch { return null; }
    }).filter(Boolean);

    const preAdded = parsedParticipants.find(
      p => p.isGuest === true && p.name === guestName.trim()
    );
    const parsedHandicap = parseFloat(handicap) || (preAdded ? parseFloat(preAdded.handicap) : 36) || 36;

    const phone = `guest_${crypto.randomBytes(8).toString('hex')}`;

    const guest = await prisma.member.create({
      data: {
        name: guestName.trim(),
        nickname: guestName.trim(),
        phone,
        isGuest: true,
        isActive: false,
        approvalStatus: 'guest',
        role: '게스트',
        handicap: String(parsedHandicap),
        gaHandy: String(parsedHandicap),
      },
    });

    // 사전 등록된 중복 participant 제거 후 정식 participant 추가
    const filteredParticipants = parsedParticipants.filter(
      p => !(p.isGuest === true && p.name === guestName.trim())
    );
    const oldGuestPhone = preAdded?.phone || null; // 직접추가 시 guest_timestamp phone

    const newParticipant = JSON.stringify({
      id: guest.id,         // Member ID (스코어 저장용)
      name: guest.name,
      nickname: guest.name,
      phone: guest.phone,
      isGuest: true,
      handicap: String(parsedHandicap),
      gaHandy: String(parsedHandicap),
    });

    // 조편성에 구 phone이 있으면 새 phone + id로 교체
    let updatedTeams = booking.teams;
    if (oldGuestPhone && booking.teams) {
      try {
        const teamsArr = typeof booking.teams === 'string' ? JSON.parse(booking.teams) : booking.teams;
        let changed = false;
        const replaced = teamsArr.map(team => ({
          ...team,
          members: (team.members || []).map(m => {
            if (m && m.phone === oldGuestPhone) {
              changed = true;
              return { ...m, phone: guest.phone, id: guest.id };
            }
            return m;
          }),
        }));
        if (changed) updatedTeams = JSON.stringify(replaced);
      } catch (e) {
        console.error('teams phone 업데이트 실패:', e);
      }
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        participants: [...filteredParticipants.map(p => JSON.stringify(p)), newParticipant],
        ...(updatedTeams !== booking.teams ? { teams: updatedTeams } : {}),
      },
    });

    // 참가비 자동청구 (greenFee + cartFee, 멤버십피 제외)
    const feeAmount = (booking.greenFee || 0) + (booking.cartFee || 0);
    if (feeAmount > 0) {
      const today = new Date().toISOString().split('T')[0];
      await prisma.transaction.create({
        data: {
          type: 'charge',
          amount: feeAmount,
          description: `${booking.title || booking.courseName} 라운딩 (게스트)`,
          category: '게스트 참가비',
          date: today,
          memberId: guest.id,
          bookingId: booking.id,
        },
      });
      await recalculateAndUpdateBalance(guest.id);
    }

    res.json({
      guestMemberId: guest.id,
      bookingId: booking.id,
      guestName: guest.name,
      phone: guest.phone,
      handicap: parsedHandicap,
      feeCharged: feeAmount,
    });
  } catch (error) {
    console.error('Error registering guest:', error);
    res.status(500).json({ error: 'Failed to register guest' });
  }
});

module.exports = router;
