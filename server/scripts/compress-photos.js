/**
 * One-time script to compress all existing member photos stored as base64 in DB.
 * Run with: npm run compress:photos
 */

const { PrismaClient } = require('@prisma/client');
const { Jimp, JimpMime } = require('jimp');

const prisma = new PrismaClient();

const MAX_SIZE = 400;
const JPEG_QUALITY = 80;

async function compressBase64Photo(base64DataUrl) {
  const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  const image = await Jimp.read(buffer);

  const { width, height } = image.bitmap;
  if (width > MAX_SIZE || height > MAX_SIZE) {
    image.scaleToFit({ w: MAX_SIZE, h: MAX_SIZE });
  }

  const compressedBuffer = await image.getBuffer(JimpMime.jpeg, { quality: JPEG_QUALITY });
  return `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
}

async function run() {
  console.log('DB에서 사진이 있는 회원 조회 중...');

  const members = await prisma.member.findMany({
    where: { photo: { not: null } },
    select: { id: true, name: true, photo: true },
  });

  console.log(`사진이 있는 회원: ${members.length}명`);

  let compressed = 0;
  let skipped = 0;
  let failed = 0;

  for (const member of members) {
    const photo = member.photo;
    if (!photo || !photo.startsWith('data:')) {
      skipped++;
      continue;
    }

    const originalKB = Math.round(Buffer.byteLength(photo, 'utf8') / 1024);

    try {
      const newPhoto = await compressBase64Photo(photo);
      const newKB = Math.round(Buffer.byteLength(newPhoto, 'utf8') / 1024);

      if (newKB < originalKB) {
        await prisma.member.update({
          where: { id: member.id },
          data: { photo: newPhoto },
        });
        console.log(`  ${member.name}: ${originalKB}KB → ${newKB}KB (${Math.round((1 - newKB / originalKB) * 100)}% 절감)`);
        compressed++;
      } else {
        console.log(`  ${member.name}: ${originalKB}KB → 이미 최적화됨 (${originalKB}KB), 건너뜀`);
        skipped++;
      }
    } catch (err) {
      console.error(`  ${member.name} 처리 실패:`, err.message);
      failed++;
    }
  }

  console.log(`\n완료: ${compressed}명 압축, ${skipped}명 건너뜀, ${failed}명 실패`);
  await prisma.$disconnect();
}

run().catch((err) => {
  console.error('스크립트 실패:', err);
  prisma.$disconnect();
  process.exit(1);
});
