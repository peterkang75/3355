/**
 * 일회성 수정 스크립트: 납부(payment) 거래의 날짜를 청구(charge) 날짜로 맞추기
 *
 * 문제: mark-as-paid가 처리일(today)을 날짜로 저장해서,
 *       3월 라운딩 청구를 2월에 납부 처리하면 2월 수입으로 잡힘
 *
 * 수정: 동일 booking + 동일 member의 charge 날짜로 payment 날짜를 업데이트
 *
 * 실행: node scripts/fix-payment-dates.js
 *       (dry-run 먼저 확인 후 --apply 플래그로 실제 적용)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = !process.argv.includes('--apply');

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (실제 변경 없음) ===' : '=== APPLY MODE (실제 DB 수정) ===');
  console.log('');

  // booking에 연결된 모든 payment 거래 조회
  const payments = await prisma.transaction.findMany({
    where: {
      type: 'payment',
      bookingId: { not: null },
    },
    select: {
      id: true,
      date: true,
      amount: true,
      memberId: true,
      bookingId: true,
      description: true,
      member: { select: { name: true, nickname: true } },
    },
  });

  console.log(`booking 연결 payment 거래: ${payments.length}건`);

  const toFix = [];

  for (const payment of payments) {
    // 같은 booking + 같은 member의 charge 찾기
    const charge = await prisma.transaction.findFirst({
      where: {
        type: 'charge',
        bookingId: payment.bookingId,
        memberId: payment.memberId,
      },
      select: { id: true, date: true },
    });

    if (!charge) continue;

    // 날짜가 다른 경우만 수정 대상
    if (payment.date !== charge.date) {
      toFix.push({
        paymentId: payment.id,
        memberName: payment.member?.nickname || payment.member?.name,
        oldDate: payment.date,
        newDate: charge.date,
        amount: payment.amount,
        description: payment.description,
      });
    }
  }

  if (toFix.length === 0) {
    console.log('수정이 필요한 거래가 없습니다.');
    return;
  }

  console.log(`\n날짜 불일치 거래: ${toFix.length}건`);
  console.log('');
  console.log('회원          | 현재날짜       | 변경날짜       | 금액    | 항목');
  console.log('-'.repeat(80));
  for (const item of toFix) {
    const name = (item.memberName || '?').padEnd(12);
    console.log(`${name} | ${item.oldDate} | ${item.newDate} | $${item.amount.toString().padStart(5)} | ${item.description || ''}`);
  }

  if (DRY_RUN) {
    console.log('\n--apply 플래그를 추가하면 실제로 적용됩니다:');
    console.log('  node scripts/fix-payment-dates.js --apply');
  } else {
    console.log('\n적용 중...');
    let fixed = 0;
    for (const item of toFix) {
      await prisma.transaction.update({
        where: { id: item.paymentId },
        data: { date: item.newDate },
      });
      fixed++;
    }
    console.log(`\n✓ ${fixed}건 수정 완료`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
