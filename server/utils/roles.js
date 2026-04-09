// 역할 상수
const ROLES = {
  ADMIN: '관리자',
  BANGJANG: '방장',
  OPERATOR: '운영진',
  CLUB_OPERATOR: '클럽운영진',
  MEMBER: '회원',
};

// 역할 계층 (숫자가 클수록 권한 높음)
const ROLE_LEVEL = {
  [ROLES.MEMBER]: 1,
  [ROLES.CLUB_OPERATOR]: 2,
  [ROLES.OPERATOR]: 3,
  [ROLES.BANGJANG]: 4,
  [ROLES.ADMIN]: 5,
};

// 운영진 이상 역할 목록
const OPERATOR_ROLES = [ROLES.ADMIN, ROLES.BANGJANG, ROLES.OPERATOR, ROLES.CLUB_OPERATOR];

// 최고 관리자 역할 목록
const ADMIN_ROLES = [ROLES.ADMIN, ROLES.BANGJANG];

/**
 * 운영진 이상 여부 (관리자, 방장, 운영진, 클럽운영진)
 */
function isOperator(member) {
  return member && OPERATOR_ROLES.includes(member.role);
}

/**
 * 최고 관리자 여부 (관리자, 방장)
 */
function isAdmin(member) {
  return member && ADMIN_ROLES.includes(member.role);
}

/**
 * 두 역할의 레벨 비교. a가 b보다 높으면 true
 */
function hasHigherRole(roleA, roleB) {
  return (ROLE_LEVEL[roleA] || 0) > (ROLE_LEVEL[roleB] || 0);
}

/**
 * 본인이거나 운영진 이상인지 확인
 * (자신의 데이터는 수정 가능, 타인 데이터는 운영진 이상만)
 */
function isSelfOrOperator(requestingMember, targetMemberId) {
  if (!requestingMember) return false;
  if (requestingMember.id === targetMemberId) return true;
  return isOperator(requestingMember);
}

module.exports = { ROLES, ROLE_LEVEL, OPERATOR_ROLES, ADMIN_ROLES, isOperator, isAdmin, hasHigherRole, isSelfOrOperator };
