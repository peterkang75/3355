const express = require('express');
const prisma = require('../db');
const { requireAuth, requireAuthOrGuest } = require('../middleware/auth');
const { isOperator } = require('../utils/roles');
const { signedUrl } = require('../utils/r2');

const router = express.Router();

const VALID_TARGETS = ['booking', 'feedpost'];

// targetKey 배열에 대한 반응/댓글 일괄 집계 (N+1 방지)
async function aggregateEngagement(targets, viewerId) {
  if (targets.length === 0) return { reactions: {}, comments: {} };
  const ids = targets.map((t) => t.targetId);
  const types = [...new Set(targets.map((t) => t.targetType))];

  const [reactions, comments] = await Promise.all([
    prisma.reaction.findMany({
      where: { targetType: { in: types }, targetId: { in: ids } },
      select: { targetType: true, targetId: true, memberId: true },
    }),
    prisma.comment.findMany({
      where: { targetType: { in: types }, targetId: { in: ids } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, targetType: true, targetId: true, content: true, createdAt: true,
        author: { select: { id: true, name: true, nickname: true, photo: true } },
      },
    }),
  ]);

  const rMap = {};
  for (const r of reactions) {
    const key = `${r.targetType}:${r.targetId}`;
    if (!rMap[key]) rMap[key] = { count: 0, likedByViewer: false };
    rMap[key].count += 1;
    if (r.memberId === viewerId) rMap[key].likedByViewer = true;
  }
  const cMap = {};
  for (const c of comments) {
    const key = `${c.targetType}:${c.targetId}`;
    if (!cMap[key]) cMap[key] = [];
    cMap[key].push({
      id: c.id, content: c.content, createdAt: c.createdAt,
      authorId: c.author.id, authorName: c.author.nickname || c.author.name,
      authorPhoto: c.author.photo || null,
    });
  }
  return { reactions: rMap, comments: cMap };
}

// GET /api/feed — 라운딩 자동게시물 + 자유글 병합, 최신순
router.get('/', requireAuthOrGuest, async (req, res) => {
  try {
    const viewerId = req.member.id;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const bookings = await prisma.booking.findMany({
      where: { photosArchivedAt: null },
      include: { media: { where: { status: 'ready' }, orderBy: { createdAt: 'desc' } } },
    });
    const roundItems = bookings
      .filter((b) => new Date(b.date) < todayStart && b.media.length > 0)
      .map((b) => {
        const cover = b.media.find((m) => m.type === 'photo' && m.thumbnailKey)
          || b.media.find((m) => m.thumbnailKey) || b.media[0];
        const feedTs = b.media.reduce(
          (max, m) => (m.createdAt > max ? m.createdAt : max), b.media[0].createdAt);
        return {
          kind: 'round', id: b.id, targetType: 'booking', targetId: b.id,
          title: b.title || `${b.type}`, courseName: b.courseName, date: b.date,
          mediaCount: b.media.length, coverThumbKey: cover ? cover.thumbnailKey : null, feedTs,
        };
      });

    const posts = await prisma.feedPost.findMany({
      include: {
        author: { select: { id: true, name: true, nickname: true, photo: true } },
        media: { orderBy: { createdAt: 'asc' } },
      },
    });
    const freeItems = posts.map((p) => ({
      kind: 'free', id: p.id, targetType: 'feedpost', targetId: p.id,
      content: p.content,
      authorId: p.author.id, authorName: p.author.nickname || p.author.name,
      authorPhoto: p.author.photo || null,
      media: p.media.map((m) => ({ id: m.id, type: m.type, status: m.status, objectKey: m.objectKey, thumbnailKey: m.thumbnailKey })),
      feedTs: p.createdAt,
    }));

    const all = [...roundItems, ...freeItems].sort((a, b) => new Date(b.feedTs) - new Date(a.feedTs));
    const { reactions, comments } = await aggregateEngagement(
      all.map((i) => ({ targetType: i.targetType, targetId: i.targetId })), viewerId);

    // 서명 URL 변환 (원시 key는 응답에서 제거)
    const items = await Promise.all(all.map(async (i) => {
      const key = `${i.targetType}:${i.targetId}`;
      const r = reactions[key] || { count: 0, likedByViewer: false };
      const c = comments[key] || [];
      const base = {
        ...i,
        likeCount: r.count, likedByViewer: r.likedByViewer,
        commentCount: c.length, recentComments: c.slice(-2),
      };
      if (i.kind === 'round') {
        base.coverThumbUrl = i.coverThumbKey ? await signedUrl(i.coverThumbKey) : null;
        delete base.coverThumbKey;
      } else {
        base.media = await Promise.all(i.media.map(async (m) => ({
          id: m.id, type: m.type, status: m.status,
          url: m.status === 'ready' ? await signedUrl(m.objectKey) : null,
          thumbUrl: m.thumbnailKey ? await signedUrl(m.thumbnailKey) : null,
        })));
      }
      return base;
    }));

    res.json({ items });
  } catch (e) {
    console.error('GET /api/feed error', e);
    res.status(500).json({ error: '피드를 불러오지 못했습니다.' });
  }
});

// POST /api/feed/reactions/toggle  { targetType, targetId }  (게스트 허용)
router.post('/reactions/toggle', requireAuthOrGuest, async (req, res) => {
  try {
    const { targetType, targetId } = req.body;
    if (!VALID_TARGETS.includes(targetType) || !targetId) {
      return res.status(400).json({ error: '잘못된 대상입니다.' });
    }
    const existing = await prisma.reaction.findUnique({
      where: { targetType_targetId_memberId_type: { targetType, targetId, memberId: req.member.id, type: 'like' } },
    });
    if (existing) await prisma.reaction.delete({ where: { id: existing.id } });
    else await prisma.reaction.create({ data: { targetType, targetId, memberId: req.member.id, type: 'like' } });
    const count = await prisma.reaction.count({ where: { targetType, targetId } });
    req.io.emit('feed:updated');
    res.json({ liked: !existing, count });
  } catch (e) {
    console.error('toggle reaction error', e);
    res.status(500).json({ error: '반응 처리 실패' });
  }
});

// GET /api/feed/comments?targetType=&targetId=
router.get('/comments', requireAuthOrGuest, async (req, res) => {
  const { targetType, targetId } = req.query;
  if (!VALID_TARGETS.includes(targetType) || !targetId) {
    return res.status(400).json({ error: '잘못된 대상입니다.' });
  }
  const comments = await prisma.comment.findMany({
    where: { targetType, targetId }, orderBy: { createdAt: 'asc' },
    select: { id: true, content: true, createdAt: true, author: { select: { id: true, name: true, nickname: true, photo: true } } },
  });
  res.json({ comments: comments.map((c) => ({
    id: c.id, content: c.content, createdAt: c.createdAt,
    authorId: c.author.id, authorName: c.author.nickname || c.author.name, authorPhoto: c.author.photo || null,
  })) });
});

// POST /api/feed/comments  { targetType, targetId, content }  (requireAuth = 정회원만, 게스트 차단)
router.post('/comments', requireAuth, async (req, res) => {
  const { targetType, targetId, content } = req.body;
  if (!VALID_TARGETS.includes(targetType) || !targetId) return res.status(400).json({ error: '잘못된 대상입니다.' });
  if (typeof content !== 'string' || !content.trim()) return res.status(400).json({ error: '내용을 입력하세요.' });
  const comment = await prisma.comment.create({
    data: { targetType, targetId, authorId: req.member.id, content: content.trim() },
    select: { id: true, content: true, createdAt: true, author: { select: { id: true, name: true, nickname: true, photo: true } } },
  });
  req.io.emit('feed:updated');
  res.json({ comment: {
    id: comment.id, content: comment.content, createdAt: comment.createdAt,
    authorId: comment.author.id, authorName: comment.author.nickname || comment.author.name, authorPhoto: comment.author.photo || null,
  } });
});

// DELETE /api/feed/comments/:id  (작성자 또는 운영자)
router.delete('/comments/:id', requireAuth, async (req, res) => {
  const c = await prisma.comment.findUnique({ where: { id: req.params.id } });
  if (!c) return res.status(404).json({ error: '댓글이 없습니다.' });
  if (c.authorId !== req.member.id && !isOperator(req.member)) return res.status(403).json({ error: '삭제 권한이 없습니다.' });
  await prisma.comment.delete({ where: { id: req.params.id } });
  req.io.emit('feed:updated');
  res.json({ success: true });
});

module.exports = router;
