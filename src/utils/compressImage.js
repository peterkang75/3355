import imageCompression from 'browser-image-compression';

const COMPRESS_OPTIONS = {
  maxSizeMB: 0.2,
  maxWidthOrHeight: 400,
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.8,
};

export async function compressImageToBase64(file) {
  const compressed = await imageCompression(file, COMPRESS_OPTIONS);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(compressed);
  });
}

// 갤러리 사진용: 브라우저에서 1600px JPEG로 미리 압축 → 업로드/서버처리 모두 빨라짐
const GALLERY_OPTIONS = {
  maxSizeMB: 1.2,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.8,
};

export async function compressImageFile(file) {
  const compressed = await imageCompression(file, GALLERY_OPTIONS);
  const base = (file.name || 'photo').replace(/\.[^.]+$/, '');
  return new File([compressed], `${base}.jpg`, { type: 'image/jpeg' });
}
