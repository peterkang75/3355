const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const { Jimp, JimpMime } = require('jimp');

const FULL_MAX = 1600;   // 원본 보관 최대 변
const THUMB_MAX = 400;   // 썸네일 최대 변

// ── 사진: 리사이즈 + JPEG 압축 + 썸네일 ──────────────────────────────────
async function processImage(inputPath) {
  const buffer = fs.readFileSync(inputPath);
  const image = await Jimp.read(buffer);
  const { width, height } = image.bitmap;

  const full = image.clone();
  if (width > FULL_MAX || height > FULL_MAX) full.scaleToFit({ w: FULL_MAX, h: FULL_MAX });
  const fullBuf = await full.getBuffer(JimpMime.jpeg, { quality: 82 });

  const thumb = image.clone();
  thumb.scaleToFit({ w: THUMB_MAX, h: THUMB_MAX });
  const thumbBuf = await thumb.getBuffer(JimpMime.jpeg, { quality: 75 });

  return { fullBuf, thumbBuf, width, height, durationSec: null, contentType: 'image/jpeg', ext: 'jpg' };
}

// ── 동영상: 720p 재인코딩 + 포스터 프레임 썸네일 ─────────────────────────
function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    execFile(ffmpegPath, args, { maxBuffer: 1024 * 1024 * 20 }, (err, _stdout, stderr) => {
      if (err) return reject(new Error((stderr || err.message).slice(-500)));
      resolve(stderr || '');
    });
  });
}

function parseDuration(stderr) {
  const m = /Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/.exec(stderr);
  if (!m) return null;
  return Math.round((+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + Number(`0.${m[4]}`));
}

async function processVideo(inputPath) {
  const tmp = os.tmpdir();
  const id = crypto.randomBytes(6).toString('hex');
  const outPath = path.join(tmp, `vid-${id}.mp4`);
  const posterPath = path.join(tmp, `poster-${id}.jpg`);

  try {
    const stderr = await runFfmpeg([
      '-i', inputPath,
      '-vf', "scale='min(1280,iw)':-2",
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
      '-c:a', 'aac', '-b:a', '96k',
      '-movflags', '+faststart',
      '-y', outPath,
    ]);
    const durationSec = parseDuration(stderr);

    // 1초 지점 프레임 → 너무 짧으면 첫 프레임
    await runFfmpeg(['-ss', '00:00:01', '-i', inputPath, '-frames:v', '1', '-q:v', '3', '-y', posterPath])
      .catch(() => runFfmpeg(['-i', inputPath, '-frames:v', '1', '-q:v', '3', '-y', posterPath]));

    const fullBuf = fs.readFileSync(outPath);

    let thumbBuf = null; let width = null; let height = null;
    try {
      const poster = await Jimp.read(fs.readFileSync(posterPath));
      width = poster.bitmap.width;
      height = poster.bitmap.height;
      poster.scaleToFit({ w: THUMB_MAX, h: THUMB_MAX });
      thumbBuf = await poster.getBuffer(JimpMime.jpeg, { quality: 75 });
    } catch { /* 포스터 실패해도 영상은 저장 */ }

    return { fullBuf, thumbBuf, width, height, durationSec, contentType: 'video/mp4', ext: 'mp4' };
  } finally {
    [outPath, posterPath].forEach((p) => { try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch { /* noop */ } });
  }
}

module.exports = { processImage, processVideo };
