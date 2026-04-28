const express = require("express");
const prisma = require("../db");
const { requireAuth, canManagePost, canManageComment } = require('../middleware/auth');

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
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (!canManagePost(req.member, post)) {
      return res.status(403).json({ error: "권한이 없습니다." });
    }

    // 변경 가능 필드만 추출 (comments, authorId, id, createdAt 등은 제거)
    const allowed = ['title', 'content', 'isFeatured', 'isActive'];
    const data = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }

    const updated = await prisma.post.update({
      where: { id: req.params.id },
      data,
      include: { author: true },
    });

    req.io.emit("posts:updated");
    res.json(updated);
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ error: "Failed to update post" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (!canManagePost(req.member, post)) {
      return res.status(403).json({ error: "권한이 없습니다." });
    }

    await prisma.post.delete({ where: { id: req.params.id } });
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

    if (!canManagePost(req.member, post)) {
      return res.status(403).json({ error: "권한이 없습니다." });
    }

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
    if (!canManagePost(req.member, post)) {
      return res.status(403).json({ error: "권한이 없습니다." });
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

// 게시글 좋아요 토글: 로그인한 회원이면 누구나
router.patch("/:id/like", requireAuth, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const memberId = req.member.id;
    const likes = Array.isArray(post.likes) ? post.likes : [];
    const hasLiked = likes.includes(memberId);
    const updatedLikes = hasLiked ? likes.filter(id => id !== memberId) : [...likes, memberId];

    await prisma.post.update({
      where: { id: req.params.id },
      data: { likes: updatedLikes },
    });

    req.io.emit("posts:updated");
    res.json({ success: true, liked: !hasLiked });
  } catch (error) {
    console.error("Error toggling post like:", error);
    res.status(500).json({ error: "Failed to toggle post like" });
  }
});

// 댓글 추가: 로그인한 회원이면 누구나
router.post("/:id/comments", requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: "content가 비어있습니다." });
    }

    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comments = Array.isArray(post.comments) ? post.comments : [];
    const newComment = {
      id: Date.now(),
      content: content.trim(),
      authorId: req.member.id,
      author: req.member.nickname || req.member.name || '회원',
      authorPhoto: req.member.photo || null,
      date: new Date().toISOString(),
      likes: [],
    };

    await prisma.post.update({
      where: { id: req.params.id },
      data: { comments: [...comments, newComment] },
    });

    req.io.emit("posts:updated");
    res.json({ success: true, comment: newComment });
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// 댓글 수정: 댓글 작성자 본인 + 관리자
router.patch("/:id/comments/:commentId", requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: "content가 비어있습니다." });
    }

    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comments = Array.isArray(post.comments) ? post.comments : [];
    const idx = comments.findIndex(c => String(c.id) === String(req.params.commentId));
    if (idx === -1) return res.status(404).json({ error: "Comment not found" });

    if (!canManageComment(req.member, comments[idx])) {
      return res.status(403).json({ error: "권한이 없습니다." });
    }

    const updatedComments = [...comments];
    updatedComments[idx] = { ...comments[idx], content };

    await prisma.post.update({
      where: { id: req.params.id },
      data: { comments: updatedComments },
    });

    req.io.emit("posts:updated");
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).json({ error: "Failed to update comment" });
  }
});

// 댓글 삭제 (hard): 댓글 작성자 본인 + 관리자
router.delete("/:id/comments/:commentId", requireAuth, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comments = Array.isArray(post.comments) ? post.comments : [];
    const target = comments.find(c => String(c.id) === String(req.params.commentId));
    if (!target) return res.status(404).json({ error: "Comment not found" });

    if (!canManageComment(req.member, target)) {
      return res.status(403).json({ error: "권한이 없습니다." });
    }

    const updatedComments = comments.filter(c => String(c.id) !== String(req.params.commentId));

    await prisma.post.update({
      where: { id: req.params.id },
      data: { comments: updatedComments },
    });

    req.io.emit("posts:updated");
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

// 댓글 좋아요 토글: 로그인한 회원이면 누구나
router.patch("/:id/comments/:commentId/like", requireAuth, async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comments = Array.isArray(post.comments) ? post.comments : [];
    const idx = comments.findIndex(c => String(c.id) === String(req.params.commentId));
    if (idx === -1) return res.status(404).json({ error: "Comment not found" });

    const memberId = req.member.id;
    const likes = Array.isArray(comments[idx].likes) ? comments[idx].likes : [];
    const hasLiked = likes.includes(memberId);
    const updatedLikes = hasLiked ? likes.filter(id => id !== memberId) : [...likes, memberId];

    const updatedComments = [...comments];
    updatedComments[idx] = { ...comments[idx], likes: updatedLikes };

    await prisma.post.update({
      where: { id: req.params.id },
      data: { comments: updatedComments },
    });

    req.io.emit("posts:updated");
    res.json({ success: true, liked: !hasLiked });
  } catch (error) {
    console.error("Error toggling comment like:", error);
    res.status(500).json({ error: "Failed to toggle comment like" });
  }
});

module.exports = router;
