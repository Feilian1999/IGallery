import {Hono} from "hono";
import * as artworks from "../artworks";
import {currentUser, requireMember, type AuthEnv} from "../auth";
import {storageKind, readLocal} from "../storage";
import {databaseKind} from "../db";
import {notify} from "../notifications";

export const publicRoutes = new Hono<AuthEnv>();

publicRoutes.get("/health", (c) => c.json({ok: true, storage: storageKind, database: databaseKind}));

publicRoutes.get("/artworks", async (c) => {
  const viewer = await currentUser(c);
  return c.json({artworks: await artworks.listArtworks({viewerId: viewer?.id ?? null, status: "published"})});
});

publicRoutes.get("/artworks/:id", async (c) => {
  const viewer = await currentUser(c);
  const artwork = await artworks.getArtwork(c.req.param("id"), viewer?.id ?? null);
  return artwork?.status === "published" ? c.json({artwork}) : c.json({error: "找不到這件作品"}, 404);
});

// Likes count toward the artist ranking, so only members can give them, and not to themselves.
const likeRoute = (liking: boolean) => async (c: any) => {
  const user = c.get("user");
  const artwork = await artworks.getArtwork(c.req.param("id"), user.id);
  if (artwork?.status !== "published") return c.json({error: "找不到這件作品"}, 404);
  if (artwork.owner?.id === user.id) return c.json({error: "不能對自己的作品按喜歡"}, 400);
  if (liking) {
    await artworks.like(user.id, artwork.id);
    await notify(artwork.owner?.id, "like", {artworkId: artwork.id, actorId: user.id});
  } else {
    await artworks.unlike(user.id, artwork.id);
  }
  const updated = await artworks.getArtwork(artwork.id, user.id);
  return c.json({likes: updated?.likes ?? 0, liked: updated?.liked ?? false});
};
publicRoutes.post("/artworks/:id/like", requireMember, likeRoute(true));
publicRoutes.delete("/artworks/:id/like", requireMember, likeRoute(false));

publicRoutes.get("/artists/ranking", async (c) => {
  const limit = Math.min(50, Math.max(1, Math.floor(Number(c.req.query("limit"))) || 10));
  return c.json({artists: await artworks.artistRanking(limit)});
});

// Everything the 3D gallery needs: published artworks and which slot each one hangs in.
publicRoutes.get("/exhibition", async (c) => {
  const viewer = await currentUser(c);
  const published = await artworks.listArtworks({viewerId: viewer?.id ?? null, status: "published"});
  const ids = new Set(published.map((artwork) => artwork.id));
  const placements = Object.fromEntries(Object.entries(await artworks.getPlacements()).filter(([, id]) => ids.has(id)));
  return c.json({artworks: published, placements});
});

// Locally uploaded images (development only; production images are served by Vercel Blob).
publicRoutes.get("/files/:name", async (c) => {
  const file = await readLocal(c.req.param("name"));
  if (!file) return c.json({error: "找不到檔案"}, 404);
  return c.body(new Uint8Array(file.bytes), 200, {"content-type": file.type, "cache-control": "public, max-age=31536000, immutable"});
});
