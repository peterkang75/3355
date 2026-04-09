const express = require("express");
const prisma = require("../db");
const { requireAuth, requireOperator } = require('../middleware/auth');

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const fees = await prisma.fee.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(fees);
  } catch (error) {
    console.error("Error fetching fees:", error);
    res.status(500).json({ error: "Failed to fetch fees" });
  }
});

router.post("/", requireAuth, requireOperator, async (req, res) => {
  try {
    const fee = await prisma.fee.create({
      data: req.body,
    });
    res.json(fee);
  } catch (error) {
    console.error("Error creating fee:", error);
    res.status(500).json({ error: "Failed to create fee" });
  }
});

router.put("/:id", requireAuth, requireOperator, async (req, res) => {
  try {
    const fee = await prisma.fee.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(fee);
  } catch (error) {
    console.error("Error updating fee:", error);
    res.status(500).json({ error: "Failed to update fee" });
  }
});

router.delete("/:id", requireAuth, requireOperator, async (req, res) => {
  try {
    await prisma.fee.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting fee:", error);
    res.status(500).json({ error: "Failed to delete fee" });
  }
});

module.exports = router;
