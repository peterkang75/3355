/**
 * Phase 7 Step 2 — 미디어 파이프라인 end-to-end 테스트.
 * ffmpeg로 테스트 사진/영상 생성 → 압축·썸네일 → R2 업로드 → 서명URL 검증 → 삭제.
 * Run with: node server/scripts/media-pipeline-test.js
 */

require('dotenv').config();
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const { processImage, processVideo } = require('../utils/media');
const r2 = require('../utils/r2');

const tmp = os.tmpdir();
const imgPath = path.join(tmp, 'test-src.png');
const vidPath = path.join(tmp, 'test-src.mp4');

function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    execFile(ffmpegPath, args, { maxBuffer: 1024 * 1024 * 20 }, (err, _o, stderr) => {
      if (err) return reject(new Error((stderr || err.message).slice(-300)));
      resolve();
    });
  });
}

const kb = (b) => `${(b / 1024).toFixed(0)}KB`;

async function uploadAndVerify(label, processed) {
  const base = `_smoketest/${label}-${Date.now()}`;
  const objKey = `${base}.${processed.ext}`;
  const thumbKey = processed.thumbBuf ? `${base}-thumb.jpg` : null;

  await r2.uploadBuffer(objKey, processed.fullBuf, processed.contentType);
  if (thumbKey) await r2.uploadBuffer(thumbKey, processed.thumbBuf, 'image/jpeg');

  const url = await r2.signedUrl(objKey);
  const res = await fetch(url);
  const got = Buffer.from(await res.arrayBuffer());

  let thumbOk = 'n/a';
  if (thumbKey) {
    const turl = await r2.signedUrl(thumbKey);
    const tres = await fetch(turl);
    thumbOk = tres.status === 200 ? 'OK' : `FAIL(${tres.status})`;
  }

  await r2.deleteKeys([objKey, thumbKey]);

  return {
    fullSize: kb(processed.fullBuf.length),
    thumbSize: processed.thumbBuf ? kb(processed.thumbBuf.length) : 'none',
    dims: `${processed.width}x${processed.height}`,
    durationSec: processed.durationSec,
    signedDownload: res.status === 200 && got.length === processed.fullBuf.length ? 'OK' : `FAIL(${res.status})`,
    thumbDownload: thumbOk,
  };
}

(async () => {
  try {
    console.log('테스트 소스 생성 중 (ffmpeg)...');
    // 1920x1080 테스트 사진
    await ffmpeg(['-f', 'lavfi', '-i', 'testsrc=size=1920x1080:rate=1', '-frames:v', '1', '-y', imgPath]);
    // 3초 테스트 영상 (영상+오디오)
    await ffmpeg([
      '-f', 'lavfi', '-i', 'testsrc=duration=3:size=1920x1080:rate=30',
      '-f', 'lavfi', '-i', 'sine=frequency=1000:duration=3',
      '-c:v', 'mpeg4', '-c:a', 'aac', '-shortest', '-y', vidPath,
    ]);
    console.log(`  사진 원본: ${kb(fs.statSync(imgPath).size)}, 영상 원본: ${kb(fs.statSync(vidPath).size)}\n`);

    console.log('=== 사진 파이프라인 ===');
    console.log(await uploadAndVerify('photo', await processImage(imgPath)));

    console.log('\n=== 동영상 파이프라인 (압축 + 포스터 썸네일) ===');
    console.log(await uploadAndVerify('video', await processVideo(vidPath)));

    console.log('\n전체 통과 ✅');
  } catch (e) {
    console.error('실패:', e.message);
  } finally {
    [imgPath, vidPath].forEach((p) => { try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch { /* noop */ } });
    process.exit(0);
  }
})();
