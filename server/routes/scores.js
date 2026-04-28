const express = require("express");
const prisma = require("../db");
const { requireAuth, requireAuthOrGuest, requireOperator } = require('../middleware/auth');

const router = express.Router();

router.get("/all", async (req, res) => {
  try {
    const scores = await prisma.score.findMany({
      include: { user: true },
      orderBy: { date: "desc" },
    });
    res.json(scores);
  } catch (error) {
    console.error("Error fetching all scores:", error);
    res.status(500).json({ error: "Failed to fetch all scores" });
  }
});

router.get("/booking/:date/:courseName", async (req, res) => {
  try {
    const { date, courseName } = req.params;
    const scores = await prisma.score.findMany({
      where: {
        date: decodeURIComponent(date),
        courseName: decodeURIComponent(courseName),
      },
      include: { user: true },
    });
    res.json(scores);
  } catch (error) {
    console.error("Error fetching booking scores:", error);
    res.status(500).json({ error: "Failed to fetch booking scores" });
  }
});

router.get("/by-rounding/:roundingName", async (req, res) => {
  try {
    const { roundingName } = req.params;
    const { date } = req.query;
    const where = {
      roundingName: decodeURIComponent(roundingName),
    };
    if (date) where.date = date;
    const scores = await prisma.score.findMany({
      where,
      select: {
        id: true,
        userId: true,
        markerId: true,
        totalScore: true,
        coursePar: true,
        holes: true,
        markerHoles: true,
        courseName: true,
        date: true,
        gameMode: true,
        gameMetadata: true,
        user: {
          select: {
            id: true,
            name: true,
            nickname: true,
            handicap: true,
            gaHandy: true,
            gender: true,
            isGuest: true,
          },
        },
      },
    });
    res.json(scores);
  } catch (error) {
    console.error("Error fetching rounding scores:", error);
    res.status(500).json({ error: "Failed to fetch rounding scores" });
  }
});

router.get("/round-comparison", async (req, res) => {
  try {
    const { roundingName, date, myId, teammateId } = req.query;

    if (!roundingName || !date || !myId || !teammateId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const scores = await prisma.score.findMany({
      where: {
        roundingName,
        date,
        userId: { in: [myId, teammateId] },
      },
    });

    const myScore = scores.find((s) => s.userId === myId);
    const teammateScore = scores.find((s) => s.userId === teammateId);

    res.json({
      myScore: myScore ? JSON.parse(myScore.holes || "[]") : null,
      teammateScore: teammateScore ? JSON.parse(teammateScore.holes || "[]") : null,
      myVerified: myScore?.verified || false,
      teammateVerified: teammateScore?.verified || false,
      teammateComplete: !!teammateScore,
      mismatches: [],
    });
  } catch (error) {
    console.error("Error fetching round comparison:", error);
    res.status(500).json({ error: "Failed to fetch round comparison" });
  }
});

router.post("/verify-round", requireAuthOrGuest, async (req, res) => {
  try {
    const { roundingName, date, myId, teammateId } = req.body;

    if (!roundingName || !date || !myId || !teammateId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // 양쪽 Score 레코드 모두 조회
    const [myScore, teammateScore] = await Promise.all([
      prisma.score.findUnique({
        where: { userId_date_roundingName: { userId: myId, date, roundingName } },
      }),
      prisma.score.findUnique({
        where: { userId_date_roundingName: { userId: teammateId, date, roundingName } },
      }),
    ]);

    // 팀메이트 본인 self-entry 없으면 미준비
    const isTeammateSelfEntry = teammateScore && teammateScore.markerId === teammateScore.userId;
    if (!isTeammateSelfEntry) {
      return res.json({
        success: false,
        error: "TEAMMATE_NOT_READY",
        message: "팀메이트가 아직 본인 스코어를 입력하지 않았습니다.",
      });
    }

    // 4개 세트 파싱
    // teammateSelf: 팀메이트가 기록한 자기 self
    // teammateByMe: 내가 기록한 팀메이트 (teammateScore.markerHoles에 저장되어 있음)
    // mySelf: 내가 기록한 나 self
    // myByTeammate: 팀메이트가 기록한 나 (myScore.markerHoles에 저장되어 있음)
    const teammateSelf = JSON.parse(teammateScore.holes || "[]");
    const teammateByMe = JSON.parse(teammateScore.markerHoles || "[]");
    const mySelf = JSON.parse(myScore?.holes || "[]");
    const myByTeammate = JSON.parse(myScore?.markerHoles || "[]");

    // 양방향 비교: 한 홀이라도 어긋나면 mismatches에 포함
    const mismatchSet = new Set();
    for (let i = 0; i < 18; i++) {
      // 방향 1: 내가 기록한 팀메이트 점수 vs 팀메이트 self
      if (teammateByMe[i] !== teammateSelf[i]) mismatchSet.add(i + 1);
      // 방향 2: 팀메이트가 기록한 내 점수 vs 내 self
      if (myByTeammate[i] !== mySelf[i]) mismatchSet.add(i + 1);
    }
    const mismatches = Array.from(mismatchSet).sort((a, b) => a - b);

    if (mismatches.length === 0) {
      await prisma.score.update({
        where: { id: teammateScore.id },
        data: { verified: true, verifiedBy: myId },
      });
      if (myScore) {
        await prisma.score.update({
          where: { id: myScore.id },
          data: { verified: true, verifiedBy: teammateId },
        });
      }
      if (req.io) req.io.emit('scores:updated');
      return res.json({ success: true, verified: true, mismatches: [], message: "모든 점수가 일치합니다." });
    } else {
      return res.json({
        success: true,
        verified: false,
        mismatches,
        message: `${mismatches.length}개 홀의 점수가 일치하지 않습니다.`,
      });
    }
  } catch (error) {
    console.error("Error verifying round:", error);
    res.status(500).json({ error: "Failed to verify round" });
  }
});

router.get("/member/:memberId/:roundingName", async (req, res) => {
  try {
    const { memberId, roundingName } = req.params;
    const score = await prisma.score.findFirst({
      where: {
        userId: memberId,
        roundingName: decodeURIComponent(roundingName),
      },
    });
    res.json(score || null);
  } catch (error) {
    console.error("Error fetching member score:", error);
    res.status(500).json({ error: "Failed to fetch member score" });
  }
});

router.get("/check", async (req, res) => {
  try {
    const { memberId, date, roundingName } = req.query;

    const score = await prisma.score.findFirst({
      where: { userId: memberId, date, roundingName },
    });

    res.json({ exists: !!score, completed: score?.completed || false });
  } catch (error) {
    console.error("Error checking score:", error);
    res.status(500).json({ error: "Failed to check score" });
  }
});

router.post("/complete", requireAuthOrGuest, async (req, res) => {
  try {
    const { memberId, markerId, date, roundingName } = req.body;

    await prisma.score.updateMany({
      where: {
        OR: [
          { userId: memberId, markerId: markerId, date, roundingName },
          { userId: markerId, markerId: memberId, date, roundingName },
        ],
      },
      data: { completed: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error completing score:", error);
    res.status(500).json({ error: "Failed to complete score" });
  }
});

router.delete("/member/:memberId/:date/:roundingName", requireAuth, requireOperator, async (req, res) => {
  try {
    const { memberId, date, roundingName } = req.params;
    await prisma.score.delete({
      where: {
        userId_date_roundingName: {
          userId: decodeURIComponent(memberId),
          date: decodeURIComponent(date),
          roundingName: decodeURIComponent(roundingName),
        },
      },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting member scores:", error);
    res.status(500).json({ error: "Failed to delete member scores" });
  }
});

router.post("/", requireAuthOrGuest, async (req, res) => {
  try {
    const {
      memberId, markerId, roundingName, date, courseName,
      totalScore, coursePar, holes, isVerification, gameMode, gameMetadata,
    } = req.body;

    const isSelfEntry = !markerId || markerId === memberId;

    if (isVerification && !isSelfEntry) {
      const existingScore = await prisma.score.findUnique({
        where: {
          userId_date_roundingName: { userId: memberId, date, roundingName: roundingName || "" },
        },
      });

      if (!existingScore) {
        return res.status(400).json({
          error: "PLAYER_SCORE_NOT_FOUND",
          message: "플레이어가 아직 스코어를 입력하지 않았습니다.",
        });
      }

      if (existingScore.totalScore !== totalScore) {
        return res.status(400).json({
          error: "SCORE_MISMATCH",
          message: `점수가 일치하지 않습니다. 플레이어 입력: ${existingScore.totalScore}타, 마커 입력: ${totalScore}타`,
          playerScore: existingScore.totalScore,
          markerScore: totalScore,
        });
      }

      const verifiedScore = await prisma.score.update({
        where: { id: existingScore.id },
        data: { verified: true, verifiedBy: markerId },
      });

      return res.json({
        ...verifiedScore,
        verificationSuccess: true,
        message: "스코어가 검증되었습니다.",
      });
    }

    // 기존 레코드 조회 (마커/self 분기 판단 + markerHoles 보존용)
    const existing = await prisma.score.findUnique({
      where: { userId_date_roundingName: { userId: memberId, date, roundingName: roundingName || "" } },
      select: { id: true, markerId: true, userId: true, holes: true, markerHoles: true },
    });

    // 마커 입력인 경우, 본인 self-entry가 이미 존재하면 holes 덮어쓰지 않고 markerHoles에 저장
    // (양방향 검증을 위해 "마커가 기록한 점수"도 DB에 보존)
    if (!isSelfEntry) {
      if (existing && existing.markerId === existing.userId) {
        // 본인 self-entry 존재 → markerHoles에만 저장
        const updated = await prisma.score.update({
          where: { id: existing.id },
          data: {
            markerHoles: JSON.stringify(holes),
            verified: false,
            verifiedBy: null,
          },
        });
        if (req.io) req.io.emit('scores:updated');
        return res.json({ ...updated, success: true, selfEntryPreserved: true, markerHolesStored: true });
      }
    }

    // self-entry가 기존 marker-entry를 덮어쓰는 경우: 기존 holes(마커가 기록한 값)를 markerHoles로 보존
    const preserveMarkerHoles =
      isSelfEntry && existing && existing.markerId && existing.markerId !== existing.userId && !existing.markerHoles
        ? existing.holes
        : undefined;

    const score = await prisma.score.upsert({
      where: {
        userId_date_roundingName: { userId: memberId, date, roundingName: roundingName || "" },
      },
      update: {
        courseName,
        totalScore,
        coursePar,
        holes: JSON.stringify(holes),
        markerId: isSelfEntry ? memberId : markerId,
        verified: false,
        verifiedBy: null,
        ...(preserveMarkerHoles !== undefined ? { markerHoles: preserveMarkerHoles } : {}),
        gameMode: gameMode || null,
        gameMetadata: gameMetadata ? JSON.stringify(gameMetadata) : null,
      },
      create: {
        userId: memberId,
        markerId: isSelfEntry ? memberId : markerId,
        roundingName: roundingName || "",
        date,
        courseName,
        totalScore,
        coursePar,
        holes: JSON.stringify(holes),
        verified: false,
        gameMode: gameMode || null,
        gameMetadata: gameMetadata ? JSON.stringify(gameMetadata) : null,
      },
    });

    // 포썸 모드: 파트너 스코어 자동 동기화
    try {
      const booking = await prisma.booking.findFirst({ where: { title: roundingName } });

      if (booking) {
        let gradeSettings = null;
        try {
          gradeSettings = typeof booking.gradeSettings === 'string'
            ? JSON.parse(booking.gradeSettings.replace(/^"|"$/g, ''))
            : booking.gradeSettings;
        } catch (e) {}

        if (gradeSettings?.mode === 'foursome' && booking.teams) {
          let teams = null;
          try {
            teams = typeof booking.teams === 'string'
              ? JSON.parse(booking.teams.replace(/^"|"$/g, ''))
              : booking.teams;
          } catch (e) {}

          if (teams && Array.isArray(teams)) {
            const member = await prisma.member.findUnique({ where: { id: memberId } });
            if (member) {
              for (const team of teams) {
                if (!team.members) continue;
                const memberIndex = team.members.findIndex(m => m?.phone === member.phone);
                if (memberIndex >= 0) {
                  const partnerIndex = memberIndex % 2 === 0 ? memberIndex + 1 : memberIndex - 1;
                  const partner = team.members[partnerIndex];

                  if (partner?.phone) {
                    const partnerMember = await prisma.member.findFirst({ where: { phone: partner.phone } });
                    if (partnerMember && partnerMember.id !== memberId) {
                      const isTeamA = memberIndex < 2;
                      const opponentIndices = isTeamA ? [2, 3] : [0, 1];
                      const opponents = opponentIndices.map(i => team.members[i]).filter(Boolean);

                      const partnerGameMetadata = {
                        partner: { name: member.nickname || member.name, phone: member.phone },
                        opponents: opponents.map(o => ({ name: o.nickname || o.name, phone: o.phone })),
                        recordedBy: member.nickname || member.name,
                      };

                      await prisma.score.upsert({
                        where: {
                          userId_date_roundingName: { userId: partnerMember.id, date, roundingName: roundingName || "" },
                        },
                        update: {
                          courseName, totalScore, coursePar,
                          holes: JSON.stringify(holes),
                          markerId: memberId,
                          verified: false,
                          verifiedBy: null,
                          gameMode: 'foursome',
                          gameMetadata: JSON.stringify(partnerGameMetadata),
                        },
                        create: {
                          userId: partnerMember.id,
                          markerId: memberId,
                          roundingName: roundingName || "",
                          date, courseName, totalScore, coursePar,
                          holes: JSON.stringify(holes),
                          verified: false,
                          gameMode: 'foursome',
                          gameMetadata: JSON.stringify(partnerGameMetadata),
                        },
                      });
                      console.log(`🏌️ 포썸 파트너 스코어 동기화: ${member.nickname} → ${partnerMember.nickname}`);
                    }
                  }
                  break;
                }
              }
            }
          }
        }
      }
    } catch (syncError) {
      console.error('포썸 파트너 스코어 동기화 오류:', syncError);
    }

    if (req.io) req.io.emit('scores:updated');
    res.json(score);
  } catch (error) {
    console.error("Error creating score:", error);
    res.status(500).json({ error: "Failed to create score" });
  }
});

router.put("/:id", requireAuth, requireOperator, async (req, res) => {
  try {
    const { totalScore, holes } = req.body;
    const updateData = { totalScore };
    if (holes) updateData.holes = JSON.stringify(holes);
    const score = await prisma.score.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json(score);
  } catch (error) {
    console.error("Error updating score:", error);
    res.status(500).json({ error: "Failed to update score" });
  }
});

router.delete("/:id", requireAuth, requireOperator, async (req, res) => {
  try {
    await prisma.score.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting score:", error);
    res.status(500).json({ error: "Failed to delete score" });
  }
});

router.delete("/booking/:date/:courseName", requireAuth, requireOperator, async (req, res) => {
  try {
    const { date, courseName } = req.params;
    await prisma.score.deleteMany({
      where: {
        date: decodeURIComponent(date),
        courseName: decodeURIComponent(courseName),
      },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting booking scores:", error);
    res.status(500).json({ error: "Failed to delete booking scores" });
  }
});

// 포썸 파트너 스코어 동기화 (관리자용)
router.post("/sync-foursome/:bookingId", requireAuth, requireOperator, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking) return res.status(404).json({ error: "라운딩을 찾을 수 없습니다." });

    let gradeSettings = null;
    try {
      gradeSettings = typeof booking.gradeSettings === 'string'
        ? JSON.parse(booking.gradeSettings.replace(/^"|"$/g, ''))
        : booking.gradeSettings;
    } catch (e) {}

    if (gradeSettings?.mode !== 'foursome') {
      return res.status(400).json({ error: "포썸 라운딩이 아닙니다." });
    }

    let teams = null;
    try {
      teams = typeof booking.teams === 'string'
        ? JSON.parse(booking.teams.replace(/^"|"$/g, ''))
        : booking.teams;
    } catch (e) {}

    if (!teams || !Array.isArray(teams)) {
      return res.status(400).json({ error: "팀 정보가 없습니다." });
    }

    const syncedPairs = [];
    const dateStr = new Date(booking.date).toISOString().split('T')[0];

    for (const team of teams) {
      if (!team.members || team.members.length < 4) continue;

      const pairs = [
        [team.members[0], team.members[1]],
        [team.members[2], team.members[3]]
      ];

      for (const [member1, member2] of pairs) {
        if (!member1?.phone || !member2?.phone) continue;

        const m1 = await prisma.member.findFirst({ where: { phone: member1.phone } });
        const m2 = await prisma.member.findFirst({ where: { phone: member2.phone } });
        if (!m1 || !m2) continue;

        const score1 = await prisma.score.findUnique({
          where: { userId_date_roundingName: { userId: m1.id, date: dateStr, roundingName: booking.title } }
        });
        const score2 = await prisma.score.findUnique({
          where: { userId_date_roundingName: { userId: m2.id, date: dateStr, roundingName: booking.title } }
        });

        const sourceScore = (score1?.totalScore > 0) ? score1 : (score2?.totalScore > 0) ? score2 : null;
        if (!sourceScore) continue;

        const targetMemberId = (sourceScore === score1) ? m2.id : m1.id;
        const targetScore = (sourceScore === score1) ? score2 : score1;

        if (targetScore && targetScore.totalScore === sourceScore.totalScore) continue;

        await prisma.score.upsert({
          where: { userId_date_roundingName: { userId: targetMemberId, date: dateStr, roundingName: booking.title } },
          update: {
            totalScore: sourceScore.totalScore,
            coursePar: sourceScore.coursePar,
            courseName: sourceScore.courseName,
            holes: sourceScore.holes,
            markerId: sourceScore.userId,
          },
          create: {
            userId: targetMemberId,
            markerId: sourceScore.userId,
            roundingName: booking.title,
            date: dateStr,
            courseName: sourceScore.courseName,
            totalScore: sourceScore.totalScore,
            coursePar: sourceScore.coursePar,
            holes: sourceScore.holes,
            verified: false,
          },
        });

        const sourceMember = (sourceScore === score1) ? m1 : m2;
        const targetMember = (sourceScore === score1) ? m2 : m1;
        syncedPairs.push(`${sourceMember.nickname} → ${targetMember.nickname}`);
        console.log(`🏌️ 포썸 동기화: ${sourceMember.nickname}(${sourceScore.totalScore}) → ${targetMember.nickname}`);
      }
    }

    res.json({ success: true, synced: syncedPairs });
  } catch (error) {
    console.error("포썸 스코어 동기화 오류:", error);
    res.status(500).json({ error: "동기화 실패" });
  }
});

// 특정 회원의 스코어 조회 (반드시 다른 특정 라우트 아래에 위치해야 함)
router.get("/:userId", async (req, res) => {
  try {
    const scores = await prisma.score.findMany({
      where: { userId: req.params.userId },
      orderBy: { date: "desc" },
    });
    res.json(scores);
  } catch (error) {
    console.error("Error fetching scores:", error);
    res.status(500).json({ error: "Failed to fetch scores" });
  }
});

module.exports = router;
