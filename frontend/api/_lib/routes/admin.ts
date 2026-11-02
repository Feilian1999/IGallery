import {Hono} from "hono";
import * as artworks from "../artworks";
import * as schemas from "../schemas";
import {parse} from "../http";
import {query} from "../db";
import {requireAdmin, type AuthEnv} from "../auth";
import {hashPassword} from "../password";
import {removeImage} from "../storage";
import {notify} from "../notifications";
import * as applications from "../applications";

// Review queue, every artwork, the exhibition layout, and user accounts.
export const adminRoutes = new Hono<AuthEnv>();
adminRoutes.use("*", requireAdmin);

const STATUSES = new Set(["draft", "pending", "published", "rejected"]);

adminRoutes.get("/artworks", async (c) => {
  const status = c.req.query("status");
  return c.json({artworks: await artworks.listArtworks({
    viewerId: c.get("user").id,
    status: status && STATUSES.has(status) ? (status as artworks.Status) : undefined,
  })});
});

// registered before /artworks/:id so "order" isn't taken for an id
adminRoutes.put("/artworks/order", async (c) => {
  const body = await parse(c.req.raw, schemas.reorder);
  if (!body.data) return c.json({error: body.error}, 400);
  await artworks.reorderArtworks(body.data.ids);
  return c.json({ok: true});
});

adminRoutes.patch("/artworks/:id", async (c) => {
  const body = await parse(c.req.raw, schemas.adminUpdateArtwork);
  if (!body.data) return c.json({error: body.error}, 400);
  const before = await artworks.getArtwork(c.req.param("id"));
  if (!before) return c.json({error: "找不到這件作品"}, 404);
  const artwork = await artworks.updateArtwork(before.id, body.data);
  if (before.status === "published" && artwork?.status === "draft") {
    await notify(before.owner?.id, "unpublished", {artworkId: before.id, actorId: c.get("user").id});
  }
  return c.json({artwork});
});

adminRoutes.post("/artworks/:id/approve", async (c) => {
  const artwork = await artworks.getArtwork(c.req.param("id"));
  if (!artwork) return c.json({error: "找不到這件作品"}, 404);
  if (artwork.aiUsage === "unspecified") return c.json({error: "這件作品還沒標註是否使用 AI"}, 400);
  const updated = await artworks.updateArtwork(artwork.id, {status: "published", reviewNote: ""});
  await notify(artwork.owner?.id, "approved", {artworkId: artwork.id, actorId: c.get("user").id});
  return c.json({artwork: updated});
});

adminRoutes.post("/artworks/:id/reject", async (c) => {
  const body = await parse(c.req.raw, schemas.rejectBody);
  if (!body.data) return c.json({error: body.error}, 400);
  const artwork = await artworks.updateArtwork(c.req.param("id"), {status: "rejected", reviewNote: body.data.reason});
  if (!artwork) return c.json({error: "找不到這件作品"}, 404);
  await notify(artwork.owner?.id, "rejected", {artworkId: artwork.id, actorId: c.get("user").id, message: body.data.reason});
  return c.json({artwork});
});

adminRoutes.delete("/artworks/:id", async (c) => {
  const artwork = await artworks.deleteArtwork(c.req.param("id"));
  if (!artwork) return c.json({error: "找不到這件作品"}, 404);
  // the artwork row is gone, so the notification carries its title instead
  await notify(artwork.owner?.id, "removed", {actorId: c.get("user").id, message: artwork.title || "未命名"});
  await Promise.all([removeImage(artwork.imageUrl), removeImage(artwork.previewUrl)]).catch((error) => console.error(error));
  return c.json({ok: true});
});

adminRoutes.get("/exhibition", async (c) => c.json({placements: await artworks.getPlacements()}));

adminRoutes.put("/exhibition", async (c) => {
  const body = await parse(c.req.raw, schemas.exhibition);
  if (!body.data) return c.json({error: body.error}, 400);
  // only published work can hang in the gallery
  const published = new Set((await artworks.listArtworks({status: "published"})).map((artwork) => artwork.id));
  if (!Object.values(body.data.placements).every((id) => published.has(id))) return c.json({error: "只能展出已公開的作品"}, 400);
  await artworks.setPlacements(body.data.placements);
  return c.json({placements: body.data.placements});
});

// Members asking to become artists.
adminRoutes.get("/artist-applications", async (c) => {
  const status = c.req.query("status");
  return c.json({applications: await applications.listApplications(status === "approved" || status === "rejected" ? status : "pending")});
});

adminRoutes.post("/artist-applications/:id/approve", async (c) => {
  const application = await applications.decideApplication(Number(c.req.param("id")), true, c.get("user").id);
  if (!application) return c.json({error: "找不到這份申請，或已經處理過了"}, 404);
  await notify(application.userId, "artist_approved", {actorId: c.get("user").id});
  return c.json({application});
});

adminRoutes.post("/artist-applications/:id/reject", async (c) => {
  const body = await parse(c.req.raw, schemas.rejectBody);
  if (!body.data) return c.json({error: body.error}, 400);
  const application = await applications.decideApplication(Number(c.req.param("id")), false, c.get("user").id, body.data.reason);
  if (!application) return c.json({error: "找不到這份申請，或已經處理過了"}, 404);
  await notify(application.userId, "artist_rejected", {actorId: c.get("user").id, message: body.data.reason});
  return c.json({application});
});

adminRoutes.get("/users", async (c) => c.json({users: await artworks.listUsers()}));

adminRoutes.patch("/users/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (id === c.get("user").id) return c.json({error: "不能變更自己的角色"}, 400);
  const body = await parse(c.req.raw, schemas.roleBody);
  if (!body.data) return c.json({error: body.error}, 400);
  const [target] = await query("select role from users where id = $1 and role <> 'guest'", [id]);
  if (!target) return c.json({error: "找不到這個使用者"}, 404);
  if (target.role !== body.data.role) {
    await query("update users set role = $2 where id = $1", [id, body.data.role]);
    await notify(id, "role", {actorId: c.get("user").id, message: body.data.role});
  }
  return c.json({ok: true});
});

// Members can't reset their own password, so an admin sets a new one for them.
adminRoutes.post("/users/:id/password", async (c) => {
  const body = await parse(c.req.raw, schemas.resetPasswordBody);
  if (!body.data) return c.json({error: body.error}, 400);
  const id = Number(c.req.param("id"));
  const rows = await query("update users set password_hash = $2 where id = $1 and role <> 'guest' returning id", [id, await hashPassword(body.data.password)]);
  if (!rows.length) return c.json({error: "找不到這個使用者"}, 404);
  // sign them out everywhere so the old password's sessions end
  await query("delete from sessions where user_id = $1", [id]);
  return c.json({ok: true});
});

adminRoutes.delete("/users/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (id === c.get("user").id) return c.json({error: "不能刪除自己的帳號"}, 400);
  const owned = await artworks.listArtworks({ownerId: id});
  const rows = await query("delete from users where id = $1 returning id", [id]);
  if (!rows.length) return c.json({error: "找不到這個使用者"}, 404);
  // their artworks were removed with the account; clean up the files too
  await Promise.all(owned.flatMap((artwork) => [removeImage(artwork.imageUrl), removeImage(artwork.previewUrl)])).catch((error) => console.error(error));
  return c.json({ok: true});
});
