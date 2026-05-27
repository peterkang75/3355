/* eslint-disable no-console */
// 로컬 테스트 DB 전용 시드. 운영 DB/R2에 절대 접근하지 않는다.
// 실행: LOCAL_DB_URL="postgresql://peter@localhost:5432/golf3355_dev" node server/scripts/seed-local-feed.js
const { PrismaClient } = require('@prisma/client');

const url = process.env.LOCAL_DB_URL;
if (!url || !/localhost|127\.0\.0\.1/.test(url)) {
  console.error('거부: LOCAL_DB_URL이 로컬(localhost)이 아닙니다. 운영 DB 보호를 위해 중단합니다.');
  process.exit(1);
}
const prisma = new PrismaClient({ datasources: { db: { url } } });

const SEED = {
  reg1: { name: '홍길동', phone: '01011112222', role: '회원' },
  reg2: { name: '김철수', phone: '01033334444', role: '회원' },
  guest: { name: '게스트박', phone: '01055556666', role: '회원', isGuest: true, approvalStatus: 'guest' },
  oper: { name: '관리자', phone: '01077778888', role: '관리자', isAdmin: true },
};

async function main() {
  // 멱등: 기존 시드 회원 삭제(연관 booking/feedpost/reaction/comment는 cascade)
  const phones = Object.values(SEED).map((m) => m.phone);
  await prisma.member.deleteMany({ where: { phone: { in: phones } } });
  // 시드 미디어/반응/댓글 잔재 정리
  await prisma.reaction.deleteMany({ where: { targetType: 'booking' } });
  await prisma.comment.deleteMany({ where: { targetType: 'booking' } });

  const mk = (m) => prisma.member.create({ data: {
    name: m.name, phone: m.phone, role: m.role || '회원',
    isAdmin: !!m.isAdmin, isGuest: !!m.isGuest,
    isActive: true, approvalStatus: m.approvalStatus || 'approved',
  } });
  const reg1 = await mk(SEED.reg1);
  const reg2 = await mk(SEED.reg2);
  const guest = await mk(SEED.guest);
  const oper = await mk(SEED.oper);

  const participants = [
    JSON.stringify({ name: reg1.name, phone: reg1.phone }),
    JSON.stringify({ name: reg2.name, phone: reg2.phone }),
  ];

  // 지난 라운딩 2건 (과거 날짜)
  const b1 = await prisma.booking.create({ data: {
    title: '5월 정기모임', type: '정기모임', courseName: '남촌CC',
    date: '2026-05-10', time: '07:00', organizerId: reg1.id, participants,
  } });
  const b2 = await prisma.booking.create({ data: {
    title: '4월 정기모임', type: '정기모임', courseName: '레이크우드',
    date: '2026-04-12', time: '06:30', organizerId: reg2.id, participants,
  } });

  // 라운딩 미디어: status ready, thumbnailKey null → 피드 cover는 회색박스+📷N (깨진 이미지 없음)
  const mkMedia = (booking, n) => prisma.roundingMedia.create({ data: {
    bookingId: booking.id, type: 'photo',
    objectKey: `bookings/seed/${booking.id}-${n}.jpg`, thumbnailKey: null,
    fileSize: 120000, uploaderPhone: reg1.phone, uploaderName: reg1.name, status: 'ready',
  } });
  await mkMedia(b1, 1); await mkMedia(b1, 2); await mkMedia(b1, 3);
  await mkMedia(b2, 1); await mkMedia(b2, 2);

  // 스코어 (b1 리더보드 링크 확인용)
  await prisma.score.create({ data: {
    userId: reg1.id, date: b1.date, roundingName: b1.title, courseName: b1.courseName,
    totalScore: 82, coursePar: 72, completed: true } });
  await prisma.score.create({ data: {
    userId: reg2.id, date: b1.date, roundingName: b1.title, courseName: b1.courseName,
    totalScore: 88, coursePar: 72, completed: true } });

  // 자유글 3종
  await prisma.feedPost.create({ data: { authorId: reg2.id, content: '오늘 연습장 다녀왔어요 ⛳ 폼이 좀 잡히는 듯!' } });
  await prisma.feedPost.create({ data: { authorId: reg1.id, content: '이 영상 보고 드라이버 교정 중 https://youtu.be/dQw4w9WgXcQ' } });
  await prisma.feedPost.create({ data: { authorId: reg1.id, content: '지난 라운딩 사진 인스타에 올렸어요 https://instagram.com/p/CabcdEfGhij/' } });

  console.log('✅ 로컬 시드 완료');
  console.log('정회원1:', reg1.id, reg1.phone);
  console.log('정회원2:', reg2.id, reg2.phone);
  console.log('게스트 :', guest.id, guest.phone, '(approvalStatus=guest)');
  console.log('운영자 :', oper.id, oper.phone, '(role=관리자)');
  console.log('라운딩(사진有):', b1.id, '/', b2.id);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
