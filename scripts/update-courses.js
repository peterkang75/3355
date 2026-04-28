// 기존 골프장 일괄 업데이트 스크립트
// 실행: node scripts/update-courses.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_KEY = process.env.GOLFCOURSE_API_KEY;
const DELAY_MS = 400; // API rate limit 대응 (300req/day)

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function searchCourse(name) {
  const res = await fetch(
    `https://api.golfcourseapi.com/v1/search?search_query=${encodeURIComponent(name)}`,
    { headers: { Authorization: `Key ${API_KEY}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.courses?.[0] || null;
}

function buildUpdateData(course) {
  const maleTees = course.tees?.male || [];
  const femaleTees = course.tees?.female || [];
  const primaryTee = maleTees[0] || femaleTees[0];

  const holePars = { male: [], female: [] };
  if (maleTees[0]?.holes) holePars.male = maleTees[0].holes.map(h => h.par);
  if (femaleTees[0]?.holes) holePars.female = femaleTees[0].holes.map(h => h.par);

  // GolfCourseAPI handicap 필드 = SI
  const holeIndexes = {};
  const maleHcp = maleTees[0]?.holes?.map(h => h.handicap).filter(Boolean);
  const femaleHcp = femaleTees[0]?.holes?.map(h => h.handicap).filter(Boolean);
  if (maleHcp?.length === 18) holeIndexes.male = maleHcp;
  if (femaleHcp?.length === 18) holeIndexes.female = femaleHcp;

  const tees = [
    ...maleTees.map(t => ({
      tee_name: t.tee_name, gender: 'male',
      total_meters: t.total_meters, par_total: t.par_total,
      course_rating: t.course_rating, slope_rating: t.slope_rating,
      holes: (t.holes || []).map(h => ({ par: h.par, meters: h.yardage ? Math.round(h.yardage * 0.9144) : null }))
    })),
    ...femaleTees.map(t => ({
      tee_name: t.tee_name, gender: 'female',
      total_meters: t.total_meters, par_total: t.par_total,
      course_rating: t.course_rating, slope_rating: t.slope_rating,
      holes: (t.holes || []).map(h => ({ par: h.par, meters: h.yardage ? Math.round(h.yardage * 0.9144) : null }))
    }))
  ];

  return {
    address: course.location?.address || undefined,
    city: course.location?.city || null,
    state: course.location?.state || null,
    country: course.location?.country || null,
    latitude: course.location?.latitude || null,
    longitude: course.location?.longitude || null,
    holePars: (holePars.male.length > 0 || holePars.female.length > 0) ? holePars : undefined,
    holeIndexes: Object.keys(holeIndexes).length > 0 ? holeIndexes : undefined,
    tees: tees.length > 0 ? tees : undefined,
    externalId: course.id || null,
  };
}

async function main() {
  if (!API_KEY) { console.error('GOLFCOURSE_API_KEY 없음'); process.exit(1); }

  const courses = await prisma.course.findMany({ orderBy: { name: 'asc' } });
  console.log(`총 ${courses.length}개 골프장 업데이트 시작\n`);

  let ok = 0, skip = 0, fail = 0;

  for (const course of courses) {
    await sleep(DELAY_MS);
    process.stdout.write(`[${courses.indexOf(course)+1}/${courses.length}] ${course.name} ... `);

    try {
      const apiCourse = await searchCourse(course.name);
      if (!apiCourse) {
        console.log('❌ API에서 찾지 못함');
        fail++;
        continue;
      }

      const updateData = buildUpdateData(apiCourse);
      // undefined 제거
      Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);

      await prisma.course.update({ where: { id: course.id }, data: updateData });

      const siStatus = updateData.holeIndexes ? '✅ SI포함' : '(SI없음)';
      const teesCount = updateData.tees?.length || 0;
      console.log(`✅ 업데이트 (티박스 ${teesCount}개 ${siStatus})`);
      ok++;
    } catch (e) {
      console.log(`❌ 오류: ${e.message}`);
      fail++;
    }
  }

  console.log(`\n완료: 성공 ${ok} / 실패 ${fail} / 스킵 ${skip}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
