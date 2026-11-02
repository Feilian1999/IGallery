import {Hono} from "hono";
import type {ZodType} from "zod";
import {issueSignedToken} from "@vercel/blob";
import {handleUpload, handleUploadPresigned, type HandleUploadBody, type HandleUploadPresignedBody} from "@vercel/blob/client";
import * as artworks from "./artworks";
import * as schemas from "./schemas";
import {login, logout, currentUser, requireAdmin, CSRF_HEADER, type User} from "./auth";
import {storageKind, blobAuth, sniffImageType, saveLocal, readLocal, removeImage} from "./storage";
import {databaseKind} from "./db";

type Env = {Variables: {user: User}};

const MAX_UPLOAD_BYTES = schemas.limits.maxUploadMB * 1024 * 1024;
const FIELD_NAMES: Record<string, string> = {
  title: "標題", author: "作者", character: "角色", description: "描述", story: "作品故事",
  hotspots: "細節熱點", imageUrl: "圖片", previewUrl: "預覽圖", username: "帳號", password: "密碼",
};

// Parses and validates a JSON body; returns the data or a 400 response.
const parse = async <T>(request: Request, schema: ZodType<T>) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return {error: "請求內容不是有效的 JSON"};
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const messages = result.error.issues.map((issue) => {
      const field = FIELD_NAMES[String(issue.path[0])];
      return field ? `${field}：${issue.message}` : issue.message;
    });
    return {error: [...new Set(messages)].join("；")};
  }
  return {data: result.data};
};

export const app = new Hono<Env>().basePath("/api");

app.onError((error, c) => {
  console.error(error);
  return c.json({error: "伺服器發生錯誤"}, 500);
});

// --- public -----------------------------------------------------------------

app.get("/health", (c) => c.json({ok: true, storage: storageKind, database: databaseKind}));

app.get("/artworks", async (c) => c.json({artworks: await artworks.listArtworks({publishedOnly: true})}));

app.get("/artworks/:id", async (c) => {
  const artwork = await artworks.getArtwork(c.req.param("id"), {publishedOnly: true});
  return artwork ? c.json({artwork}) : c.json({error: "找不到這件作品"}, 404);
});

// Everything the 3D gallery needs: published artworks and which slot each one hangs in.
app.get("/exhibition", async (c) => {
  const published = await artworks.listArtworks({publishedOnly: true});
  const ids = new Set(published.map((artwork) => artwork.id));
  const placements = Object.fromEntries(Object.entries(await artworks.getPlacements()).filter(([, id]) => ids.has(id)));
  return c.json({artworks: published, placements});
});

// Locally uploaded images (development only; production images are served by Vercel Blob).
app.get("/files/:name", async (c) => {
  const file = await readLocal(c.req.param("name"));
  if (!file) return c.json({error: "找不到檔案"}, 404);
  return c.body(new Uint8Array(file.bytes), 200, {"content-type": file.type, "cache-control": "public, max-age=31536000, immutable"});
});

// --- session ----------------------------------------------------------------

app.post("/auth/login", async (c) => {
  const body = await parse(c.req.raw, schemas.loginBody);
  if (!body.data) return c.json({error: body.error}, 400);
  const user = await login(c, body.data.username, body.data.password);
  if (!user) {
    // slow down password guessing a little
    await new Promise((resolve) => setTimeout(resolve, 600));
    return c.json({error: "帳號或密碼錯誤"}, 401);
  }
  return c.json({user});
});

app.post("/auth/logout", async (c) => {
  await logout(c);
  return c.json({ok: true});
});

app.get("/auth/me", async (c) => {
  const user = await currentUser(c);
  return user ? c.json({user, storage: storageKind, blobAuth}) : c.json({error: "尚未登入"}, 401);
});

// Vercel Blob client uploads. The browser asks this route for permission to upload
// (admins only), then sends the file straight to Blob, bypassing the 4.5 MB function
// body limit. With a read-write token that permission is a client token; with OIDC
// (BLOB_STORE_ID) it is a short-lived presigned URL.
const UPLOAD_RULES = {allowedContentTypes: schemas.limits.imageTypes, maximumSizeInBytes: MAX_UPLOAD_BYTES};
const PERMISSION_REQUESTS = new Set(["blob.generate-client-token", "blob.generate-presigned-url"]);

app.post("/admin/blob", async (c) => {
  if (storageKind !== "blob") return c.json({error: "尚未設定 Vercel Blob"}, 400);
  const body = (await c.req.json()) as HandleUploadBody | HandleUploadPresignedBody;
  if (PERMISSION_REQUESTS.has(body.type)) {
    if (c.req.header(CSRF_HEADER) !== "1" || !(await currentUser(c))) return c.json({error: "請先登入"}, 401);
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

// --- admin ------------------------------------------------------------------

const admin = new Hono<Env>();
admin.use("*", requireAdmin);

// Local development stand-in for Vercel Blob: the raw image bytes are the request body.
admin.post("/uploads/local", async (c) => {
  if (storageKind !== "local") return c.json({error: "正式環境請使用 Vercel Blob 上傳"}, 400);
  const bytes = new Uint8Array(await c.req.arrayBuffer());
  if (bytes.length > MAX_UPLOAD_BYTES) return c.json({error: `檔案超過 ${schemas.limits.maxUploadMB} MB`}, 413);
  const type = sniffImageType(bytes);
  if (!type) return c.json({error: "只接受 JPEG、PNG、WebP 圖片"}, 415);
  return c.json({url: await saveLocal(bytes, type)});
});

admin.get("/artworks", async (c) => c.json({artworks: await artworks.listArtworks({publishedOnly: false})}));

admin.post("/artworks", async (c) => {
  const body = await parse(c.req.raw, schemas.createArtwork);
  if (!body.data) return c.json({error: body.error}, 400);
  return c.json({artwork: await artworks.insertArtwork(body.data)}, 201);
});

// registered before /artworks/:id so "order" isn't taken for an id
admin.put("/artworks/order", async (c) => {
  const body = await parse(c.req.raw, schemas.reorder);
  if (!body.data) return c.json({error: body.error}, 400);
  await artworks.reorderArtworks(body.data.ids);
  return c.json({ok: true});
});

admin.get("/artworks/:id", async (c) => {
  const artwork = await artworks.getArtwork(c.req.param("id"), {publishedOnly: false});
  return artwork ? c.json({artwork}) : c.json({error: "找不到這件作品"}, 404);
});

admin.patch("/artworks/:id", async (c) => {
  const body = await parse(c.req.raw, schemas.updateArtwork);
  if (!body.data) return c.json({error: body.error}, 400);
  const artwork = await artworks.updateArtwork(c.req.param("id"), body.data);
  return artwork ? c.json({artwork}) : c.json({error: "找不到這件作品"}, 404);
});

admin.delete("/artworks/:id", async (c) => {
  const artwork = await artworks.deleteArtwork(c.req.param("id"));
  if (!artwork) return c.json({error: "找不到這件作品"}, 404);
  // the row is gone either way; a failed file cleanup shouldn't fail the request
  await Promise.all([removeImage(artwork.imageUrl), removeImage(artwork.previewUrl)]).catch((error) => console.error(error));
  return c.json({ok: true});
});

admin.get("/exhibition", async (c) => c.json({placements: await artworks.getPlacements()}));

admin.put("/exhibition", async (c) => {
  const body = await parse(c.req.raw, schemas.exhibition);
  if (!body.data) return c.json({error: body.error}, 400);
  const known = new Set((await artworks.listArtworks({publishedOnly: false})).map((artwork) => artwork.id));
  if (!Object.values(body.data.placements).every((id) => known.has(id))) return c.json({error: "包含不存在的作品"}, 400);
  await artworks.setPlacements(body.data.placements);
  return c.json({placements: body.data.placements});
});

app.route("/admin", admin);

app.notFound((c) => c.json({error: "找不到這個 API"}, 404));
