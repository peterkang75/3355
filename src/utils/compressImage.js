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
