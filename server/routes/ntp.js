const express = require("express");
const prisma = require("../db");
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get("/:bookingId", async (req, res) => {
  try {
    const ntpRecords = await prisma.ntpRecord.findMany({
      where: { bookingId: req.params.bookingId },
      orderBy: [{ holeNumber: "asc" }, { distance: "asc" }],
    });
    res.json(ntpRecords);
  } catch (error) {
    console.error("Error fetching NTP records:", error);
    res.status(500).json({ error: "Failed to fetch NTP records" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { bookingId, memberId, memberName, holeNumber, distance } = req.body;
    const ntpRecord = await prisma.ntpRecord.upsert({
      where: {
        bookingId_memberId_holeNumber: { bookingId, memberId, holeNumber },
      },
      update: { distance, memberName },
      create: { bookingId, memberId, memberName, holeNumber, distance },
    });
    res.json(ntpRecord);
  } catch (error) {
    console.error("Error saving NTP record:", error);
    res.status(500).json({ error: "Failed to save NTP record" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await prisma.ntpRecord.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting NTP record:", error);
    res.status(500).json({ error: "Failed to delete NTP record" });
  }
});

module.exports = router;
