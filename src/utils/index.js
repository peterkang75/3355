// ─── Participants ────────────────────────────────────────────────────────────

/**
 * participants 배열의 각 항목을 파싱 (이중 JSON 문자열 포함 처리)
 */
export const parseParticipants = (participants) => {
  if (!participants || !Array.isArray(participants)) return [];
  return participants.map(p => {
    try {
      let result = typeof p === 'string' ? JSON.parse(p) : p;
      if (typeof result === 'string') result = JSON.parse(result);
      return result;
    } catch {
      return p;
    }
  });
};

// ─── Handicap ────────────────────────────────────────────────────────────────

/**
 * 핸디캡·네트 스코어를 소수점 첫째 자리로 정규화.
 * 핸디캡은 18.4처럼 소수로 등록되므로 반올림하면 순위가 어긋난다.
 * 그냥 빼기만 하면 부동소수점 잔재(예: 27.799999999999997)가 화면에 노출되므로
 * 계산 결과는 항상 이 함수를 거친다.
 */
export const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

// ─── Currency ────────────────────────────────────────────────────────────────

/**
 * 금액을 호주 달러 형식으로 포맷 (예: $10,000)
 */
export const formatCurrency = (amount) => {
  if (amount == null || amount === '') return '$0';
  return `$${parseInt(amount).toLocaleString('en-AU')}`;
};

// ─── Date ────────────────────────────────────────────────────────────────────

/**
 * 날짜를 한국어 형식으로 포맷 (예: 2026. 4. 9.)
 */
export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('ko-KR');
};

/**
 * 날짜 + 시간 포맷 (예: 2026. 4. 9. 오후 3:30)
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
};

// ─── Role ─────────────────────────────────────────────────────────────────────

const ADMIN_ROLES = ['관리자', '방장'];
const OPERATOR_ROLES = ['관리자', '방장', '운영진', '클럽운영진'];

/** 관리자 여부 (순수 함수 — hook 없이 사용 가능) */
export const checkIsAdmin = (user) =>
  !!(user?.isAdmin || ADMIN_ROLES.includes(user?.role));

/** 운영진 이상 여부 */
export const checkIsOperator = (user) =>
  !!(user?.isAdmin || OPERATOR_ROLES.includes(user?.role));

/** 일반 회원 여부 */
export const checkIsMember = (user) => user?.role === '회원';

// ─── Balance ─────────────────────────────────────────────────────────────────
// 백엔드 server/utils/balance.js의 calculateBalance와 동일한 로직 (single source of truth)
// 잔액 영향에서 제외되는 카테고리:
//   payment: 크레딧 자동 납부 / 크레딧 납부 / 크레딧 자동 차감
//   expense: 환불 (클럽이 회원에게 돌려준 돈 — 회원 빚 발생 X)
const EXCLUDED_PAYMENT_CATEGORIES = ['크레딧 자동 납부', '크레딧 납부', '크레딧 자동 차감'];
const EXCLUDED_EXPENSE_CATEGORIES = ['환불'];

/** 트랜잭션 배열로부터 회원 잔액 계산 (백엔드와 동일 공식) */
export function calculateBalance(transactions) {
  if (!Array.isArray(transactions)) return 0;
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

/** 게시글 관리 권한: 작성자 본인 + 관리자 */
export const canManagePost = (user, post) => {
  if (!user || !post) return false;
  if (post.authorId && user.id === post.authorId) return true;
  return checkIsAdmin(user);
};

/** 댓글 관리 권한: 댓글 작성자 본인 + 관리자
 *  authorId 없는 기존 댓글은 관리자만 관리 가능 */
export const canManageComment = (user, comment) => {
  if (!user || !comment) return false;
  if (comment.authorId && user.id === comment.authorId) return true;
  return checkIsAdmin(user);
};
