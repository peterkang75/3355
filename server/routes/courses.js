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

// 골프장 자동 검색 (Anthropic API) — 인증된 회원이면 누구나 사용 가능
router.post("/search", requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Course name required" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured in .env" });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Find hole-by-hole par information for "${name}" golf course (likely in Australia).
Return ONLY a valid JSON object, no markdown, no explanation:
{"name":"exact official course name","address":"full address with suburb and state","holePars":{"male":[p1,p2,...,p18],"female":[p1,p2,...,p18]},"totalMale":72,"totalFemale":72}
Rules:
- holePars arrays must have exactly 18 integers each (3, 4, or 5)
- If you cannot find specific hole pars, use par 4 for all holes
- Return only the JSON object, nothing else`
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(502).json({ error: "AI search failed" });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(404).json({ error: "Course not found" });

    const courseInfo = JSON.parse(jsonMatch[0]);

    // Validate structure
    if (!courseInfo.name || !Array.isArray(courseInfo.holePars?.male) || courseInfo.holePars.male.length !== 18) {
      return res.status(422).json({ error: "Invalid course data returned" });
    }

    res.json(courseInfo);
  } catch (err) {
    console.error('Course search error:', err);
    res.status(500).json({ error: "Search failed: " + err.message });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    // 동일 이름 골프장 중복 체크 (이미 있으면 기존 것 반환)
    const { name } = req.body;
    if (name) {
      const existing = await prisma.course.findFirst({ where: { name } });
      if (existing) return res.json(existing);
    }
    const course = await prisma.course.create({ data: req.body });
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
    await prisma.course.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ error: "Failed to delete course" });
  }
});

module.exports = router;
