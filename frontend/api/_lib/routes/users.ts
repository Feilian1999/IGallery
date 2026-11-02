import {Hono} from "hono";
import * as artworks from "../artworks";
import {query} from "../db";
import {currentUser, toUser, USER_COLUMNS, type AuthEnv} from "../auth";

// Public artist pages: anyone can view a member's profile, published works and
// commission details; favorites only when the member made them public.
export const userRoutes = new Hono<AuthEnv>();

const findArtist = async (id: string) => {
  if (!/^\d+$/.test(id)) return null;
  // guests have no public page
  const [row] = await query(`select ${USER_COLUMNS} from users u where u.id = $1 and u.role <> 'guest'`, [Number(id)]);
  return row ? toUser(row) : null;
};

userRoutes.get("/:id", async (c) => {
  const artist = await findArtist(c.req.param("id"));
  if (!artist) return c.json({error: "找不到這位使用者"}, 404);
  const viewer = await currentUser(c);
  const [stats] = await query(
      `select
         (select count(*) from artworks where owner_id = $1 and status = 'published')::int as works,
         (select count(*) from likes l join artworks a on a.id = l.artwork_id where a.owner_id = $1 and a.status = 'published')::int as likes,
         (select count(*) from likes l join artworks a on a.id = l.artwork_id where l.user_id = $1 and a.status = 'published')::int as favorites`,
      [artist.id],
  );
  const self = viewer?.id === artist.id;
  return c.json({
    user: {
      id: artist.id,
      username: artist.username,
      displayName: artist.displayName,
      bio: artist.bio,
      role: artist.role,
      createdAt: artist.createdAt,
      likesPublic: artist.likesPublic,
      commission: {...artist.commission, contact: artist.commission.open || self ? artist.commission.contact : ""},
    },
    stats: {...stats, favorites: artist.likesPublic || self ? stats.favorites : null},
    self,
  });
});

userRoutes.get("/:id/artworks", async (c) => {
  const artist = await findArtist(c.req.param("id"));
  if (!artist) return c.json({error: "找不到這位使用者"}, 404);
  const viewer = await currentUser(c);
  return c.json({artworks: await artworks.listArtworks({viewerId: viewer?.id ?? null, ownerId: artist.id, status: "published"})});
});

userRoutes.get("/:id/favorites", async (c) => {
  const artist = await findArtist(c.req.param("id"));
  if (!artist) return c.json({error: "找不到這位使用者"}, 404);
  const viewer = await currentUser(c);
  if (!artist.likesPublic && viewer?.id !== artist.id) return c.json({error: "這位使用者沒有公開收藏"}, 403);
  return c.json({artworks: await artworks.likedArtworks(artist.id, viewer?.id ?? null)});
});
