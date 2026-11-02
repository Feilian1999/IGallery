import limits from "../shared/artworkLimits.json";
import {ApiError, CSRF_HEADERS} from "../api";

// Images are resized in the browser before upload: a large version for viewing
// and a small preview for the gallery and lists. Production uploads go straight
// from the browser to Vercel Blob; locally they are posted to the dev API.
const LARGE_SIZE = 2560;
const PREVIEW_SIZE = 512;

const toJpeg = (bitmap, maxSize, quality) => new Promise((resolve, reject) => {
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  // JPEG has no transparency; flatten onto white like a print
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  canvas.toBlob((blob) => (blob ? resolve({blob, width, height}) : reject(new Error("無法處理這張圖片"))), "image/jpeg", quality);
});

const sendLocal = (blob, onProgress) => new Promise((resolve, reject) => {
  const request = new XMLHttpRequest();
  request.open("POST", "/api/uploads/local");
  Object.entries({...CSRF_HEADERS, "content-type": blob.type}).forEach(([key, value]) => request.setRequestHeader(key, value));
  request.upload.onprogress = (event) => event.lengthComputable && onProgress(event.loaded / event.total);
  request.onload = () => {
    const data = JSON.parse(request.responseText || "{}");
    if (request.status >= 200 && request.status < 300) resolve(data.url);
    else reject(new ApiError(data.error || `上傳失敗（${request.status}）`, request.status));
  };
  request.onerror = () => reject(new Error("網路連線失敗"));
  request.send(blob);
});

const sendToBlob = async (blob, name, blobAuth, onProgress) => {
  const {upload, uploadPresigned} = await import("@vercel/blob/client");
  // stores using OIDC hand out presigned URLs instead of client tokens
  const send = blobAuth === "oidc" ? uploadPresigned : upload;
  const result = await send(`artworks/${name}`, blob, {
    access: "public",
    contentType: blob.type,
    handleUploadUrl: "/api/uploads/blob",
    headers: CSRF_HEADERS,
    onUploadProgress: ({percentage}) => onProgress(percentage / 100),
  });
  return result.url;
};

export const checkFile = (file) => {
  if (!limits.imageTypes.includes(file.type)) return "只接受 JPEG、PNG、WebP 圖片";
  if (file.size > limits.maxUploadMB * 1024 * 1024) return `檔案超過 ${limits.maxUploadMB} MB`;
  return null;
};

// Resizes and uploads both versions; resolves to the fields /me/artworks needs for the image.
// `session` is the /api/auth/me response, which says how uploads are stored.
export const uploadImage = async (file, session, onProgress) => {
  const problem = checkFile(file);
  if (problem) throw new Error(problem);
  const bitmap = await createImageBitmap(file);
  const large = await toJpeg(bitmap, LARGE_SIZE, 0.9);
  const preview = await toJpeg(bitmap, PREVIEW_SIZE, 0.8);
  bitmap.close();

  const id = crypto.randomUUID();
  const send = (blob, name, progress) => (session.storage === "blob" ? sendToBlob(blob, name, session.blobAuth, progress) : sendLocal(blob, progress));
  const imageUrl = await send(large.blob, `${id}.jpg`, (p) => onProgress(p * 0.85));
  const previewUrl = await send(preview.blob, `${id}-preview.jpg`, (p) => onProgress(0.85 + p * 0.15));
  return {imageUrl, previewUrl, width: large.width, height: large.height};
};
