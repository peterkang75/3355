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

router.put("/:id", requireAuth, requireOperator, async (req, res) => {
  try {
    const member = await prisma.member.update({
      where: { id: req.params.id },
      data: req.body,
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

module.exports = router;
