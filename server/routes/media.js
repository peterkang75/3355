const express = require('express');
const multer = require('multer');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const archiver = require('archiver');
const prisma = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const r2 = require('../utils/r2');
const { processImage, processVideo } = require('../utils/media');

const router = express.Router();

const STORAGE_LIMIT_BYTES = 10 * 1024 * 1024 * 1024; // R2 무료 10GB (안내용)
// 업로드 개수 제한 없음 — 용량은 관리자 80% 알림 + 월별 정리로 관리

function monthKeyOf(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 파일당 200MB (서버 보호용 안전장치, 개수 제한 아님)
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

const cleanupTemp = (files) => {
  (files || []).forEach((f) => { try { if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch { /* noop */ } });
};

// 백그라운드 처리: 압축(영상 transcode) → R2 업로드 → 행 상태 ready. 응답을 막지 않음.
async function processJobsInBackground(jobs) {
  for (const job of jobs) {
    try {
      const processed = job.isVideo ? await processVideo(job.path) : await processImage(job.path);
      await r2.uploadBuffer(job.objectKey, processed.fullBuf, processed.contentType);
      const thumbnailKey = processed.thumbBuf ? `${job.baseKey}-thumb.jpg` : null;
      if (thumbnailKey) await r2.uploadBuffer(thumbnailKey, processed.thumbBuf, 'image/jpeg');
      await prisma.roundingMedia.update({
        where: { id: job.rowId },
        data: {
          thumbnailKey,
          fileSize: processed.fullBuf.length + (processed.thumbBuf ? processed.thumbBuf.length : 0),
          durationSec: processed.durationSec || null,
          width: processed.width || null,
          height: processed.height || null,
          status: 'ready',
        },
      });
    } catch (e) {
      console.error('media bg process error', job.rowId, e);
      await prisma.roundingMedia.update({ where: { id: job.rowId }, data: { status: 'failed' } }).catch(() => {});
    } finally {
      try { if (fs.existsSync(job.path)) fs.unlinkSync(job.path); } catch { /* noop */ }
    }
  }
}

// ── 업로드 (참가 회원만) — 바이트 수신 직후 응답, 압축은 백그라운드 ──────────
router.post('/bookings/:bookingId/media', requireAuth, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      cleanupTemp(req.files);
      return res.status(400).json({ error: '업로드할 파일이 없습니다.' });
    }
    const member = await getMemberPhone(req.member.id);
    const booking = await prisma.booking.findUnique({ where: { id: req.params.bookingId } });
    if (!booking) { cleanupTemp(req.files); return res.status(404).json({ error: '라운딩을 찾을 수 없습니다.' }); }

    const parts = parseParticipants(booking.participants);
    if (!parts.some((p) => p.phone === member.phone)) {
      cleanupTemp(req.files);
      return res.status(403).json({ error: '이 라운딩 참가자만 사진·영상을 올릴 수 있습니다.' });
    }

    // 1) 각 파일마다 'processing' 행 생성 (objectKey는 미리 확정)
    const jobs = [];
    for (const file of req.files) {
      const name = (file.originalname || '').toLowerCase();
      const isVideo = (file.mimetype || '').startsWith('video/')
        || /\.(mp4|mov|m4v|webm|avi|3gp|mkv)$/.test(name);
      const baseKey = `bookings/${booking.id}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const objectKey = `${baseKey}.${isVideo ? 'mp4' : 'jpg'}`;
      const row = await prisma.roundingMedia.create({
        data: {
          bookingId: booking.id,
          type: isVideo ? 'video' : 'photo',
          objectKey,
          thumbnailKey: null,
          fileSize: 0,
          uploaderPhone: member.phone,
          uploaderName: member.nickname || member.name,
          status: 'processing',
        },
      });
      jobs.push({ rowId: row.id, baseKey, objectKey, isVideo, path: file.path });
    }

    if (booking.photosArchivedAt) {
      await prisma.booking.update({ where: { id: booking.id }, data: { photosArchivedAt: null } });
    }

    // 2) 업로드 바이트는 다 받았으므로 즉시 응답
    res.json({ created: jobs.length, processing: jobs.map((j) => j.rowId) });

    // 3) 압축·R2업로드는 응답 후 백그라운드에서
    processJobsInBackground(jobs).catch((e) => console.error('bg jobs error', e));
  } catch (e) {
    console.error('media upload error:', e);
    cleanupTemp(req.files);
    if (!res.headersSent) res.status(500).json({ error: '업로드 처리 중 오류가 발생했습니다.' });
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
      status: m.status,
      durationSec: m.durationSec,
      width: m.width,
      height: m.height,
      uploaderName: m.uploaderName,
      uploaderPhone: m.uploaderPhone,
      createdAt: m.createdAt,
      url: m.status === 'ready' ? await r2.signedUrl(m.objectKey) : null,
      thumbnailUrl: m.status === 'ready' ? await r2.signedUrl(m.thumbnailKey) : null,
    })));

    res.json({ archivedAt: booking.photosArchivedAt, items });
  } catch (e) {
    console.error('media list error:', e);
    res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  }
});

// ── 목록 카드용 썸네일 미리보기 (라운딩별 최대 4장 + ready 개수) ──────────
router.get('/media/previews', requireAuth, async (req, res) => {
  try {
    const ids = String(req.query.ids || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) return res.json({ previews: {} });

    const media = await prisma.roundingMedia.findMany({
      where: { bookingId: { in: ids }, status: 'ready' },
      orderBy: { createdAt: 'asc' },
      select: { bookingId: true, thumbnailKey: true, objectKey: true },
    });

    const grouped = {};
    for (const m of media) {
      if (!grouped[m.bookingId]) grouped[m.bookingId] = { count: 0, keys: [] };
      grouped[m.bookingId].count += 1;
      if (grouped[m.bookingId].keys.length < 4) grouped[m.bookingId].keys.push(m.thumbnailKey || m.objectKey);
    }

    const previews = {};
    await Promise.all(Object.entries(grouped).map(async ([bid, g]) => {
      previews[bid] = { count: g.count, thumbs: await Promise.all(g.keys.map((k) => r2.signedUrl(k))) };
    }));

    res.json({ previews });
  } catch (e) {
    console.error('media previews error:', e);
    res.status(500).json({ error: '미리보기 조회 중 오류가 발생했습니다.' });
  }
});

// ── 저장소 사용량 + 월별 집계 (관리자) ───────────────────────────────────
router.get('/media/storage', requireAuth, requireAdmin, async (req, res) => {
  try {
    const media = await prisma.roundingMedia.findMany({
      where: { status: 'ready' },
      select: { fileSize: true, booking: { select: { date: true } } },
    });
    let totalBytes = 0;
    const map = {};
    for (const m of media) {
      totalBytes += m.fileSize || 0;
      const ym = monthKeyOf(m.booking.date);
      const d = new Date(m.booking.date);
      if (!map[ym]) map[ym] = { yearMonth: ym, label: `${d.getFullYear()}년 ${d.getMonth() + 1}월`, bytes: 0, count: 0 };
      map[ym].bytes += m.fileSize || 0;
      map[ym].count += 1;
    }
    const months = Object.values(map).sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
    res.json({ totalBytes, limitBytes: STORAGE_LIMIT_BYTES, months });
  } catch (e) {
    console.error('storage info error:', e);
    res.status(500).json({ error: '저장소 정보를 불러오지 못했습니다.' });
  }
});

// ── 월별 백업 zip 다운로드 (관리자) — 삭제하지 않음 ───────────────────────
router.get('/media/storage/:yearMonth/download', requireAuth, requireAdmin, async (req, res) => {
  try {
    const ym = req.params.yearMonth;
    const all = await prisma.roundingMedia.findMany({
      where: { status: 'ready' },
      select: { objectKey: true, type: true, booking: { select: { date: true, title: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const monthMedia = all.filter((m) => monthKeyOf(m.booking.date) === ym);
    if (monthMedia.length === 0) return res.status(404).json({ error: '해당 월의 자료가 없습니다.' });

    const archive = archiver('zip', { zlib: { level: 0 } }); // 이미 압축된 미디어 → 무압축(store)
    archive.on('error', (e) => { console.error('zip error', e); try { res.destroy(e); } catch { /* noop */ } });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="rounding-${ym}.zip"`);
    archive.pipe(res);

    let idx = 0;
    for (const m of monthMedia) {
      idx += 1;
      const d = new Date(m.booking.date);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const safeTitle = (m.booking.title || '라운딩').replace(/[\\/:*?"<>|]/g, '_');
      const ext = m.type === 'video' ? 'mp4' : 'jpg';
      const name = `${dateStr}_${safeTitle}/${String(idx).padStart(3, '0')}.${ext}`;
      // 메모리 안전: 한 개씩 버퍼로 받아 추가
      const stream = await r2.getObjectStream(m.objectKey);
      const buf = await streamToBuffer(stream);
      archive.append(buf, { name });
    }
    await archive.finalize();
  } catch (e) {
    console.error('archive download error:', e);
    if (!res.headersSent) res.status(500).json({ error: '백업 생성 중 오류가 발생했습니다.' });
    else { try { res.destroy(e); } catch { /* noop */ } }
  }
});

// ── 월별 정리(삭제) (관리자) — R2 먼저 삭제 후 DB, photosArchivedAt 기록 ──
router.delete('/media/storage/:yearMonth', requireAuth, requireAdmin, async (req, res) => {
  try {
    const ym = req.params.yearMonth;
    const all = await prisma.roundingMedia.findMany({
      select: { id: true, objectKey: true, thumbnailKey: true, bookingId: true, booking: { select: { date: true } } },
    });
    const monthMedia = all.filter((m) => monthKeyOf(m.booking.date) === ym);
    if (monthMedia.length === 0) return res.status(404).json({ error: '해당 월의 자료가 없습니다.' });

    // 1) R2 먼저 (오펀 객체 방지)
    const keys = [];
    monthMedia.forEach((m) => { keys.push(m.objectKey); if (m.thumbnailKey) keys.push(m.thumbnailKey); });
    await r2.deleteKeysBatch(keys);

    // 2) DB 행 삭제
    await prisma.roundingMedia.deleteMany({ where: { id: { in: monthMedia.map((m) => m.id) } } });

    // 3) 영향받은 라운딩에 백업 정리 시각 기록 → 갤러리/카드에 "백업 후 정리됨" 표시
    const bookingIds = [...new Set(monthMedia.map((m) => m.bookingId))];
    await prisma.booking.updateMany({ where: { id: { in: bookingIds } }, data: { photosArchivedAt: new Date() } });

    res.json({ deleted: monthMedia.length, bookings: bookingIds.length });
  } catch (e) {
    console.error('archive delete error:', e);
    res.status(500).json({ error: '정리(삭제) 중 오류가 발생했습니다.' });
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
