const {
  S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT } = process.env;

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

async function uploadBuffer(key, buffer, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET, Key: key, Body: buffer, ContentType: contentType,
  }));
}

async function deleteKeys(keys) {
  const list = (Array.isArray(keys) ? keys : [keys]).filter(Boolean);
  await Promise.all(list.map((k) => s3.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: k }))));
}

// 갤러리 렌더 시 단기 서명 URL 발급 (도메인 불필요, 트래픽 무료 유지)
async function signedUrl(key, expiresIn = 3600) {
  if (!key) return null;
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }), { expiresIn });
}

// 객체 본문 스트림 (zip 백업용)
async function getObjectStream(key) {
  const out = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
  return out.Body;
}

module.exports = { uploadBuffer, deleteKeys, signedUrl, getObjectStream, BUCKET: R2_BUCKET };
