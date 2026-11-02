import {Hono} from "hono";
import * as artworks from "../artworks";
import * as schemas from "../schemas";
import {parse} from "../http";
import {query} from "../db";
import {requireUser, requireMember, requireArtist, toUser, USER_COLUMNS, type AuthEnv, type User} from "../auth";
import * as applications from "../applications";
import {removeImage} from "../storage";
import {notifyAdmins, listNotifications, markRead, unreadCount} from "../notifications";

// The signed-in user's own profile and artworks.
export const meRoutes = new Hono<AuthEnv>();
meRoutes.use("*", requireUser);

// The member's latest application to become an artist, if any.
meRoutes.get("/artist-application", async (c) => c.json({application: await applications.latestApplication(c.get("user").id)}));

meRoutes.post("/artist-application", requireMember, async (c) => {
  const user = c.get("user");
  if (user.role !== "member") return c.json({error: "你已經可以發布作品了"}, 400);
  const body = await parse(c.req.raw, schemas.artistApplicationBody);
  if (!body.data) return c.json({error: body.error}, 400);
  const application = await applications.createApplication(user.id, body.data.message, body.data.links);
  if (!application) return c.json({error: "你的申請還在審核中"}, 400);
  await notifyAdmins("artist_requested", {actorId: user.id});
  return c.json({application}, 201);
});

meRoutes.patch("/profile", async (c) => {
  const body = await parse(c.req.raw, schemas.profileBody);
  if (!body.data) return c.json({error: body.error}, 400);
  const user = c.get("user");
  const {displayName, bio, likesPublic, commission} = body.data;
  const [row] = await query(
      `update users set
         display_name = coalesce($2, display_name), bio = coalesce($3, bio), likes_public = coalesce($4, likes_public),
         commission_open = coalesce($5, commission_open), commission_info = coalesce($6, commission_info),
         commission_contact = coalesce($7, commission_contact), commission_plans = coalesce($8::jsonb, commission_plans)
       where id = $1
       returning ${USER_COLUMNS.replace(/u\./g, "")}`,
      [
        user.id, displayName ?? null, bio ?? null, likesPublic ?? null,
        commission?.open ?? null, commission?.info ?? null, commission?.contact ?? null,
        commission ? JSON.stringify(commission.plans) : null,
      ],
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

meRoutes.get("/likes", async (c) => c.json({artworks: await artworks.likedArtworks(c.get("user").id)}));

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

meRoutes.post("/artworks", requireArtist, async (c) => {
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

meRoutes.patch("/artworks/:id", requireArtist, async (c) => {
  const artwork = await owned(c.get("user"), c.req.param("id"));
  if (!artwork) return c.json({error: "找不到這件作品"}, 404);
  const body = await parse(c.req.raw, schemas.updateArtwork);
  if (!body.data) return c.json({error: body.error}, 400);
  return c.json({artwork: await artworks.updateArtwork(artwork.id, body.data)});
});

meRoutes.delete("/artworks/:id", requireArtist, async (c) => {
  const artwork = await owned(c.get("user"), c.req.param("id"));
  if (!artwork) return c.json({error: "找不到這件作品"}, 404);
  await artworks.deleteArtwork(artwork.id);
  // the row is gone either way; a failed file cleanup shouldn't fail the request
  await Promise.all([removeImage(artwork.imageUrl), removeImage(artwork.previewUrl)]).catch((error) => console.error(error));
  return c.json({ok: true});
});

// Members send work for review; an admin's own work is published straight away.
meRoutes.post("/artworks/:id/submit", requireArtist, async (c) => {
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
meRoutes.post("/artworks/:id/withdraw", requireArtist, async (c) => {
  const artwork = await owned(c.get("user"), c.req.param("id"));
  if (!artwork) return c.json({error: "找不到這件作品"}, 404);
  if (!["pending", "published"].includes(artwork.status)) return c.json({error: "這件作品目前是草稿"}, 400);
  return c.json({artwork: await artworks.updateArtwork(artwork.id, {status: "draft"})});
});
