const prisma = require('../db');
const { isOperator, isAdmin } = require('../utils/roles');

// 로그인한 회원이면 통과 (active + approved)
async function requireAuth(req, res, next) {
  try {
    const memberId = req.headers['x-member-id'];

    if (!memberId) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, isAdmin: true, role: true, isActive: true, approvalStatus: true },
    });

    if (!member || !member.isActive || member.approvalStatus !== 'approved') {
      return res.status(401).json({ error: '유효하지 않은 회원입니다.' });
    }

    req.member = member;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: '인증 처리 중 오류가 발생했습니다.' });
  }
}

// 일반 회원 또는 게스트 모두 허용 (스코어 저장 등 게스트 참여 기능용)
async function requireAuthOrGuest(req, res, next) {
  try {
    const memberId = req.headers['x-member-id'];

    if (!memberId) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, isAdmin: true, role: true, isActive: true, approvalStatus: true, isGuest: true },
    });

    if (!member) {
      return res.status(401).json({ error: '유효하지 않은 회원입니다.' });
    }

    // 일반 회원: isActive + approved
    // 게스트: approvalStatus === 'guest'
    const isRegularMember = member.isActive && member.approvalStatus === 'approved';
    const isGuestMember = member.isGuest && member.approvalStatus === 'guest';

    if (!isRegularMember && !isGuestMember) {
      return res.status(401).json({ error: '유효하지 않은 회원입니다.' });
    }

    req.member = member;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: '인증 처리 중 오류가 발생했습니다.' });
  }
}

// 운영진 이상 (관리자, 방장, 운영진, 클럽운영진)
function requireOperator(req, res, next) {
  if (!req.member) return res.status(401).json({ error: '인증이 필요합니다.' });

  if (!isOperator(req.member)) {
    return res.status(403).json({ error: '운영진 이상 권한이 필요합니다.' });
  }
  next();
}

// 최고 관리자 (관리자, 방장)
function requireAdmin(req, res, next) {
  if (!req.member) return res.status(401).json({ error: '인증이 필요합니다.' });

  if (!isAdmin(req.member)) {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
  next();
}

// 게시글 관리 권한: 작성자 본인 + 관리자(관리자/방장 역할) + isAdmin=true
function canManagePost(member, post) {
  if (!member || !post) return false;
  if (member.id === post.authorId) return true;
  if (member.isAdmin) return true;
  return isAdmin(member);
}

// 댓글 관리 권한: 댓글 작성자 본인 + 관리자
// 기존 댓글(authorId 없음)은 관리자만 관리 가능
function canManageComment(member, comment) {
  if (!member || !comment) return false;
  if (comment.authorId && member.id === comment.authorId) return true;
  if (member.isAdmin) return true;
  return isAdmin(member);
}

module.exports = { requireAuth, requireAuthOrGuest, requireOperator, requireAdmin, canManagePost, canManageComment };
