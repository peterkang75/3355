const express = require("express");
const prisma = require("../db");
const { requireAuth, requireOperator } = require('../middleware/auth');

const router = express.Router();

// ============= 빙고 설정 =============

router.get("/bingo-settings", async (req, res) => {
  try {
    let settings = await prisma.bingoSettings.findFirst();
    if (!settings) {
      settings = await prisma.bingoSettings.create({
        data: { gridSize: 5, bingoTargetLines: 5 },
      });
    }
    res.json({ gridSize: settings.gridSize, bingoTargetLines: settings.bingoTargetLines });
  } catch (error) {
    console.error("Error fetching bingo settings:", error);
    res.status(500).json({ error: "Failed to fetch bingo settings" });
  }
});

router.post("/bingo-settings", requireAuth, requireOperator, async (req, res) => {
  try {
    const { gridSize, bingoTargetLines } = req.body;
    let settings = await prisma.bingoSettings.findFirst();

    if (settings) {
      settings = await prisma.bingoSettings.update({
        where: { id: settings.id },
        data: { gridSize, bingoTargetLines },
      });
    } else {
      settings = await prisma.bingoSettings.create({
        data: { gridSize, bingoTargetLines },
      });
    }

    req.io.emit("bingo:settings", { gridSize, bingoTargetLines });
    res.json({ gridSize: settings.gridSize, bingoTargetLines: settings.bingoTargetLines });
  } catch (error) {
    console.error("Error saving bingo settings:", error);
    res.status(500).json({ error: "Failed to save bingo settings" });
  }
});

// ============= 활동 로그 =============

router.post("/logs", requireAuth, async (req, res) => {
  try {
    const { memberId, memberName, path, action, userAgent } = req.body;

    if (!memberId || !path || !action) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

    const log = await prisma.activityLog.create({
      data: {
        memberId,
        memberName: memberName || "Unknown",
        path,
        action,
        ipAddress,
        userAgent: userAgent || null,
      },
    });

    await prisma.member.update({
      where: { id: memberId },
      data: { lastActiveAt: new Date() },
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    await prisma.activityLog.deleteMany({
      where: { createdAt: { lt: sevenDaysAgo } },
    });

    res.json({ success: true, log });
  } catch (error) {
    console.error("Error creating activity log:", error);
    res.status(500).json({ error: "Failed to create activity log" });
  }
});

router.get("/logs", requireAuth, requireOperator, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        member: { select: { id: true, name: true, nickname: true } },
      },
    });
    res.json(logs);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
});

// ============= 온라인 회원 =============

router.get("/online-members", async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const onlineMembers = await prisma.member.findMany({
      where: { lastActiveAt: { gte: fiveMinutesAgo }, isActive: true },
      select: { id: true, name: true, nickname: true, lastActiveAt: true },
      orderBy: { lastActiveAt: "desc" },
    });
    res.json(onlineMembers);
  } catch (error) {
    console.error("Error fetching online members:", error);
    res.status(500).json({ error: "Failed to fetch online members" });
  }
});

// ============= 우승자 예측 =============

router.get("/winner-predictions/:roundingId", async (req, res) => {
  try {
    const predictions = await prisma.winnerPrediction.findMany({
      where: { roundingId: req.params.roundingId },
      include: {
        voter: { select: { id: true, name: true, nickname: true } },
        predictedWinner: { select: { id: true, name: true, nickname: true } }
      }
    });
    res.json({ predictions });
  } catch (error) {
    console.error("Error fetching winner predictions:", error);
    res.status(500).json({ error: "Failed to fetch winner predictions" });
  }
});

router.post("/winner-predictions", requireAuth, async (req, res) => {
  try {
    const { roundingId, voterId, predictions } = req.body;

    const existing = await prisma.winnerPrediction.findFirst({
      where: { roundingId, voterId }
    });

    if (existing) {
      return res.status(409).json({ error: "이미 투표하셨습니다." });
    }

    const predictionData = Object.entries(predictions).map(([grade, predictedWinnerId]) => ({
      roundingId, voterId, predictedWinnerId, grade
    }));

    await prisma.winnerPrediction.createMany({ data: predictionData });

    res.json({ success: true });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: "이미 투표하셨습니다." });
    }
    console.error("Error creating winner prediction:", error);
    res.status(500).json({ error: "Failed to create winner prediction" });
  }
});

router.put("/winner-predictions", requireAuth, async (req, res) => {
  try {
    const { roundingId, voterId, predictions } = req.body;

    await prisma.winnerPrediction.deleteMany({ where: { roundingId, voterId } });

    const predictionData = Object.entries(predictions).map(([grade, predictedWinnerId]) => ({
      roundingId, voterId, predictedWinnerId, grade
    }));

    await prisma.winnerPrediction.createMany({ data: predictionData });

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating winner prediction:", error);
    res.status(500).json({ error: "Failed to update winner prediction" });
  }
});

router.delete("/winner-predictions/:roundingId/:voterId", requireAuth, async (req, res) => {
  try {
    const { roundingId, voterId } = req.params;
    await prisma.winnerPrediction.deleteMany({ where: { roundingId, voterId } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting winner prediction:", error);
    res.status(500).json({ error: "Failed to delete winner prediction" });
  }
});

module.exports = router;
