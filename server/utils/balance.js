// server/utils/balance.js
// 회원 잔액 계산 - 단일 소스 (Single Source of Truth)
// 모든 잔액 계산은 반드시 이 함수를 통해서만 이루어져야 합니다.

const prisma = require('../db');

/**
 * 트랜잭션 배열로부터 회원 잔액을 계산합니다.
 * 
 * 잔액 = payment(일반) + credit - charge - expense - creditDonation
 * 
 * payment 중 아래 카테고리는 클럽 장부용이므로 개인 잔액에서 제외:
 * - "크레딧 자동 납부"
 * - "크레딧 납부"  
 * - "크레딧 자동 차감"
 * 
 * @param {Array} transactions - 트랜잭션 배열 (type, amount, category 필드 필요)
 * @returns {number} 계산된 잔액
 */
function calculateBalance(transactions) {
  if (!transactions || !Array.isArray(transactions)) return 0;

  const EXCLUDED_PAYMENT_CATEGORIES = [
    '크레딧 자동 납부',
    '크레딧 납부',
    '크레딧 자동 차감',
  ];

  // 회원 잔액에 영향을 미치지 않는 expense 카테고리
  // 환불: 클럽이 회원에게 돈을 돌려준 것 → 회원 빚 발생 X (납부와 상쇄되어 0)
  const EXCLUDED_EXPENSE_CATEGORIES = ['환불'];

  return transactions.reduce((sum, t) => {
    switch (t.type) {
      case 'charge':
        return sum - t.amount;
      case 'payment':
        if (EXCLUDED_PAYMENT_CATEGORIES.includes(t.category)) return sum;
        return sum + t.amount;
      case 'credit':
        return sum + t.amount;
      case 'expense':
        if (EXCLUDED_EXPENSE_CATEGORIES.includes(t.category)) return sum;
        return sum - t.amount;
      case 'creditDonation':
        return sum - t.amount;
      default:
        return sum;
    }
  }, 0);
}

/**
 * 특정 회원의 잔액을 DB 트랜잭션 전체 기반으로 재계산하고 Member.balance를 갱신합니다.
 * 
 * @param {string} memberId - 회원 ID
 * @returns {number} 갱신된 잔액
 */
async function recalculateAndUpdateBalance(memberId) {
  if (!memberId) return 0;

  const transactions = await prisma.transaction.findMany({
    where: { memberId },
    select: { type: true, amount: true, category: true },
  });

  const balance = calculateBalance(transactions);

  await prisma.member.update({
    where: { id: memberId },
    data: { balance },
  });

  return balance;
}

/**
 * 전체 회원의 잔액을 일괄 재계산. 트랜잭션 변경 없이 잔액만 재산출.
 * (환불 카테고리 제외 로직 변경 후 기존 데이터 정정용 — idempotent)
 *
 * @returns {{updated: number, unchanged: number, errors: number}}
 */
async function recalculateAllBalances() {
  const members = await prisma.member.findMany({ select: { id: true, balance: true } });
  let updated = 0, unchanged = 0, errors = 0;

  for (const m of members) {
    try {
      const transactions = await prisma.transaction.findMany({
        where: { memberId: m.id },
        select: { type: true, amount: true, category: true },
      });
      const newBalance = calculateBalance(transactions);
      if (newBalance !== m.balance) {
        await prisma.member.update({ where: { id: m.id }, data: { balance: newBalance } });
        updated++;
      } else {
        unchanged++;
      }
    } catch (err) {
      console.error(`잔액 재계산 실패: memberId=${m.id}`, err);
      errors++;
    }
  }

  return { updated, unchanged, errors };
}

module.exports = { calculateBalance, recalculateAndUpdateBalance, recalculateAllBalances };