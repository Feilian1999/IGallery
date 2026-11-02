import {Hono} from "hono";
import {issueSignedToken} from "@vercel/blob";
import {handleUpload, handleUploadPresigned, type HandleUploadBody, type HandleUploadPresignedBody} from "@vercel/blob/client";
import * as schemas from "../schemas";
import {currentUser, requireMember, CSRF_HEADER, type AuthEnv} from "../auth";
import {storageKind, blobAuth, sniffImageType, saveLocal} from "../storage";

// Image uploads for members. Files never pass through the function in production:
// the browser asks for permission here and sends the file straight to Vercel Blob,
// bypassing the 4.5 MB function body limit.
export const uploadRoutes = new Hono<AuthEnv>();

const MAX_UPLOAD_BYTES = schemas.limits.maxUploadMB * 1024 * 1024;
const UPLOAD_RULES = {allowedContentTypes: schemas.limits.imageTypes, maximumSizeInBytes: MAX_UPLOAD_BYTES};
const PERMISSION_REQUESTS = new Set(["blob.generate-client-token", "blob.generate-presigned-url"]);

// With a read-write token the permission is a client token; with OIDC (BLOB_STORE_ID)
// it is a short-lived presigned URL.
uploadRoutes.post("/blob", async (c) => {
  if (storageKind !== "blob") return c.json({error: "尚未設定 Vercel Blob"}, 400);
  const body = (await c.req.json()) as HandleUploadBody | HandleUploadPresignedBody;
  if (PERMISSION_REQUESTS.has(body.type)) {
    const user = await currentUser(c);
    if (c.req.header(CSRF_HEADER) !== "1" || !user) return c.json({error: "請先登入"}, 401);
    if (user.role === "guest") return c.json({error: "訪客無法上傳作品，請先註冊成為會員"}, 403);
  }
  if (blobAuth === "oidc") {
    const result = await handleUploadPresigned({
      body: body as HandleUploadPresignedBody,
      request: c.req.raw,
      getSignedToken: async (pathname) => ({
        token: await issueSignedToken({pathname, operations: ["put"], validUntil: Date.now() + 10 * 60 * 1000, ...UPLOAD_RULES}),
        urlOptions: {...UPLOAD_RULES, addRandomSuffix: true},
      }),
    });
    return c.json(result);
  }
  const result = await handleUpload({
    body: body as HandleUploadBody,
    request: c.req.raw,
    onBeforeGenerateToken: async () => ({...UPLOAD_RULES, addRandomSuffix: true}),
  });
  return c.json(result);
});

// Local development stand-in for Vercel Blob: the raw image bytes are the request body.
uploadRoutes.post("/local", requireMember, async (c) => {
  if (storageKind !== "local") return c.json({error: "正式環境請使用 Vercel Blob 上傳"}, 400);
  const bytes = new Uint8Array(await c.req.arrayBuffer());
  if (bytes.length > MAX_UPLOAD_BYTES) return c.json({error: `檔案超過 ${schemas.limits.maxUploadMB} MB`}, 413);
  const type = sniffImageType(bytes);
  if (!type) return c.json({error: "只接受 JPEG、PNG、WebP 圖片"}, 415);
  return c.json({url: await saveLocal(bytes, type)});
});
