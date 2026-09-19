// 참석 투표 기능 E2E 점검 — 임시 회원·라운딩으로만 돌리고 끝나면 전량 삭제한다.
// 실행: node scripts/test-attendance-poll.js

require('dotenv').config();
const express = require('express');
const prisma = require('../server/db');

const TAG = 'ZZTEST_POLL_';
let pass = 0, fail = 0;
const check = (label, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label} ${extra}`); }
};

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use('/api', (req, res, next) => { req.io = { emit: () => {} }; next(); }, require('../server/api'));

let server, base;
const call = async (method, path, memberId, body) => {
  const r = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(memberId ? { 'X-Member-Id': memberId } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, data };
};

const txFor = (memberId, bookingId) => prisma.transaction.findMany({ where: { memberId, bookingId } });
const chargeSum = async (memberId, bookingId) =>
  (await txFor(memberId, bookingId)).filter(t => t.type === 'charge').reduce((s, t) => s + t.amount, 0);
const participantCount = async (bookingId) => {
  const b = await prisma.booking.findUnique({ where: { id: bookingId }, select: { participants: true } });
  return (b.participants || []).length;
};

(async () => {
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;

  // ── 준비 ──────────────────────────────────────────────────────────────────
  // 이전 실행이 중간에 멈췄을 수 있으니 먼저 치운다
  const stale = await prisma.member.findMany({ where: { name: { startsWith: TAG } }, select: { id: true } });
  if (stale.length) {
    const sids = stale.map(m => m.id);
    await prisma.attendanceVote.deleteMany({ where: { memberId: { in: sids } } });
    await prisma.transaction.deleteMany({ where: { memberId: { in: sids } } });
    await prisma.roundCancellation.deleteMany({ where: { memberId: { in: sids } } });
    await prisma.member.deleteMany({ where: { id: { in: sids } } });
  }
  const staleB = await prisma.booking.findMany({ where: { title: { startsWith: TAG } }, select: { id: true } });
  if (staleB.length) await prisma.booking.deleteMany({ where: { id: { in: staleB.map(b => b.id) } } });

  const admin = await prisma.member.create({ data: { name: `${TAG}admin`, phone: `${TAG}0`, role: '관리자', isAdmin: true, isActive: true, approvalStatus: 'approved' } });
  const A = await prisma.member.create({ data: { name: `${TAG}A`, phone: `${TAG}1`, isActive: true, approvalStatus: 'approved' } });
  const B = await prisma.member.create({ data: { name: `${TAG}B`, phone: `${TAG}2`, isActive: true, approvalStatus: 'approved' } });
  const C = await prisma.member.create({ data: { name: `${TAG}C`, phone: `${TAG}3`, isActive: true, approvalStatus: 'approved' } });

  const booking = await prisma.booking.create({
    data: {
      title: `${TAG}라운딩`, type: '정기모임', courseName: `${TAG}골프장`, date: '2099-12-31', time: '07:00',
      greenFee: 63, cartFee: 20, membershipFee: 30, maxMembers: 2, participants: [], organizerId: admin.id,
    },
  });

  console.log('\n[1] 투표 생성');
  let r = await call('POST', '/polls', admin.id, {
    bookingId: booking.id,
    title: '테스트 정모 참석',
    options: [
      { label: '참석 (컴피티션)', kind: 'attend', fee: null },
      { label: '참석 (소셜)', kind: 'attend', fee: 83 },
      { label: '불참', kind: 'absent' },
    ],
    closesAt: '2099-12-30T10:00:00.000Z',
  });
  check('생성 성공', r.status === 200, JSON.stringify(r.data));
  const poll = r.data;
  check('선택지 3개 (불참 자동 포함)', poll?.options?.length === 3);
  check('불참이 맨 아래', poll?.options?.[2]?.kind === 'absent');
  const KEY_COMP = poll.options[0].key, KEY_SOCIAL = poll.options[1].key, KEY_ABSENT = poll.options[2].key;

  const bk = await prisma.booking.findUnique({ where: { id: booking.id } });
  check('투표 마감이 참가신청 마감으로 복사됨', !!bk.registrationDeadline, bk.registrationDeadline);

  console.log('\n[2] 중복 투표 생성 차단');
  r = await call('POST', '/polls', admin.id, { bookingId: booking.id, title: 'x', options: [{ label: '참석', kind: 'attend' }] });
  check('같은 라운딩에 두 번째 투표 거부', r.status === 400);

  console.log('\n[3] 일반 회원이 투표 생성 시도');
  r = await call('POST', '/polls', A.id, { bookingId: booking.id, title: 'x', options: [{ label: '참석', kind: 'attend' }] });
  check('권한 없음 차단', r.status === 403);

  console.log('\n[4] A가 "참석(컴피티션)" 투표 → 기본 금액 $113 청구');
  r = await call('POST', `/polls/${poll.id}/vote`, A.id, { optionKey: KEY_COMP });
  check('투표 성공', r.status === 200, JSON.stringify(r.data));
  check('참가자 명단 1명', await participantCount(booking.id) === 1);
  check('청구 $113', await chargeSum(A.id, booking.id) === 113, String(await chargeSum(A.id, booking.id)));
  check('컴피티션 1명으로 집계', r.data?.options?.[0]?.count === 1);
  check('내 투표 표시', r.data?.myVote === KEY_COMP);

  console.log('\n[5] A가 "참석(소셜)"로 변경 → $83으로 재청구');
  r = await call('POST', `/polls/${poll.id}/vote`, A.id, { optionKey: KEY_SOCIAL });
  check('변경 성공', r.status === 200, JSON.stringify(r.data));
  check('청구 $83으로 교체', await chargeSum(A.id, booking.id) === 83, String(await chargeSum(A.id, booking.id)));
  check('참가자 여전히 1명(중복 추가 없음)', await participantCount(booking.id) === 1);
  check('컴피티션 0명 / 소셜 1명', r.data?.options?.[0]?.count === 0 && r.data?.options?.[1]?.count === 1);

  console.log('\n[6] A가 "불참"으로 변경 → 안 낸 상태라 청구 조용히 삭제');
  r = await call('POST', `/polls/${poll.id}/vote`, A.id, { optionKey: KEY_ABSENT });
  check('변경 성공', r.status === 200, JSON.stringify(r.data));
  check('참가자 0명', await participantCount(booking.id) === 0);
  check('청구 사라짐', await chargeSum(A.id, booking.id) === 0);
  check('정산 대기 안 생김', (await prisma.roundCancellation.count({ where: { bookingId: booking.id, memberId: A.id } })) === 0);
  check('A 잔액 0', (await prisma.member.findUnique({ where: { id: A.id } })).balance === 0);
  check('불참 1명', r.data?.options?.[2]?.count === 1);

  console.log('\n[7] B가 참석 후 입금까지 한 뒤 불참 → 정산 대기로 넘어감');
  await call('POST', `/polls/${poll.id}/vote`, B.id, { optionKey: KEY_COMP });
  check('B 청구 $113', await chargeSum(B.id, booking.id) === 113);
  await prisma.transaction.create({ data: { type: 'payment', amount: 113, description: '회비납부', category: '회비납부', date: '2099-01-01', memberId: B.id } });
  const { recalculateAndUpdateBalance } = require('../server/utils/balance');
  await recalculateAndUpdateBalance(B.id);
  check('납부 후 잔액 0', (await prisma.member.findUnique({ where: { id: B.id } })).balance === 0);

  r = await call('POST', `/polls/${poll.id}/vote`, B.id, { optionKey: KEY_ABSENT });
  check('불참 처리 성공', r.status === 200, JSON.stringify(r.data));
  check('청구는 그대로 유지', await chargeSum(B.id, booking.id) === 113);
  const rc = await prisma.roundCancellation.findFirst({ where: { bookingId: booking.id, memberId: B.id } });
  check('정산 대기 생성됨', !!rc && rc.status === 'pending');
  check('B 잔액 여전히 0 (유령 크레딧 없음)', (await prisma.member.findUnique({ where: { id: B.id } })).balance === 0);

  console.log('\n[8] 납부한 사람이 참석 선택지를 바꾸려 하면 차단');
  await call('POST', `/polls/${poll.id}/vote`, B.id, { optionKey: KEY_COMP });
  r = await call('POST', `/polls/${poll.id}/vote`, B.id, { optionKey: KEY_SOCIAL });
  check('금액 다른 선택지로 변경 거부', r.status === 400, JSON.stringify(r.data));
  check('청구 그대로 $113', await chargeSum(B.id, booking.id) === 113);

  console.log('\n[9] 정원 마감 (정원 2명)');
  await call('POST', `/polls/${poll.id}/vote`, A.id, { optionKey: KEY_COMP }); // 1명 → B 포함 2명
  check('현재 2명', await participantCount(booking.id) === 2, String(await participantCount(booking.id)));
  r = await call('POST', `/polls/${poll.id}/vote`, C.id, { optionKey: KEY_COMP });
  check('3번째 참석 차단', r.status === 400 && String(r.data?.error).includes('정원'), JSON.stringify(r.data));
  check('C에게 청구 안 생김', await chargeSum(C.id, booking.id) === 0);
  r = await call('POST', `/polls/${poll.id}/vote`, C.id, { optionKey: KEY_ABSENT });
  check('정원 찼어도 불참 투표는 가능', r.status === 200);

  console.log('\n[10] 미투표자 집계');
  r = await call('GET', `/polls/${poll.id}`, admin.id);
  const notVotedIds = (r.data?.notVoted || []).map(m => m.id);
  check('admin은 아직 미투표', notVotedIds.includes(admin.id));
  check('A/B/C는 미투표 목록에 없음', !notVotedIds.includes(A.id) && !notVotedIds.includes(B.id) && !notVotedIds.includes(C.id));

  console.log('\n[11] 투표 종료');
  r = await call('POST', `/polls/${poll.id}/close`, admin.id);
  check('종료 성공', r.status === 200 && r.data?.isClosed === true);
  r = await call('POST', `/polls/${poll.id}/vote`, C.id, { optionKey: KEY_COMP });
  check('종료 후 투표 차단', r.status === 400 && String(r.data?.error).includes('종료'));
  r = await call('GET', '/polls/active', admin.id);
  check('종료된 투표는 홈에 안 뜸', r.data === null, JSON.stringify(r.data));

  console.log('\n[12] 재개 후 다시 뜸');
  await call('POST', `/polls/${poll.id}/reopen`, admin.id);
  r = await call('GET', '/polls/active', admin.id);
  check('재개 시 홈에 다시 뜸', r.data?.id === poll.id);

  console.log('\n[13] 마감 시간이 지난 투표는 자동으로 닫힘');
  await prisma.attendancePoll.update({ where: { id: poll.id }, data: { closesAt: new Date('2000-01-01') } });
  r = await call('GET', `/polls/${poll.id}`, admin.id);
  check('isClosed true', r.data?.isClosed === true);
  r = await call('POST', `/polls/${poll.id}/vote`, C.id, { optionKey: KEY_COMP });
  check('마감 후 투표 차단', r.status === 400);

  // ── 정리 ──────────────────────────────────────────────────────────────────
  console.log('\n[정리] 임시 데이터 삭제');
  const ids = [admin.id, A.id, B.id, C.id];
  await prisma.attendanceVote.deleteMany({ where: { pollId: poll.id } });
  await prisma.attendancePoll.deleteMany({ where: { bookingId: booking.id } });
  await prisma.roundCancellation.deleteMany({ where: { bookingId: booking.id } });
  await prisma.transaction.deleteMany({ where: { memberId: { in: ids } } });
  await prisma.booking.delete({ where: { id: booking.id } });
  await prisma.member.deleteMany({ where: { id: { in: ids } } });

  const leftM = await prisma.member.count({ where: { name: { startsWith: TAG } } });
  const leftB = await prisma.booking.count({ where: { title: { startsWith: TAG } } });
  const leftT = await prisma.transaction.count({ where: { memberId: { in: ids } } });
  check('임시 회원 남음 0', leftM === 0);
  check('임시 라운딩 남음 0', leftB === 0);
  check('임시 거래 남음 0', leftT === 0);

  console.log(`\n결과: 통과 ${pass} / 실패 ${fail}`);
  server.close();
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
})().catch(async (e) => {
  console.error('\n테스트 중단:', e);
  try { server?.close(); } catch {}
  await prisma.$disconnect();
  process.exit(1);
});
