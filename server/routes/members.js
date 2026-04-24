const express = require("express");
const prisma = require("../db");
const { requireAuth, requireOperator, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /members, POST /members — 공개 (로그인 화면에서 필요)

router.get("/", async (req, res) => {
  try {
    const includePhoto = req.query.includePhoto === 'true';
    const members = await prisma.member.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
        nickname: true,
        gender: true,
        birthYear: true,
        region: true,
        isClubMember: true,
        club: true,
        handicap: true,
        gaHandy: true,
        houseHandy: true,
        golflinkNumber: true,
        clubMemberNumber: true,
        isAdmin: true,
        role: true,
        balance: true,
        photo: includePhoto,
        isActive: true,
        approvalStatus: true,
        canManageFees: true,
        isFeeExempt: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true
      }
    });
    res.json(members);
  } catch (error) {
    console.error("Error fetching members:", error);
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
    });
    if (!member) return res.status(404).json({ error: "Member not found" });
    res.json(member);
  } catch (error) {
    console.error("Error fetching member:", error);
    res.status(500).json({ error: "Failed to fetch member" });
  }
});

router.post("/", async (req, res) => {
  try {
    const existingMember = await prisma.member.findFirst({
      where: { phone: req.body.phone },
    });

    if (existingMember) {
      return res.status(409).json({
        error: "DUPLICATE_PHONE",
        message: `이미 회원가입이 되어있습니다. [${existingMember.nickname || existingMember.name}]`,
        nickname: existingMember.nickname || existingMember.name,
      });
    }

    const approvalSetting = await prisma.appSettings.findUnique({
      where: { feature: "memberApprovalRequired" },
    });

    const requiresApproval = approvalSetting?.enabled || false;

    const member = await prisma.member.create({
      data: {
        ...req.body,
        approvalStatus: requiresApproval ? "pending" : "approved",
      },
    });
    req.io.emit("members:updated");
    res.json(member);
  } catch (error) {
    console.error("Error creating member:", error);
    res.status(500).json({ error: "Failed to create member" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  // 자기 자신은 수정 가능, 타인 수정은 운영진 이상만 가능
  const isSelf = req.member.id === req.params.id;
  const { isOperator } = require('../utils/roles');
  if (!isSelf && !isOperator(req.member)) {
    return res.status(403).json({ error: '운영진 이상 권한이 필요합니다.' });
  }

  try {
    // 일반 회원이 자신의 정보를 수정할 때는 허용된 필드만 수정 가능
    let data = req.body;
    if (isSelf && !isOperator(req.member)) {
      const { name, nickname, phone, club, gaHandy, houseHandy, handicap,
              golflinkNumber, gaRegisteredName, clubMemberNumber, photo, gender, birthYear,
              region, isClubMember } = req.body;
      data = { name, nickname, phone, club, gaHandy, houseHandy, handicap,
               golflinkNumber, gaRegisteredName, clubMemberNumber, photo, gender, birthYear,
               region, isClubMember };
      // undefined 필드 제거
      Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
    }

    const member = await prisma.member.update({
      where: { id: req.params.id },
      data,
    });
    req.io.emit("members:updated");
    res.json(member);
  } catch (error) {
    console.error("Error updating member:", error);
    res.status(500).json({ error: "Failed to update member" });
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    req.io.emit("members:updated");
    res.json({ success: true, member });
  } catch (error) {
    console.error("Error deactivating member:", error);
    res.status(500).json({ error: "Failed to deactivate member" });
  }
});

router.patch("/:id/toggle-admin", requireAuth, requireAdmin, async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
    });

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const updated = await prisma.member.update({
      where: { id: req.params.id },
      data: { isAdmin: !member.isAdmin },
    });

    req.io.emit("members:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error toggling admin status:", error);
    res.status(500).json({ error: "Failed to toggle admin status" });
  }
});

router.patch("/:id/toggle-active", requireAuth, requireOperator, async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
    });

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const updated = await prisma.member.update({
      where: { id: req.params.id },
      data: { isActive: member.isActive === false ? true : false },
    });

    req.io.emit("members:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error toggling active status:", error);
    res.status(500).json({ error: "Failed to toggle active status" });
  }
});

router.patch("/:id/toggle-fees-permission", requireAuth, requireOperator, async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
    });

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    const updated = await prisma.member.update({
      where: { id: req.params.id },
      data: { canManageFees: !member.canManageFees },
    });

    req.io.emit("members:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error toggling fees permission:", error);
    res.status(500).json({ error: "Failed to toggle fees permission" });
  }
});

router.patch("/:id/role", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;

    if (!["관리자", "방장", "운영진", "클럽운영진", "회원"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const updated = await prisma.member.update({
      where: { id: req.params.id },
      data: {
        role,
        isAdmin: role === "관리자",
      },
    });

    req.io.emit("members:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error updating member role:", error);
    res.status(500).json({ error: "Failed to update member role" });
  }
});

router.patch("/:id/approve", requireAuth, requireOperator, async (req, res) => {
  try {
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: { approvalStatus: "approved" },
    });
    req.io.emit("members:updated");
    res.json(member);
  } catch (error) {
    console.error("Error approving member:", error);
    res.status(500).json({ error: "Failed to approve member" });
  }
});

router.patch("/:id/reject", requireAuth, requireOperator, async (req, res) => {
  try {
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: { approvalStatus: "rejected" },
    });
    req.io.emit("members:updated");
    res.json(member);
  } catch (error) {
    console.error("Error rejecting member:", error);
    res.status(500).json({ error: "Failed to reject member" });
  }
});

// 게스트 멤버 완전 삭제 (트랜잭션 포함)
router.delete("/:id/guest", requireAuth, requireOperator, async (req, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { id: req.params.id },
      select: { id: true, isGuest: true, approvalStatus: true },
    });

    if (!member) return res.status(404).json({ error: '회원을 찾을 수 없습니다.' });
    if (!member.isGuest) return res.status(400).json({ error: '게스트 회원만 삭제할 수 있습니다.' });

    // 트랜잭션 먼저 삭제, 그 다음 멤버 삭제
    await prisma.transaction.deleteMany({ where: { memberId: req.params.id } });
    await prisma.member.delete({ where: { id: req.params.id } });

    req.io.emit('members:updated');
    req.io.emit('transactions:updated');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting guest member:', error);
    res.status(500).json({ error: 'Failed to delete guest member' });
  }
});

module.exports = router;
