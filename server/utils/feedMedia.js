const fs = require('fs');
const crypto = require('crypto');
const r2 = require('./r2');
const { processImage, processVideo } = require('./media');

function buildBaseKey(postId) {
  return `feedposts/${postId}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

const cleanupTemp = (files) => {
  (files || []).forEach((f) => { try { if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path); } catch { /* noop */ } });
};

// jobs: [{ rowId, baseKey, objectKey, isVideo, path }], updateRow(id, data) => Promise
async function processFeedMediaJobs(jobs, updateRow) {
  for (const job of jobs) {
    try {
      const processed = job.isVideo ? await processVideo(job.path) : await processImage(job.path);
      await r2.uploadBuffer(job.objectKey, processed.fullBuf, processed.contentType);
      const thumbnailKey = processed.thumbBuf ? `${job.baseKey}-thumb.jpg` : null;
      if (thumbnailKey) await r2.uploadBuffer(thumbnailKey, processed.thumbBuf, 'image/jpeg');
      await updateRow(job.rowId, {
        thumbnailKey,
        fileSize: processed.fullBuf.length + (processed.thumbBuf ? processed.thumbBuf.length : 0),
        durationSec: processed.durationSec || null,
        width: processed.width || null,
        height: processed.height || null,
        status: 'ready',
      });
    } catch (e) {
      console.error('feed media bg process error', job.rowId, e);
      await updateRow(job.rowId, { status: 'failed' }).catch(() => {});
    } finally {
      try { if (fs.existsSync(job.path)) fs.unlinkSync(job.path); } catch { /* noop */ }
    }
  }
}

module.exports = { buildBaseKey, cleanupTemp, processFeedMediaJobs };
