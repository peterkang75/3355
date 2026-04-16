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

    // participants 파싱 (중복 체크 + 사전 등록 핸디캡용)
    const currentParticipants = booking.participants || [];
    const parsedParticipants = currentParticipants.map(p => {
      try { return typeof p === 'string' ? JSON.parse(p) : p; } catch { return null; }
    }).filter(Boolean);

    // ── 중복 등록 방지: participants에서 같은 이름의 게스트 확인 ──────────────
    // (Member.bookings 는 주최자 관계라 사용 불가 — participants 배열로 직접 체크)
    const existingParticipant = parsedParticipants.find(
      p => p.isGuest === true && p.name === guestName.trim()
    );

    if (existingParticipant) {
      // participants에 이미 있음 → 기존 Member 찾아서 재접속 허용
      const existingMember = existingParticipant.id
        ? await prisma.member.findUnique({ where: { id: existingParticipant.id } })
        : existingParticipant.phone
          ? await prisma.member.findUnique({ where: { phone: existingParticipant.phone } })
          : null;

      if (existingMember) {
        return res.json({
          guestMemberId: existingMember.id,
          bookingId: booking.id,
          guestName: existingMember.name,
          phone: existingMember.phone,
          handicap: parseFloat(existingMember.gaHandy || existingMember.handicap) || 36,
          alreadyRegistered: true,
        });
      }
    }

    const preAdded = existingParticipant; // 사전 직접추가 or 위에서 못 찾은 케이스
    const parsedHandicap = parseFloat(handicap) || (preAdded ? parseFloat(preAdded.handicap) : 36) || 36;

    // 이중 안전장치: 동일 이름의 기존 게스트 Member가 DB에 있으면 재사용
    const existingGuestMember = await prisma.member.findFirst({
      where: { isGuest: true, name: guestName.trim() },
      orderBy: { createdAt: 'desc' }, // 가장 최근 것 사용
    });

    // 기존 게스트 Member가 있지만 participants에 없는 경우 (다른 라운딩에서 등록된 케이스)
    // → 이 라운딩 참가비 중복 청구 여부만 확인 후 처리
    if (existingGuestMember) {
      const dupTransaction = await prisma.transaction.findFirst({
        where: { memberId: existingGuestMember.id, bookingId: booking.id, type: 'charge' },
      });
      // participants 업데이트 후 필요하면 청구
      const filteredP = parsedParticipants.filter(p => !(p.isGuest === true && p.name === guestName.trim()));
      const oldPhone = preAdded?.phone || null;
      const newP = JSON.stringify({
        id: existingGuestMember.id,
        name: existingGuestMember.name,
        nickname: existingGuestMember.name,
        phone: existingGuestMember.phone,
        isGuest: true,
        handicap: String(parsedHandicap),
        gaHandy: String(parsedHandicap),
      });

      let updatedTeams2 = booking.teams;
      if (oldPhone && booking.teams) {
        try {
          const arr = typeof booking.teams === 'string' ? JSON.parse(booking.teams) : booking.teams;
          let changed = false;
          const replaced = arr.map(t => ({
            ...t,
            members: (t.members || []).map(m => {
              if (m && m.phone === oldPhone) { changed = true; return { ...m, phone: existingGuestMember.phone, id: existingGuestMember.id }; }
              return m;
            }),
          }));
          if (changed) updatedTeams2 = JSON.stringify(replaced);
        } catch {}
      }

      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          participants: [...filteredP.map(p => JSON.stringify(p)), newP],
          ...(updatedTeams2 !== booking.teams ? { teams: updatedTeams2 } : {}),
        },
      });

      const feeAmount2 = (booking.greenFee || 0) + (booking.cartFee || 0);
      if (feeAmount2 > 0 && !dupTransaction) {
        const today = new Date().toISOString().split('T')[0];
        await prisma.transaction.create({
          data: {
            type: 'charge',
            amount: feeAmount2,
            description: `${booking.title || booking.courseName} 라운딩 (게스트)`,
            category: '게스트 참가비',
            date: today,
            memberId: existingGuestMember.id,
            bookingId: booking.id,
          },
        });
        await recalculateAndUpdateBalance(existingGuestMember.id);
      }

      req.io.emit('bookings:updated');
      req.io.emit('members:updated');
      req.io.emit('transactions:updated');

      return res.json({
        guestMemberId: existingGuestMember.id,
        bookingId: booking.id,
        guestName: existingGuestMember.name,
        phone: existingGuestMember.phone,
        handicap: parsedHandicap,
        feeCharged: dupTransaction ? 0 : feeAmount2,
      });
    }

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

    req.io.emit('bookings:updated');
    req.io.emit('members:updated');
    req.io.emit('transactions:updated');

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
