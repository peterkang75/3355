const express = require("express");
const prisma = require("../db");
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: { author: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { id, ...postData } = req.body;
    const post = await prisma.post.create({
      data: postData,
      include: { author: true },
    });

    req.io.emit("posts:updated");
    res.json(post);
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: req.body,
      include: { author: true },
    });

    req.io.emit("posts:updated");
    res.json(post);
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ error: "Failed to update post" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await prisma.post.delete({
      where: { id: req.params.id },
    });
    req.io.emit("posts:updated");
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// 대시보드 메인 공지 등록/해제 (한 번에 하나만 featured)
router.patch("/:id/toggle-featured", requireAuth, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (post.isFeatured) {
      // 해제
      const updated = await prisma.post.update({
        where: { id: req.params.id },
        data: { isFeatured: false },
        include: { author: true },
      });
      req.io.emit("posts:updated");
      return res.json(updated);
    } else {
      // 기존 featured 해제 후 이 글을 featured로
      await prisma.post.updateMany({ where: { isFeatured: true }, data: { isFeatured: false } });
      const updated = await prisma.post.update({
        where: { id: req.params.id },
        data: { isFeatured: true },
        include: { author: true },
      });
      req.io.emit("posts:updated");
      return res.json(updated);
    }
  } catch (error) {
    console.error("Error toggling post featured status:", error);
    res.status(500).json({ error: "Failed to toggle featured status" });
  }
});

router.patch("/:id/toggle-active", requireAuth, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
    });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    const updatedPost = await prisma.post.update({
      where: { id: req.params.id },
      data: { isActive: !post.isActive },
      include: { author: true },
    });
    req.io.emit("posts:updated");
    res.json(updatedPost);
  } catch (error) {
    console.error("Error toggling post active status:", error);
    res.status(500).json({ error: "Failed to toggle post status" });
  }
});

module.exports = router;
