import {Hono} from "hono";
import * as artworks from "../artworks";
import * as schemas from "../schemas";
import {parse} from "../http";
import {query} from "../db";
import {requireUser, requireMember, toUser, type AuthEnv, type User} from "../auth";
import {removeImage} from "../storage";
import {notifyAdmins, listNotifications, markRead, unreadCount} from "../notifications";

// The signed-in user's own profile and artworks.
export const meRoutes = new Hono<AuthEnv>();
meRoutes.use("*", requireUser);

meRoutes.patch("/profile", async (c) => {
  const body = await parse(c.req.raw, schemas.profileBody);
  if (!body.data) return c.json({error: body.error}, 400);
  const user = c.get("user");
  const [row] = await query(
      `update users set display_name = coalesce($2, display_name), bio = coalesce($3, bio) where id = $1
       returning id, username, display_name, bio, role, created_at`,
      [user.id, body.data.displayName ?? null, body.data.bio ?? null],
  );
  return c.json({user: toUser(row)});
});

meRoutes.get("/notifications", async (c) => {
  const user = c.get("user");
  return c.json({notifications: await listNotifications(user.id), unread: await unreadCount(user.id)});
});

// a cheap call the app polls to keep the bell's badge current
meRoutes.get("/notifications/unread", async (c) => c.json({unread: await unreadCount(c.get("user").id)}));

meRoutes.post("/notifications/read", async (c) => {
  const body = await parse(c.req.raw, schemas.markReadBody);
  if (!body.data) return c.json({error: body.error}, 400);
  await markRead(c.get("user").id, body.data.ids);
  return c.json({unread: await unreadCount(c.get("user").id)});
});

meRoutes.get("/dashboard", async (c) => c.json({stats: await artworks.ownerStats(c.get("user").id)}));

meRoutes.get("/artworks", async (c) => {
  const user = c.get("user");
  return c.json({artworks: await artworks.listArtworks({viewerId: user.id, ownerId: user.id})});
});

// Loads an artwork the user may manage: their own, or any for an admin.
const owned = async (user: User, id: string) => {
  const artwork = await artworks.getArtwork(id, user.id);
  if (!artwork) return null;
  return user.role === "admin" || artwork.owner?.id === user.id ? artwork : null;
};

meRoutes.post("/artworks", requireMember, async (c) => {
  const body = await parse(c.req.raw, schemas.createArtwork);
  if (!body.data) return c.json({error: body.error}, 400);
  const user = c.get("user");
  const artwork = await artworks.insertArtwork({...body.data, ownerId: user.id, author: body.data.author || user.displayName});
  return c.json({artwork}, 201);
});

meRoutes.get("/artworks/:id", async (c) => {
  const artwork = await owned(c.get("user"), c.req.param("id"));
  return artwork ? c.json({artwork}) : c.json({error: "找不到這件作品"}, 404);
});

meRoutes.patch("/artworks/:id", requireMember, async (c) => {
  const artwork = await owned(c.get("user"), c.req.param("id"));
  if (!artwork) return c.json({error: "找不到這件作品"}, 404);
  const body = await parse(c.req.raw, schemas.updateArtwork);
  if (!body.data) return c.json({error: body.error}, 400);
  return c.json({artwork: await artworks.updateArtwork(artwork.id, body.data)});
});

meRoutes.delete("/artworks/:id", requireMember, async (c) => {
  const artwork = await owned(c.get("user"), c.req.param("id"));
  if (!artwork) return c.json({error: "找不到這件作品"}, 404);
  await artworks.deleteArtwork(artwork.id);
  // the row is gone either way; a failed file cleanup shouldn't fail the request
  await Promise.all([removeImage(artwork.imageUrl), removeImage(artwork.previewUrl)]).catch((error) => console.error(error));
  return c.json({ok: true});
});

// Members send work for review; an admin's own work is published straight away.
meRoutes.post("/artworks/:id/submit", requireMember, async (c) => {
  const user = c.get("user");
  const artwork = await owned(user, c.req.param("id"));
  if (!artwork) return c.json({error: "找不到這件作品"}, 404);
  if (artwork.aiUsage === "unspecified") return c.json({error: "送出前請先標註這件作品是否使用 AI"}, 400);
  if (!artwork.title) return c.json({error: "送出前請先填寫標題"}, 400);
  if (!["draft", "rejected"].includes(artwork.status)) return c.json({error: "這件作品已經送出了"}, 400);
  const status = user.role === "admin" ? "published" : "pending";
  const updated = await artworks.updateArtwork(artwork.id, {status, reviewNote: ""});
  if (status === "pending") await notifyAdmins("review_requested", {artworkId: artwork.id, actorId: user.id});
  return c.json({artwork: updated});
});

// Takes work back to draft: cancels a pending review or unpublishes it.
meRoutes.post("/artworks/:id/withdraw", requireMember, async (c) => {
  const artwork = await owned(c.get("user"), c.req.param("id"));
  if (!artwork) return c.json({error: "找不到這件作品"}, 404);
  if (!["pending", "published"].includes(artwork.status)) return c.json({error: "這件作品目前是草稿"}, 400);
  return c.json({artwork: await artworks.updateArtwork(artwork.id, {status: "draft"})});
});
