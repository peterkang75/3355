/**
 * Phase 7 Step 1.5 — R2 연결 + ffmpeg 도구 스모크 테스트.
 * Run with: node server/scripts/r2-smoke-test.js
 */

require('dotenv').config();
const {
  S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT } = process.env;

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

async function testR2() {
  const key = `_smoketest/hello-${Date.now()}.txt`;
  const body = `R2 smoke test ${new Date().toISOString()}`;

  await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: body, ContentType: 'text/plain' }));
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }), { expiresIn: 300 });
  const res = await fetch(url);
  const text = await res.text();
  await s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));

  return {
    uploaded: true,
    signedUrlStatus: res.status,
    contentMatches: text === body,
    deleted: true,
  };
}

function testFfmpeg() {
  return new Promise((resolve) => {
    execFile(ffmpegPath, ['-version'], (err, stdout) => {
      if (err) return resolve({ ok: false, error: err.message });
      resolve({ ok: true, path: ffmpegPath, version: stdout.split('\n')[0] });
    });
  });
}

(async () => {
  console.log('=== 1) R2 연결 (업로드 → 서명URL → 다운로드 → 삭제) ===');
  try {
    console.log(await testR2());
  } catch (e) {
    console.error('R2 실패:', e.name, '-', e.message);
  }

  console.log('\n=== 2) ffmpeg (영상 압축 도구) ===');
  console.log(await testFfmpeg());

  process.exit(0);
})();
