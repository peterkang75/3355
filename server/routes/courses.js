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

// 골프장 검색 (GolfCourseAPI) — 인증된 회원이면 누구나 사용 가능
router.post("/search", requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Course name required" });

  const apiKey = process.env.GOLFCOURSE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GOLFCOURSE_API_KEY not configured" });

  try {
    const response = await fetch(`https://api.golfcourseapi.com/v1/search?search_query=${encodeURIComponent(name)}`, {
      headers: { 'Authorization': `Key ${apiKey}` }
    });

    if (!response.ok) {
      console.error('GolfCourseAPI error:', response.status);
      return res.status(502).json({ error: "Golf course search failed" });
    }

    const data = await response.json();
    const courses = data.courses || [];

    if (courses.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    const course = courses[0];
    const maleTees = course.tees?.male || [];
    const femaleTees = course.tees?.female || [];
    const primaryTee = maleTees[0] || femaleTees[0];

    const holePars = { male: [], female: [] };
    if (maleTees[0]?.holes) {
      holePars.male = maleTees[0].holes.map(h => h.par);
    }
    if (femaleTees[0]?.holes) {
      holePars.female = femaleTees[0].holes.map(h => h.par);
    }

    // GolfCourseAPI의 handicap 필드 = Stroke Index (있으면 바로 사용)
    const holeIndexes = {};
    const maleHcp = maleTees[0]?.holes?.map(h => h.handicap).filter(Boolean);
    const femaleHcp = femaleTees[0]?.holes?.map(h => h.handicap).filter(Boolean);
    if (maleHcp?.length === 18) holeIndexes.male = maleHcp;
    if (femaleHcp?.length === 18) holeIndexes.female = femaleHcp;

    const tees = [
      ...maleTees.map(t => ({
        tee_name: t.tee_name,
        gender: 'male',
        total_meters: t.total_meters,
        par_total: t.par_total,
        course_rating: t.course_rating,
        slope_rating: t.slope_rating,
        holes: (t.holes || []).map(h => ({ par: h.par, meters: h.yardage ? Math.round(h.yardage * 0.9144) : h.yardage }))
      })),
      ...femaleTees.map(t => ({
        tee_name: t.tee_name,
        gender: 'female',
        total_meters: t.total_meters,
        par_total: t.par_total,
        course_rating: t.course_rating,
        slope_rating: t.slope_rating,
        holes: (t.holes || []).map(h => ({ par: h.par, meters: h.yardage ? Math.round(h.yardage * 0.9144) : h.yardage }))
      }))
    ];

    const courseInfo = {
      name: course.club_name || course.course_name,
      address: course.location?.address || '',
      city: course.location?.city || null,
      state: course.location?.state || null,
      country: course.location?.country || null,
      latitude: course.location?.latitude || null,
      longitude: course.location?.longitude || null,
      holePars,
      holeIndexes: Object.keys(holeIndexes).length > 0 ? holeIndexes : null,
      tees,
      externalId: course.id,
      totalPar: primaryTee?.par_total || 72,
      totalMeters: primaryTee?.total_meters || null,
    };

    res.json(courseInfo);
  } catch (err) {
    console.error('Course search error:', err);
    res.status(500).json({ error: "Search failed: " + err.message });
  }
});

// bluegolf.com에서 Stroke Index 조회
router.post("/stroke-index", requireAuth, async (req, res) => {
  const { courseName } = req.body;
  if (!courseName) return res.status(400).json({ error: "Course name required" });

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-AU,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0',
  };

  try {
    const slugs = generateBlueGolfSlugs(courseName);
    let html = null;
    let usedSlug = null;

    for (const slug of slugs) {
      const url = `https://course.bluegolf.com/bluegolf/course/course/${slug}/detailedscorecard.htm`;
      const resp = await fetch(url, { headers });
      console.log(`[bluegolf] ${slug} → ${resp.status}`);
      if (resp.status === 200) {
        html = await resp.text();
        usedSlug = slug;
        break;
      }
    }

    if (!html) return res.status(404).json({ error: "Course not found on BlueGolf", slugsTried: slugs });

    const holeIndexes = parseBlueGolfScorecard(html);
    if (!holeIndexes) return res.status(404).json({ error: "Could not parse stroke index data" });

    res.json({ holeIndexes, source: 'bluegolf', slug: usedSlug });
  } catch (err) {
    console.error('Stroke index lookup error:', err);
    res.status(500).json({ error: "Stroke index lookup failed" });
  }
});

function generateBlueGolfSlugs(name) {
  const clean = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const words = clean.split(' ');
  const slugs = [];

  const gcIdx = words.indexOf('golf');
  if (gcIdx !== -1) {
    const before = words.slice(0, gcIdx).join('');
    slugs.push(before + 'gc');
    slugs.push(before + 'gcnsw');
    slugs.push(before + 'gcaus');
    slugs.push(before + 'gcau');
    slugs.push(before + 'golfclub');
    slugs.push(before + 'golfresort');
    const afterGolf = words.slice(gcIdx + 1).filter(w => !['club', 'course', 'resort'].includes(w));
    if (afterGolf.length > 0) {
      slugs.push(before + 'g' + afterGolf.join(''));
    }
  }

  const ccIdx = words.indexOf('country');
  if (ccIdx !== -1) {
    const before = words.slice(0, ccIdx).join('');
    slugs.push(before + 'cc');
  }

  slugs.push(words.join(''));
  slugs.push(words[0] + 'gc');
  slugs.push(words[0]);
  // "Riverside Oaks" → "riversideoaks"
  const noCommon = words.filter(w => !['golf', 'club', 'course', 'resort', 'country', 'the'].includes(w));
  if (noCommon.length > 0 && noCommon.join('') !== words.join('')) {
    slugs.push(noCommon.join(''));
    slugs.push(noCommon.join('') + 'gc');
  }

  return [...new Set(slugs)];
}

function parseBlueGolfScorecard(html) {
  try {
    const allCells = [];
    const cellPattern = /<td[^>]*>\s*(-?\d+)\s*<\/td>/g;
    let cellMatch;
    while ((cellMatch = cellPattern.exec(html)) !== null) {
      allCells.push(parseInt(cellMatch[1]));
    }

    const sequential = '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18';
    const uniqueSets = [];
    for (let i = 0; i <= allCells.length - 18; i++) {
      const slice = allCells.slice(i, i + 18);
      if (slice.every(v => v >= 1 && v <= 18) && new Set(slice).size === 18) {
        const key = slice.join(',');
        if (key === sequential) continue;
        if (!uniqueSets.some(s => s.key === key)) {
          uniqueSets.push({ key, values: [...slice] });
        }
      }
    }

    if (uniqueSets.length === 0) return null;

    const result = { male: uniqueSets[0].values };
    if (uniqueSets.length > 1) {
      result.female = uniqueSets[uniqueSets.length - 1].values;
    }
    return result;
  } catch (e) {
    console.error('BlueGolf parse error:', e);
    return null;
  }
}

router.post("/", requireAuth, async (req, res) => {
  try {
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
    const { name, address, city, state, country, latitude, longitude, holePars, holeIndexes, tees, nearHoles, isCompetition, externalId } = req.body;
    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: { name, address, city, state, country, latitude, longitude, holePars, holeIndexes, tees, nearHoles, isCompetition, externalId },
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
