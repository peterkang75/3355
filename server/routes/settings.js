const express = require("express");
const prisma = require("../db");
const { requireAuth, requireOperator } = require('../middleware/auth');

const router = express.Router();

// GET /settings — 공개 (로그인 화면에서 로고 등 필요)

router.get("/", async (req, res) => {
  try {
    const settings = await prisma.appSettings.findMany();
    res.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.put("/:feature", requireAuth, requireOperator, async (req, res) => {
  try {
    const { minRole, enabled, value } = req.body;
    const updateData = {};
    if (minRole !== undefined) updateData.minRole = minRole;
    if (enabled !== undefined) updateData.enabled = enabled;
    if (value !== undefined) updateData.value = value;

    const setting = await prisma.appSettings.upsert({
      where: { feature: req.params.feature },
      update: updateData,
      create: { feature: req.params.feature, ...updateData },
    });
    res.json(setting);
  } catch (error) {
    console.error("Error updating setting:", error);
    res.status(500).json({ error: "Failed to update setting" });
  }
});

module.exports = router;
