import {Hono} from "hono";
import {issueSignedToken} from "@vercel/blob";
import {handleUpload, handleUploadPresigned, type HandleUploadBody, type HandleUploadPresignedBody} from "@vercel/blob/client";
import * as schemas from "../schemas";
import {currentUser, requireArtist, CSRF_HEADER, type AuthEnv} from "../auth";
import {storageKind, blobAuth, sniffImageType, saveLocal} from "../storage";
import {fail} from "../i18n";

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
  if (storageKind !== "blob") return fail(c, 400, "upload.blobNotConfigured");
  const body = (await c.req.json()) as HandleUploadBody | HandleUploadPresignedBody;
  if (PERMISSION_REQUESTS.has(body.type)) {
    const user = await currentUser(c);
    if (c.req.header(CSRF_HEADER) !== "1" || !user) return fail(c, 401, "auth.signInFirst");
    if (user.role !== "admin" && user.role !== "artist") return fail(c, 403, "upload.artistsOnly");
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
uploadRoutes.post("/local", requireArtist, async (c) => {
  if (storageKind !== "local") return fail(c, 400, "upload.useBlob");
  const bytes = new Uint8Array(await c.req.arrayBuffer());
  if (bytes.length > MAX_UPLOAD_BYTES) return fail(c, 413, "upload.tooLarge", {mb: schemas.limits.maxUploadMB});
  const type = sniffImageType(bytes);
  if (!type) return fail(c, 415, "upload.unsupportedType");
  return c.json({url: await saveLocal(bytes, type)});
});
