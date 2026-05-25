const express = require('express');
const multer = require('multer');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');
const r2 = require('../utils/r2');
const { processImage, processVideo } = require('../utils/media');

const router = express.Router();

const MAX_ITEMS_PER_ROUND = 30;
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 원본 업로드 1개당 최대 200MB
});

function parseParticipants(arr) {
  return (arr || [])
    .map((s) => { try { return JSON.parse(s); } catch { return null; } })
    .filter(Boolean);
}

async function getMemberPhone(memberId) {
  const m = await prisma.member.findUnique({
    where: { id: memberId },
    select: { phone: true, name: true, nickname: true },
  });
  return m;
}

// ── 업로드 (참가 회원만) ─────────────────────────────────────────────────
router.post('/bookings/:bookingId/media', requireAuth, upload.array('files', 10), async (req, res) => {
  const tmpFiles = (req.files || []).map((f) => f.path);
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '업로드할 파일이 없습니다.' });
    }
    const member = await getMemberPhone(req.member.id);
    const booking = await prisma.booking.findUnique({ where: { id: req.params.bookingId } });
    if (!booking) return res.status(404).json({ error: '라운딩을 찾을 수 없습니다.' });

    const parts = parseParticipants(booking.participants);
    if (!parts.some((p) => p.phone === member.phone)) {
      return res.status(403).json({ error: '이 라운딩 참가자만 사진·영상을 올릴 수 있습니다.' });
    }

    const existing = await prisma.roundingMedia.count({ where: { bookingId: booking.id } });
    if (existing + req.files.length > MAX_ITEMS_PER_ROUND) {
      return res.status(400).json({ error: `라운딩당 최대 ${MAX_ITEMS_PER_ROUND}개까지 올릴 수 있습니다. (현재 ${existing}개)` });
    }

    const created = [];
    for (const file of req.files) {
      const isVideo = (file.mimetype || '').startsWith('video/');
      const processed = isVideo ? await processVideo(file.path) : await processImage(file.path);

      const baseKey = `bookings/${booking.id}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const objectKey = `${baseKey}.${processed.ext}`;
      const thumbnailKey = processed.thumbBuf ? `${baseKey}-thumb.jpg` : null;

      await r2.uploadBuffer(objectKey, processed.fullBuf, processed.contentType);
      if (thumbnailKey) await r2.uploadBuffer(thumbnailKey, processed.thumbBuf, 'image/jpeg');

      const row = await prisma.roundingMedia.create({
        data: {
          bookingId: booking.id,
          type: isVideo ? 'video' : 'photo',
          objectKey,
          thumbnailKey,
          fileSize: processed.fullBuf.length + (processed.thumbBuf ? processed.thumbBuf.length : 0),
          durationSec: processed.durationSec || null,
          width: processed.width || null,
          height: processed.height || null,
          uploaderPhone: member.phone,
          uploaderName: member.nickname || member.name,
          status: 'ready',
        },
      });
      created.push(row.id);
    }

    // 백업 후 정리됐던 라운딩에 다시 올리면 안내 플래그 해제
    if (booking.photosArchivedAt) {
      await prisma.booking.update({ where: { id: booking.id }, data: { photosArchivedAt: null } });
    }

    res.json({ created: created.length });
  } catch (e) {
    console.error('media upload error:', e);
    res.status(500).json({ error: '업로드 처리 중 오류가 발생했습니다.' });
  } finally {
    tmpFiles.forEach((p) => { try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch { /* noop */ } });
  }
});

// ── 목록 조회 (서명 URL 포함) ────────────────────────────────────────────
router.get('/bookings/:bookingId/media', requireAuth, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.bookingId },
      select: { id: true, photosArchivedAt: true },
    });
    if (!booking) return res.status(404).json({ error: '라운딩을 찾을 수 없습니다.' });

    const media = await prisma.roundingMedia.findMany({
      where: { bookingId: booking.id },
      orderBy: { createdAt: 'asc' },
    });
    const items = await Promise.all(media.map(async (m) => ({
      id: m.id,
      type: m.type,
      durationSec: m.durationSec,
      width: m.width,
      height: m.height,
      uploaderName: m.uploaderName,
      uploaderPhone: m.uploaderPhone,
      createdAt: m.createdAt,
      url: await r2.signedUrl(m.objectKey),
      thumbnailUrl: await r2.signedUrl(m.thumbnailKey),
    })));

    res.json({ archivedAt: booking.photosArchivedAt, items });
  } catch (e) {
    console.error('media list error:', e);
    res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  }
});

// ── 단일 삭제 (올린 사람만) ──────────────────────────────────────────────
router.delete('/media/:id', requireAuth, async (req, res) => {
  try {
    const member = await getMemberPhone(req.member.id);
    const m = await prisma.roundingMedia.findUnique({ where: { id: req.params.id } });
    if (!m) return res.status(404).json({ error: '미디어를 찾을 수 없습니다.' });
    if (m.uploaderPhone !== member.phone) {
      return res.status(403).json({ error: '본인이 올린 사진·영상만 삭제할 수 있습니다.' });
    }
    await r2.deleteKeys([m.objectKey, m.thumbnailKey]);
    await prisma.roundingMedia.delete({ where: { id: m.id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('media delete error:', e);
    res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
