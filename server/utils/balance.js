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

module.exports = { calculateBalance, recalculateAndUpdateBalance };