// server/utils/participation.js
// 라운딩 참가/취소 + 그에 딸린 청구 처리 — 단일 소스.
//
// 원래 bookings.js 안에만 있던 함수들이다. 참석 투표(AttendancePoll)가
// 같은 동작을 해야 해서 여기로 옮겼다. 청구를 만드는 경로가 두 벌이 되면
// 반드시 어긋난다(이 앱은 "빠른 입력"이 두 군데 중복 구현돼 이미 한 번 겪었다).

const prisma = require('../db');
const { calculateBalance, recalculateAndUpdateBalance } = require('./balance');

const parseParticipant = (p) => {
  try { return typeof p === 'string' ? JSON.parse(p) : p; } catch { return p; }
};

// 회원·라운딩 조합에 대한 청구 금액 계산
// - isFeeExempt(회원 참가비 면제) 우선 적용
// - 그 외에는 라운딩의 항목별 "골프장 멤버 면제" 토글로 항목 차감
//   (member.club === booking.courseName 인 회원만 대상)
// - feeOverride: 참석 투표 선택지가 금액을 직접 지정한 경우 그 금액을 쓴다.
//   (컴피티션/소셜처럼 같은 라운딩 안에서 참가비가 갈리는 경우)
//   면제 회원은 override가 있어도 0원이다.
function computeMemberChargeForBooking(member, booking, feeOverride = null) {
  const isClubMember = !!(member.club && booking.courseName && member.club === booking.courseName);
  const isFeeExempt = !!member.isFeeExempt;

  if (feeOverride !== null && feeOverride !== undefined && feeOverride !== '') {
    const amount = Number(feeOverride);
    if (!Number.isNaN(amount) && amount >= 0) {
      return {
        total: isFeeExempt ? 0 : amount,
        isFeeExempt,
        isClubMember,
        waivedItems: [],
        overridden: true,
      };
    }
  }

  const waivedItems = [];
  const green = (isClubMember && booking.waiveGreenFeeForClubMembers)
    ? (waivedItems.push('그린피'), 0)
    : (booking.greenFee || 0);
  const cart = (isClubMember && booking.waiveCartFeeForClubMembers)
    ? (waivedItems.push('카트비'), 0)
    : (booking.cartFee || 0);

  let membership;
  if (isFeeExempt) {
    membership = 0;
  } else if (isClubMember && booking.waiveMembershipFeeForClubMembers) {
    waivedItems.push('참가비');
    membership = 0;
  } else {
    membership = booking.membershipFee || 0;
  }

  return { total: green + cart + membership, isFeeExempt, isClubMember, waivedItems, overridden: false };
}

function buildBaseDescription(booking, info, optionLabel = null) {
  const title = booking.title || booking.courseName;
  if (info.isFeeExempt) return `${title} 라운딩 (참가비 면제)`;
  if (optionLabel) return `${title} 라운딩 (${optionLabel})`;
  if (info.waivedItems.length > 0) return `${title} 라운딩 (클럽 멤버: ${info.waivedItems.join('·')} 면제)`;
  return `${title} 라운딩`;
}

// 회원 1명에게 라운딩 charge를 발행 (크레딧 자동 차감 포함)
// 중복(이미 같은 booking에 charge/expense 존재 시)은 호출 측에서 사전 확인
async function issueRoundingChargeForMember(member, booking, opts = {}) {
  const { feeOverride = null, optionLabel = null } = opts;
  const info = computeMemberChargeForBooking(member, booking, feeOverride);
  const totalAmount = info.total;
  if (totalAmount <= 0) return { created: false, reason: 'zero-total' };

  const memberTxs = await prisma.transaction.findMany({ where: { memberId: member.id } });
  const currentBalance = calculateBalance(memberTxs);
  const creditBalance = currentBalance > 0 ? currentBalance : 0;
  const creditToUse = Math.min(creditBalance, totalAmount);
  const remainingCharge = totalAmount - creditToUse;
  const today = new Date().toISOString().split('T')[0];
  const baseDescription = buildBaseDescription(booking, info, optionLabel);

  await prisma.$transaction(async (tx) => {
    if (creditToUse > 0) {
      await tx.transaction.create({ data: { type: 'expense', amount: creditToUse, description: `${baseDescription} (크레딧 자동 차감)`, category: '크레딧 자동 차감', date: today, memberId: member.id, bookingId: booking.id } });
      await tx.transaction.create({ data: { type: 'payment', amount: creditToUse, description: `${baseDescription} (크레딧 자동 차감)`, category: '크레딧 자동 차감', date: today, memberId: member.id, bookingId: booking.id } });
    }
    if (remainingCharge > 0) {
      await tx.transaction.create({ data: { type: 'charge', amount: remainingCharge, description: creditToUse > 0 ? `${baseDescription} (크레딧 $${creditToUse} 사용 후 잔액)` : baseDescription, date: today, memberId: member.id, bookingId: booking.id } });
    }
  });
  await recalculateAndUpdateBalance(member.id);
  return { created: true, totalAmount, creditToUse, remainingCharge };
}

// 조편성에서 해당 전화번호의 자리를 비운다.
// 예전에는 참가자 제거 경로마다 teams 정리 여부가 제각각이라(참가자관리 화면만 정리) 유령이 남았고,
// 그 유령이 Play 관문의 "배정 인원 수"를 부풀려 실제 미배정자가 있어도 통과시켰다.
function clearTeamSlot(teams, phone) {
  if (!teams) return { value: teams, changed: false };

  const wasString = typeof teams === 'string';
  let parsed = teams;
  if (wasString) {
    try { parsed = JSON.parse(teams); } catch { return { value: teams, changed: false }; }
  }
  if (!Array.isArray(parsed)) return { value: teams, changed: false };

  let changed = false;
  const next = parsed.map(team => ({
    ...team,
    members: (team.members || []).map(m => {
      if (m && m.phone === phone) { changed = true; return null; }
      return m;
    }),
  }));

  if (!changed) return { value: teams, changed: false };
  return { value: wasString ? JSON.stringify(next) : next, changed: true };
}

// 참가 취소 시 회계 처리 — 아무것도 지우지 않고 "정산 대기"로만 남긴다.
//
// 예전에는 여기서 charge와 크레딧 자동차감 쌍을 삭제했다. 그런데 이미 납부한 회원이
// 취소하면 payment만 남아 잔액이 +로 뒤집히고(유령 크레딧), 실제로는 환불해야 할 돈이
// 화면에서 사라졌다. payment에 bookingId가 없어 "이 청구를 냈는지"를 시스템이 판정할
// 방법이 없고(회원 전체 잔액으로 추론하면 미납 여러 건이거나 기존 크레딧 보유 시 오판),
// 취소는 회원 본인도 할 수 있어 환불 결정 주체가 될 수 없다.
// 그래서 판단은 전부 총무에게 넘기고 여기서는 대기 항목만 만든다.
async function recordParticipationCancelled(booking, member, cancelledBy) {
  const related = await prisma.transaction.findMany({
    where: { memberId: member.id, bookingId: booking.id },
    select: { type: true, amount: true },
  });

  // 청구도 납부도 없으면 정산할 것이 없다 (참가비 면제 등)
  if (related.length === 0) return null;

  const chargeAmount = related
    .filter(t => t.type === 'charge')
    .reduce((sum, t) => sum + t.amount, 0);

  return prisma.roundCancellation.upsert({
    where: { bookingId_memberId: { bookingId: booking.id, memberId: member.id } },
    create: {
      bookingId: booking.id,
      memberId: member.id,
      status: 'pending',
      chargeAmount,
      chargeKept: true,
      cancelledBy: cancelledBy || null,
    },
    update: {
      status: 'pending',
      chargeAmount,
      chargeKept: true,
      cancelledAt: new Date(),
      cancelledBy: cancelledBy || null,
      settledAt: null,
      settledBy: null,
    },
  });
}

// 참가 취소 공통 처리: 정산 대기 등록 + 조편성 자리 비우기.
// 거래(청구·납부)는 절대 건드리지 않는다.
async function handleParticipantRemoval(booking, member, cancelledBy) {
  await recordParticipationCancelled(booking, member, cancelledBy);

  const current = await prisma.booking.findUnique({
    where: { id: booking.id },
    select: { teams: true },
  });
  const { value, changed } = clearTeamSlot(current?.teams, member.phone);
  if (changed) {
    await prisma.booking.update({ where: { id: booking.id }, data: { teams: value } });
  }
}

// 라운딩 생성 시 초기 participants에 대한 charge 일괄 발행
async function chargeInitialParticipants(booking) {
  const list = (booking.participants || []).map(p => {
    try { return typeof p === 'string' ? JSON.parse(p) : p; } catch { return null; }
  }).filter(Boolean);
  for (const p of list) {
    if (!p.phone) continue;
    const member = await prisma.member.findFirst({ where: { phone: p.phone } });
    if (!member) continue; // 게스트 등 비회원은 별도 게스트 라우트에서 처리
    const existing = await prisma.transaction.findFirst({
      where: { memberId: member.id, bookingId: booking.id, type: { in: ['charge', 'expense'] } },
    });
    if (existing) continue;
    try { await issueRoundingChargeForMember(member, booking); } catch (e) { console.error('charge 발행 실패', member.id, e.message); }
  }
}

// ── 참석 투표에서 쓰는 "이 청구를 확실히 안 냈는가" 판정 ────────────────────
//
// 투표는 마음을 가볍게 바꾼다. 아직 한 푼도 안 낸 사람이 참석→불참으로 바꿀 때마다
// 총무의 "정산 대기"에 항목이 쌓이면 목록이 금방 쓸모없어진다.
// 그래서 "이 청구를 지워도 여전히 미납"인 경우(= 확실히 안 낸 경우)에만 조용히 지운다.
// 이 안전 규칙은 취소↔환불 분리 설계 때 정해둔 것과 같다. 추론이 아니라 실제 거래 행 산술.
async function canQuietlyDropCharge(booking, member) {
  const related = await prisma.transaction.findMany({
    where: { memberId: member.id, bookingId: booking.id },
    select: { id: true, type: true, amount: true, category: true },
  });
  if (related.length === 0) return { ok: true, related: [] };

  // 크레딧으로 결제된 몫이 있으면 돈이 이미 움직인 것 → 총무 판단으로 넘긴다
  const paidByCredit = related.some(t => t.type === 'payment' && t.category === '크레딧 자동 차감');
  if (paidByCredit) return { ok: false, related };

  const chargeTotal = related.filter(t => t.type === 'charge').reduce((s, t) => s + t.amount, 0);
  if (chargeTotal === 0) return { ok: true, related };

  const memberTxs = await prisma.transaction.findMany({ where: { memberId: member.id } });
  const balance = calculateBalance(memberTxs);

  // 청구를 지워도 잔액이 여전히 0 이하 = 이 청구에 해당하는 돈을 낸 적이 없다
  return { ok: balance + chargeTotal <= 0, related };
}

// 참가 취소 — 아직 아무것도 안 낸 경우엔 청구만 조용히 지우고,
// 돈이 오간 흔적이 있으면 기존대로 정산 대기로 넘긴다.
async function cancelParticipationForPoll(booking, member, cancelledBy) {
  const { ok, related } = await canQuietlyDropCharge(booking, member);

  if (ok && related.length > 0) {
    // charge만 지운다. (여기까지 왔다는 건 납부도 크레딧 결제도 없다는 뜻)
    await prisma.transaction.deleteMany({
      where: { memberId: member.id, bookingId: booking.id, type: 'charge' },
    });
    await prisma.roundCancellation.deleteMany({
      where: { bookingId: booking.id, memberId: member.id, status: 'pending' },
    });
    await recalculateAndUpdateBalance(member.id);

    const current = await prisma.booking.findUnique({ where: { id: booking.id }, select: { teams: true } });
    const { value, changed } = clearTeamSlot(current?.teams, member.phone);
    if (changed) await prisma.booking.update({ where: { id: booking.id }, data: { teams: value } });

    return { quiet: true };
  }

  await handleParticipantRemoval(booking, member, cancelledBy);
  return { quiet: false };
}

module.exports = {
  parseParticipant,
  computeMemberChargeForBooking,
  buildBaseDescription,
  issueRoundingChargeForMember,
  clearTeamSlot,
  recordParticipationCancelled,
  handleParticipantRemoval,
  chargeInitialParticipants,
  canQuietlyDropCharge,
  cancelParticipationForPoll,
};
