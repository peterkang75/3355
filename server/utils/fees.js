// server/utils/fees.js
// 게스트 참가비 계산 - 단일 소스
// 게스트도 회원과 동일하게 그린피 + 카트비 + 회비(멤버십피)를 부담한다.
// 회원용 면제 규칙(골프장 멤버 면제 / isFeeExempt)은 게스트에게 적용되지 않는다.

/**
 * @param {{greenFee?: number, cartFee?: number, membershipFee?: number}} booking
 * @returns {number} 게스트 1인 청구 금액
 */
function computeGuestChargeForBooking(booking) {
  return (booking.greenFee || 0) + (booking.cartFee || 0) + (booking.membershipFee || 0);
}

module.exports = { computeGuestChargeForBooking };
