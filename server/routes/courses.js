const express = require("express");
const prisma = require("../db");
const { requireAuth, requireOperator } = require('../middleware/auth');

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const courses = await prisma.course.findMany();
    res.json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

router.post("/", requireAuth, requireOperator, async (req, res) => {
  try {
    const course = await prisma.course.create({
      data: req.body,
    });
    res.json(course);
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ error: "Failed to create course" });
  }
});

router.put("/:id", requireAuth, requireOperator, async (req, res) => {
  try {
    const { name, address, holePars, nearHoles, isCompetition } = req.body;
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: { name, address, holePars, nearHoles, isCompetition },
    });
    res.json(course);
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ error: "Failed to update course" });
  }
});

router.delete("/:id", requireAuth, requireOperator, async (req, res) => {
  try {
    await prisma.course.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ error: "Failed to delete course" });
  }
});

module.exports = router;
