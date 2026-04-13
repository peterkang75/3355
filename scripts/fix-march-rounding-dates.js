/**
 * 일회성 수정: "3월 정기라운딩" charge/payment 날짜를 부킹 날짜(2026-03-29)로 수정
 *
 * 문제: 참가비 자동 청구가 부킹 날짜가 아닌 등록일(2026-02-26) 기준으로 생성됨
 *       → 3월 라운딩 청구/납부가 2월 수입·지출로 잡힘
 *
 * 수정: 해당 부킹의 charge + payment 날짜를 모두 2026-03-29로 변경
 *
 * 실행:
 *   1) 미리 보기:  node scripts/fix-march-rounding-dates.js
 *   2) 실제 적용:  node scripts/fix-march-rounding-dates.js --apply
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BOOKING_ID   = 'cmm3cg9u40005ozv4py026xp8'; // 3월 정기라운딩
const TARGET_DATE  = '2026-03-29';                  // 부킹 날짜
const DRY_RUN      = !process.argv.includes('--apply');

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (실제 변경 없음) ===' : '=== APPLY MODE (실제 DB 수정) ===');
  console.log(`대상 부킹: 3월 정기라운딩 (${BOOKING_ID})`);
  console.log(`변경 날짜: → ${TARGET_DATE}\n`);

  // 대상 거래 조회 (charge + payment)
  const txs = await prisma.transaction.findMany({
    where: {
      bookingId: BOOKING_ID,
      type: { in: ['charge', 'payment'] },
    },
    select: {
      id: true,
      type: true,
      date: true,
      amount: true,
      description: true,
      member: { select: { name: true, nickname: true } },
    },
    orderBy: [{ type: 'asc' }, { date: 'asc' }],
  });

  const toUpdate = txs.filter(t => t.date !== TARGET_DATE);
  const alreadyOk = txs.filter(t => t.date === TARGET_DATE);

  console.log(`전체 대상 거래: ${txs.length}건`);
  console.log(`이미 정상: ${alreadyOk.length}건`);
  console.log(`수정 필요: ${toUpdate.length}건\n`);

  if (toUpdate.length === 0) {
    console.log('수정이 필요한 거래가 없습니다.');
    return;
  }

  console.log('타입    | 현재날짜       | 변경날짜     | 금액    | 회원');
  console.log('-'.repeat(65));
  for (const t of toUpdate) {
    const name = (t.member?.nickname || t.member?.name || '?').padEnd(12);
    const type = t.type.padEnd(7);
    console.log(`${type} | ${t.date} | ${TARGET_DATE} | $${t.amount.toString().padStart(5)} | ${name}`);
  }

  const totalAmount = toUpdate.reduce((s, t) => s + t.amount, 0);
  console.log(`\n합계: $${totalAmount}`);

  if (DRY_RUN) {
    console.log('\n--apply 플래그를 추가하면 실제로 적용됩니다:');
    console.log('  node scripts/fix-march-rounding-dates.js --apply');
  } else {
    console.log('\n적용 중...');
    await prisma.transaction.updateMany({
      where: {
        id: { in: toUpdate.map(t => t.id) },
      },
      data: { date: TARGET_DATE },
    });
    console.log(`✓ ${toUpdate.length}건 날짜를 ${TARGET_DATE}로 수정 완료`);
    console.log('\n서버를 재시작하면 3월 정산에 정상 반영됩니다.');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
