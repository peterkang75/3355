const express = require("express");
const prisma = require("../db");
const crypto = require('crypto');
const { calculateBalance, recalculateAndUpdateBalance } = require('../utils/balance');
const { computeGuestChargeForBooking } = require('../utils/fees');
const { mergeGradeSettings } = require('../utils/gradeSettings');
const { requireAuth, requireOperator } = require('../middleware/auth');
const {
  computeMemberChargeForBooking,
  buildBaseDescription,
  issueRoundingChargeForMember,
  clearTeamSlot,
  recordParticipationCancelled,
  handleParticipantRemoval,
  chargeInitialParticipants,
} = require('../utils/participation');

const router = express.Router();

// 참가/취소 + 청구 처리는 server/utils/participation.js 단일 소스를 쓴다.
// (참석 투표도 같은 함수를 호출한다 — 청구 만드는 경로가 두 벌이 되면 반드시 어긋난다)

router.get("/", async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: { organizer: true, _count: { select: { media: true } } },
      orderBy: { date: "desc" },
    });
    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

router.post("/", requireAuth, requireOperator, async (req, res) => {
  try {
    const {
      title, type, isSocial, courseName, date, time, gatheringTime,
      organizerId, organizerPhone, participants, notes, greenFee, cartFee, membershipFee,
      waiveGreenFeeForClubMembers, waiveCartFeeForClubMembers, waiveMembershipFeeForClubMembers,
      registrationDeadline, maxMembers, isGuestAllowed, playEnabled,
      restaurantName, restaurantAddress, is2BB, isAnnounced,
      playManuallyDisabled, useSquadWaitlist, votingEnabled, status, isRecruiting,
    } = req.body;

    let resolvedOrganizerId = organizerId;
    if (organizerId) {
      const orgMember = await prisma.member.findUnique({ where: { id: organizerId }, select: { id: true } });
      if (!orgMember && organizerPhone) {
        const byPhone = await prisma.member.findFirst({ where: { phone: organizerPhone }, select: { id: true } });
        if (byPhone) {
          resolvedOrganizerId = byPhone.id;
          console.log(`organizerId 불일치 → phone fallback 사용: ${organizerPhone} → ${byPhone.id}`);
        }
      }
    }

    const data = {
      ...(title !== undefined && { title }),
      ...(type !== undefined && { type }),
      ...(isSocial !== undefined && { isSocial }),
      ...(courseName !== undefined && { courseName }),
      ...(date !== undefined && { date }),
      ...(time !== undefined && { time }),
      ...(gatheringTime !== undefined && { gatheringTime }),
      ...(resolvedOrganizerId !== undefined && { organizerId: resolvedOrganizerId }),
      ...(participants !== undefined && { participants }),
      ...(notes !== undefined && { notes }),
      ...(greenFee !== undefined && { greenFee: parseInt(greenFee) || null }),
      ...(cartFee !== undefined && { cartFee: parseInt(cartFee) || null }),
      ...(membershipFee !== undefined && { membershipFee: parseInt(membershipFee) || null }),
      ...(waiveGreenFeeForClubMembers !== undefined && { waiveGreenFeeForClubMembers: !!waiveGreenFeeForClubMembers }),
      ...(waiveCartFeeForClubMembers !== undefined && { waiveCartFeeForClubMembers: !!waiveCartFeeForClubMembers }),
      ...(waiveMembershipFeeForClubMembers !== undefined && { waiveMembershipFeeForClubMembers: !!waiveMembershipFeeForClubMembers }),
      ...(registrationDeadline !== undefined && { registrationDeadline }),
      ...(maxMembers !== undefined && { maxMembers: parseInt(maxMembers) || 4 }),
      ...(isGuestAllowed !== undefined && { isGuestAllowed }),
      ...(playEnabled !== undefined && { playEnabled }),
      ...(restaurantName !== undefined && { restaurantName }),
      ...(restaurantAddress !== undefined && { restaurantAddress }),
      ...(is2BB !== undefined && { is2BB }),
      ...(isRecruiting !== undefined && { isRecruiting }),
      ...(isAnnounced !== undefined && { isAnnounced }),
      ...(playManuallyDisabled !== undefined && { playManuallyDisabled }),
      ...(useSquadWaitlist !== undefined && { useSquadWaitlist }),
      ...(votingEnabled !== undefined && { votingEnabled }),
      ...(status !== undefined && { status }),
    };
    const booking = await prisma.booking.create({
      data,
      include: { organizer: true },
    });
    // 초기 participants(보통 organizer 1명)에게 charge 자동 발행
    try { await chargeInitialParticipants(booking); } catch (e) { console.error('initial participants charge 실패', e); }
    req.io.emit("bookings:updated");
    req.io.emit("transactions:updated");
    req.io.emit("members:updated");
    res.json(booking);
  } catch (error) {
    console.error("Error creating booking:", error.message);
    res.status(500).json({ error: error.message || "Failed to create booking" });
  }
});

router.put("/:id", requireAuth, requireOperator, async (req, res) => {
  try {
    const oldBooking = await prisma.booking.findUnique({
      where: { id: req.params.id },
    });

    if (!oldBooking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // gradeSettings는 화면마다 자기가 아는 키만 보내므로 통째로 덮어쓰면 나머지가 소멸한다.
    // (경기방식 저장 시 그레이드가, 그레이드 저장 시 경기방식이 지워지던 문제)
    const data = { ...req.body };
    if (data.gradeSettings !== undefined) {
      const merged = mergeGradeSettings(oldBooking.gradeSettings, data.gradeSettings);
      if (merged === undefined) delete data.gradeSettings;
      else data.gradeSettings = merged;
    }

    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data,
      include: { organizer: true },
    });

    // Fee/면제토글 변경 시 기존 charge 트랜잭션 자동 동기화
    // (이미 납부된 charge는 건드리지 않음 — 부분 납부 또는 완납은 사용자가 별도 정정해야 안전)
    const feeChanged =
      (req.body.greenFee !== undefined && (parseInt(req.body.greenFee) || 0) !== (oldBooking.greenFee || 0)) ||
      (req.body.cartFee !== undefined && (parseInt(req.body.cartFee) || 0) !== (oldBooking.cartFee || 0)) ||
      (req.body.membershipFee !== undefined && (parseInt(req.body.membershipFee) || 0) !== (oldBooking.membershipFee || 0)) ||
      (req.body.waiveGreenFeeForClubMembers !== undefined && !!req.body.waiveGreenFeeForClubMembers !== !!oldBooking.waiveGreenFeeForClubMembers) ||
      (req.body.waiveCartFeeForClubMembers !== undefined && !!req.body.waiveCartFeeForClubMembers !== !!oldBooking.waiveCartFeeForClubMembers) ||
      (req.body.waiveMembershipFeeForClubMembers !== undefined && !!req.body.waiveMembershipFeeForClubMembers !== !!oldBooking.waiveMembershipFeeForClubMembers) ||
      (req.body.courseName !== undefined && req.body.courseName !== oldBooking.courseName);

    if (feeChanged) {
      const charges = await prisma.transaction.findMany({
        where: { bookingId: booking.id, type: 'charge' },
      });

      for (const c of charges) {
        // 이 회원 납부 여부 확인 — 동일 booking의 일반 payment 트랜잭션 존재 시 스킵 (안전)
        const existingPayment = await prisma.transaction.findFirst({
          where: {
            bookingId: booking.id,
            memberId: c.memberId,
            type: 'payment',
            category: { notIn: ['크레딧 자동 납부', '크레딧 납부', '크레딧 자동 차감'] },
          },
        });
        if (existingPayment) {
          console.log(`Fee 동기화 스킵: 이미 납부된 charge (memberId=${c.memberId.slice(0,8)})`);
          continue;
        }

        const member = await prisma.member.findUnique({
          where: { id: c.memberId },
          select: { id: true, club: true, isFeeExempt: true },
        });
        if (!member) continue;
        // 게스트 charge는 별도 카테고리(게스트 참가비) — 회원 면제 규칙 미적용, 스킵
        if (c.category === '게스트 참가비') continue;

        const info = computeMemberChargeForBooking(member, booking);
        const newAmount = info.total;

        if (c.amount !== newAmount) {
          await prisma.transaction.update({
            where: { id: c.id },
            data: { amount: newAmount },
          });
          await recalculateAndUpdateBalance(c.memberId);
          console.log(`Fee 동기화: memberId=${c.memberId.slice(0,8)} $${c.amount} → $${newAmount}`);
        }
      }

      req.io.emit('transactions:updated');
      req.io.emit('members:updated');
    }

    if (req.body.participants !== undefined) {
      const oldParticipants = oldBooking.participants || [];
      const newParticipants = req.body.participants || [];

      const parseParticipant = (p) => {
        try {
          return typeof p === "string" ? JSON.parse(p) : p;
        } catch {
          return p;
        }
      };

      const oldPhones = oldParticipants.map((p) => parseParticipant(p).phone).filter(Boolean);
      const newPhones = newParticipants.map((p) => parseParticipant(p).phone).filter(Boolean);

      const addedPhones = newPhones.filter((phone) => !oldPhones.includes(phone));
      const removedPhones = oldPhones.filter((phone) => !newPhones.includes(phone));

      for (const phone of addedPhones) {
        const member = await prisma.member.findFirst({ where: { phone } });

        if (member) {
          const existingTransaction = await prisma.transaction.findFirst({
            where: {
              memberId: member.id,
              bookingId: booking.id,
              type: { in: ["charge", "expense"] },
            },
          });

          if (existingTransaction) {
            console.log(`Skipping duplicate charge for member ${member.nickname} on booking ${booking.title}`);
            continue;
          }

          const info = computeMemberChargeForBooking(member, booking);
          const totalAmount = info.total;

          if (totalAmount > 0) {
            const memberTransactionsBefore = await prisma.transaction.findMany({
              where: { memberId: member.id },
            });
            const currentBalance = calculateBalance(memberTransactionsBefore);

            const creditBalance = currentBalance > 0 ? currentBalance : 0;
            const creditToUse = Math.min(creditBalance, totalAmount);
            const remainingCharge = totalAmount - creditToUse;
            const today = new Date().toISOString().split("T")[0];
            const baseDescription = buildBaseDescription(booking, info);

            await prisma.$transaction(async (tx) => {
              if (creditToUse > 0) {
                await tx.transaction.create({
                  data: {
                    type: "expense",
                    amount: creditToUse,
                    description: `${baseDescription} (크레딧 자동 차감)`,
                    category: "크레딧 자동 차감",
                    date: today,
                    memberId: member.id,
                    bookingId: booking.id,
                  },
                });

                await tx.transaction.create({
                  data: {
                    type: "payment",
                    amount: creditToUse,
                    description: `${baseDescription} (크레딧 자동 차감)`,
                    category: "크레딧 자동 차감",
                    date: today,
                    memberId: member.id,
                    bookingId: booking.id,
                  },
                });
              }

              if (remainingCharge > 0) {
                await tx.transaction.create({
                  data: {
                    type: "charge",
                    amount: remainingCharge,
                    description: creditToUse > 0
                      ? `${baseDescription} (크레딧 $${creditToUse} 사용 후 잔액)`
                      : baseDescription,
                    date: today,
                    memberId: member.id,
                    bookingId: booking.id,
                  },
                });
              }
            });
          }

          await recalculateAndUpdateBalance(member.id);
        }
      }

      for (const phone of removedPhones) {
        const member = await prisma.member.findFirst({ where: { phone } });

        if (member) {
          // 청구는 남긴다 — 정산 대기로 넘어가 총무가 환불/청구취소를 결정한다
          await handleParticipantRemoval(booking, member, req.member?.id);
        }
      }
    }

    // Auto-generate 2BB teams when is2BB is toggled on
    if (req.body.is2BB === true && !oldBooking.is2BB) {
      try {
        const teamsData = booking.teams ? (typeof booking.teams === 'string' ? JSON.parse(booking.teams) : booking.teams) : [];
        let allTwoBallTeams = [];

        for (const squad of teamsData) {
          const squadMembers = [];

          for (const member of (squad.members || [])) {
            if (member && member.phone) {
              const memberRecord = await prisma.member.findFirst({ where: { phone: member.phone } });
              if (memberRecord) {
                squadMembers.push({
                  ...member,
                  handicap: parseFloat(memberRecord.handicap) || parseFloat(memberRecord.gaHandy) || 36
                });
              } else {
                squadMembers.push({
                  ...member,
                  handicap: parseFloat(member.gaHandy) || parseFloat(member.houseHandy) || parseFloat(member.handicap) || 36
                });
              }
            }
          }

          if (squadMembers.length >= 3 && squadMembers.length <= 4) {
            squadMembers.sort((a, b) => a.handicap - b.handicap);
            const squadLabel = `${squad.teamNumber}조`;

            if (squadMembers.length === 4) {
              allTwoBallTeams.push({ teamName: `${squadLabel} A팀`, squadNumber: squad.teamNumber, members: [squadMembers[0], squadMembers[3]] });
              allTwoBallTeams.push({ teamName: `${squadLabel} B팀`, squadNumber: squad.teamNumber, members: [squadMembers[1], squadMembers[2]] });
            } else if (squadMembers.length === 3) {
              allTwoBallTeams.push({ teamName: `${squadLabel} A팀`, squadNumber: squad.teamNumber, members: [squadMembers[0], squadMembers[1]] });
              allTwoBallTeams.push({ teamName: `${squadLabel} B팀`, squadNumber: squad.teamNumber, members: [squadMembers[0], squadMembers[2]] });
            }
          }
        }

        if (allTwoBallTeams.length > 0) {
          await prisma.booking.update({
            where: { id: req.params.id },
            data: { twoBallTeams: JSON.stringify(allTwoBallTeams) }
          });
        }
      } catch (error) {
        console.error('Error generating 2BB teams:', error);
      }
    }

    req.io.emit("bookings:updated");
    req.io.emit("members:updated");
    req.io.emit("transactions:updated");
    res.json(booking);
  } catch (error) {
    console.error("Error updating booking:", error);
    res.status(500).json({ error: "Failed to update booking" });
  }
});

// ── 운영진 직접 게스트 추가: Member + charge 생성 ────────────────────────────
router.post("/:id/add-guest", requireAuth, requireOperator, async (req, res) => {
  try {
    const { id: bookingId } = req.params;
    const { name, handicap } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: '이름을 입력해주세요.' });
    }

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ error: '라운딩을 찾을 수 없습니다.' });

    const parsedHandicap = parseFloat(handicap) || 36;
    const phone = `guest_${crypto.randomBytes(8).toString('hex')}`;

    // Member 레코드 생성
    const guest = await prisma.member.create({
      data: {
        name: name.trim(),
        nickname: name.trim(),
        phone,
        isGuest: true,
        isActive: false,
        approvalStatus: 'guest',
        role: '게스트',
        handicap: String(parsedHandicap),
        gaHandy: String(parsedHandicap),
      },
    });

    // participants 업데이트
    const currentParticipants = (booking.participants || []).map(p => {
      try { return typeof p === 'string' ? JSON.parse(p) : p; } catch { return null; }
    }).filter(Boolean);

    const newParticipant = {
      id: guest.id,
      name: guest.name,
      nickname: guest.name,
      phone: guest.phone,
      isGuest: true,
      handicap: String(parsedHandicap),
      gaHandy: String(parsedHandicap),
    };

    await prisma.booking.update({
      where: { id: bookingId },
      data: { participants: [...currentParticipants.map(p => JSON.stringify(p)), JSON.stringify(newParticipant)] },
    });

    // 참가비 청구 (그린피 + 카트비 + 회비)
    const feeAmount = computeGuestChargeForBooking(booking);
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

    res.json({ success: true, participant: newParticipant, feeCharged: feeAmount });
  } catch (error) {
    console.error('Error adding guest:', error);
    res.status(500).json({ error: 'Failed to add guest' });
  }
});

router.delete("/:id", requireAuth, requireOperator, async (req, res) => {
  try {
    // 소식 피드 다형성 반응/댓글 정리 (FK 없음 → 고아 레코드 방지)
    await prisma.reaction.deleteMany({ where: { targetType: "booking", targetId: req.params.id } });
    await prisma.comment.deleteMany({ where: { targetType: "booking", targetId: req.params.id } });
    await prisma.booking.delete({
      where: { id: req.params.id },
    });
    req.io.emit("bookings:updated");
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).json({ error: "Failed to delete booking" });
  }
});

router.patch("/:id/toggle-announce", requireAuth, requireOperator, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { isAnnounced: !booking.isAnnounced },
      include: { organizer: true },
    });

    req.io.emit("bookings:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error toggling announce status:", error);
    res.status(500).json({ error: "Failed to toggle announce status" });
  }
});

router.patch("/:id/toggle-play", requireAuth, requireOperator, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const newPlayEnabled = !booking.playEnabled;
    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: {
        playEnabled: newPlayEnabled,
        playManuallyDisabled: !newPlayEnabled,
      },
      include: { organizer: true },
    });

    req.io.emit("bookings:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error toggling play status:", error);
    res.status(500).json({ error: "Failed to toggle play status" });
  }
});

router.patch("/:id/toggle-voting", requireAuth, requireOperator, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { votingEnabled: !booking.votingEnabled },
      include: { organizer: true },
    });

    req.io.emit("bookings:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error toggling voting status:", error);
    res.status(500).json({ error: "Failed to toggle voting status" });
  }
});

// 회원 참가/취소 (일반 회원 포함) — 자동 청구/취소 처리
router.patch("/:id/toggle-join", requireAuth, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const member = await prisma.member.findUnique({ where: { id: req.member.id } });
    if (!member) return res.status(404).json({ error: "Member not found" });

    const parseParticipant = (p) => {
      try { return typeof p === "string" ? JSON.parse(p) : p; } catch { return p; }
    };

    const participants = (booking.participants || []).map(parseParticipant);
    const alreadyJoined = participants.some(p => p.phone === member.phone);

    let updatedParticipants;
    if (alreadyJoined) {
      // 취소: 명단·조편성에서만 빼고 회계는 건드리지 않는다.
      // 청구를 지우면 이미 납부한 회원의 돈이 유령 크레딧이 되므로, 정산 대기로 넘긴다.
      updatedParticipants = participants.filter(p => p.phone !== member.phone);
      await handleParticipantRemoval(booking, member, member.id);
    } else {
      // 참가: 정원 확인 (컴페티션은 인원 무제한 — 정원 체크 생략)
      if (booking.type !== '컴페티션') {
        const max = booking.maxMembers || 4;
        if (participants.length >= max) {
          return res.status(400).json({ error: "정원이 마감되었습니다." });
        }
      }
      if (booking.registrationDeadline && new Date() > new Date(booking.registrationDeadline)) {
        return res.status(400).json({ error: "참가 신청 마감일이 지났습니다." });
      }

      updatedParticipants = [
        ...participants,
        { name: member.name, nickname: member.nickname, phone: member.phone },
      ];

      // 중복 청구 방지
      const existingCharge = await prisma.transaction.findFirst({
        where: { memberId: member.id, bookingId: booking.id, type: { in: ["charge", "expense"] } },
      });

      if (!existingCharge) {
        const info = computeMemberChargeForBooking(member, booking);
        const totalAmount = info.total;

        if (totalAmount > 0) {
          const memberTransactions = await prisma.transaction.findMany({ where: { memberId: member.id } });
          const currentBalance = calculateBalance(memberTransactions);
          const creditBalance = currentBalance > 0 ? currentBalance : 0;
          const creditToUse = Math.min(creditBalance, totalAmount);
          const remainingCharge = totalAmount - creditToUse;
          const today = new Date().toISOString().split("T")[0];
          const baseDescription = buildBaseDescription(booking, info);

          await prisma.$transaction(async (tx) => {
            if (creditToUse > 0) {
              await tx.transaction.create({ data: { type: "expense", amount: creditToUse, description: `${baseDescription} (크레딧 자동 차감)`, category: "크레딧 자동 차감", date: today, memberId: member.id, bookingId: booking.id } });
              await tx.transaction.create({ data: { type: "payment", amount: creditToUse, description: `${baseDescription} (크레딧 자동 차감)`, category: "크레딧 자동 차감", date: today, memberId: member.id, bookingId: booking.id } });
            }
            if (remainingCharge > 0) {
              await tx.transaction.create({ data: { type: "charge", amount: remainingCharge, description: creditToUse > 0 ? `${baseDescription} (크레딧 $${creditToUse} 사용 후 잔액)` : baseDescription, date: today, memberId: member.id, bookingId: booking.id } });
            }
          });
          await recalculateAndUpdateBalance(member.id);
        }
      }

      // 취소했다가 다시 참가 — 아직 총무가 손대지 않은 정산 대기 항목은 없애준다.
      // (이미 환불·청구취소로 처리된 이력은 감사 목적으로 남긴다)
      await prisma.roundCancellation.deleteMany({
        where: { bookingId: booking.id, memberId: member.id, status: 'pending' },
      });
    }

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { participants: updatedParticipants.map(p => JSON.stringify(p)) },
      include: { organizer: true },
    });

    req.io.emit("bookings:updated");
    req.io.emit("transactions:updated");
    req.io.emit("members:updated");
    res.json({ booking: updated, joined: !alreadyJoined });
  } catch (error) {
    console.error("Error toggling join:", error);
    res.status(500).json({ error: "Failed to toggle join" });
  }
});

// 관리자: 특정 회원을 라운딩에서 제거 + 관련 청구 삭제
// (회원 상세의 "청구취소 → 참가까지 취소" 경로에서 사용. toggle-join 취소와 동일한 결과)
router.patch("/:id/remove-participant", requireAuth, requireOperator, async (req, res) => {
  try {
    const { memberId } = req.body;
    if (!memberId) return res.status(400).json({ error: "memberId is required" });

    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return res.status(404).json({ error: "Member not found" });

    const parseParticipant = (p) => {
      try { return typeof p === "string" ? JSON.parse(p) : p; } catch { return p; }
    };
    const participants = (booking.participants || []).map(parseParticipant);
    const updatedParticipants = participants.filter(p => p.phone !== member.phone);

    // 청구는 남긴다 — 정산 대기로 넘어가 총무가 환불/청구취소를 결정한다
    await handleParticipantRemoval(booking, member, req.member?.id);

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { participants: updatedParticipants.map(p => JSON.stringify(p)) },
      include: { organizer: true },
    });

    req.io.emit("bookings:updated");
    req.io.emit("transactions:updated");
    req.io.emit("members:updated");
    res.json({ booking: updated });
  } catch (error) {
    console.error("Error removing participant:", error);
    res.status(500).json({ error: "Failed to remove participant" });
  }
});

router.patch("/:id/toggle-number-rental", requireAuth, async (req, res) => {
  try {
    const { userPhone } = req.body;
    if (!userPhone) return res.status(400).json({ error: "User phone is required" });

    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const currentRentals = booking.numberRentals || [];
    const isRenting = currentRentals.includes(userPhone);

    const updatedRentals = isRenting
      ? currentRentals.filter((phone) => phone !== userPhone)
      : [...currentRentals, userPhone];

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { numberRentals: updatedRentals },
      include: { organizer: true },
    });

    req.io.emit("bookings:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error toggling number rental:", error);
    res.status(500).json({ error: "Failed to toggle number rental" });
  }
});

router.patch("/:id/grade-settings", requireAuth, requireOperator, async (req, res) => {
  try {
    const { gradeSettings } = req.body;

    const existing = await prisma.booking.findUnique({
      where: { id: req.params.id },
      select: { gradeSettings: true },
    });
    if (!existing) return res.status(404).json({ error: "Booking not found" });

    // 그레이드만 보내와도 경기방식(mode)·신페리오 설정이 살아남도록 병합
    const merged = mergeGradeSettings(existing.gradeSettings, gradeSettings);
    if (merged === undefined) {
      return res.status(400).json({ error: "gradeSettings가 올바르지 않습니다." });
    }

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { gradeSettings: merged },
      include: { organizer: true },
    });

    req.io.emit("bookings:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error updating grade settings:", error);
    res.status(500).json({ error: "Failed to update grade settings" });
  }
});

module.exports = router;
