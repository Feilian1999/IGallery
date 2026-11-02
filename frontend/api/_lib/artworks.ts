import {randomUUID} from "node:crypto";
import {query} from "./db";

export type Status = "draft" | "pending" | "published" | "rejected";
export type AiUsage = "unspecified" | "none" | "assisted" | "generated";

export type Artwork = {
  id: string;
  title: string;
  author: string;
  character: string;
  description: string;
  story: string;
  imageUrl: string;
  previewUrl: string;
  width: number;
  height: number;
  hotspots: {x: number; y: number; label: string; note: string}[];
  aiUsage: AiUsage;
  status: Status;
  reviewNote: string;
  sortOrder: number;
  owner: {id: number; displayName: string} | null;
  likes: number;
  liked: boolean;
  createdAt: string;
  updatedAt: string;
};

// $1 is always the viewing user's id (or null), used for "liked".
const SELECT = `
  select a.id, a.title, a.author, a.character_name, a.description, a.story, a.image_url, a.preview_url,
    a.width, a.height, a.hotspots, a.ai_usage, a.status, a.review_note, a.sort_order, a.owner_id,
    a.created_at, a.updated_at, coalesce(nullif(u.display_name, ''), u.username) as owner_name,
    (select count(*) from likes l where l.artwork_id = a.id)::int as likes,
    exists (select 1 from likes l where l.artwork_id = a.id and l.user_id = $1) as liked
  from artworks a left join users u on u.id = a.owner_id`;

const toArtwork = (row: Record<string, any>): Artwork => ({
  id: row.id,
  title: row.title,
  author: row.author,
  character: row.character_name,
  description: row.description,
  story: row.story,
  imageUrl: row.image_url,
  previewUrl: row.preview_url,
  width: row.width,
  height: row.height,
  hotspots: typeof row.hotspots === "string" ? JSON.parse(row.hotspots) : row.hotspots,
  aiUsage: row.ai_usage,
  status: row.status,
  reviewNote: row.review_note,
  sortOrder: row.sort_order,
  owner: row.owner_id ? {id: row.owner_id, displayName: row.owner_name} : null,
  likes: row.likes,
  liked: row.liked,
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
});

type ListOptions = {viewerId?: number | null; status?: Status; ownerId?: number};

export const listArtworks = async ({viewerId = null, status, ownerId}: ListOptions = {}) => {
  const params: unknown[] = [viewerId];
  const where: string[] = [];
  if (status) {
    params.push(status);
    where.push(`a.status = $${params.length}`);
  }
  if (ownerId !== undefined) {
    params.push(ownerId);
    where.push(`a.owner_id = $${params.length}`);
  }
  const rows = await query(`${SELECT} ${where.length ? `where ${where.join(" and ")}` : ""} order by a.sort_order, a.created_at`, params);
  return rows.map(toArtwork);
};

export const getArtwork = async (id: string, viewerId: number | null = null) => {
  const [row] = await query(`${SELECT} where a.id = $2`, [viewerId, id]);
  return row ? toArtwork(row) : null;
};

export const insertArtwork = async (input: {
  ownerId: number; imageUrl: string; previewUrl: string; width: number; height: number; title: string;
  author?: string; character?: string; description?: string; story?: string; aiUsage?: AiUsage;
  hotspots?: Artwork["hotspots"]; status?: Status;
}) => {
  // new artworks go to the end of the order
  const [row] = await query(
      `insert into artworks (id, owner_id, title, author, character_name, description, story, image_url, preview_url,
        width, height, hotspots, ai_usage, status, sort_order)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14,
        (select coalesce(max(sort_order), -1) + 1 from artworks))
       returning id`,
      [
        randomUUID(), input.ownerId, input.title, input.author || "", input.character || "", input.description || "",
        input.story || "", input.imageUrl, input.previewUrl, input.width, input.height,
        JSON.stringify(input.hotspots || []), input.aiUsage || "unspecified", input.status || "draft",
      ],
  );
  return getArtwork(row.id) as Promise<Artwork>;
};

// Maps API field names to columns for partial updates.
const UPDATABLE: Record<string, string> = {
  title: "title",
  author: "author",
  character: "character_name",
  description: "description",
  story: "story",
  hotspots: "hotspots",
  aiUsage: "ai_usage",
  status: "status",
  reviewNote: "review_note",
};

export const updateArtwork = async (id: string, changes: Record<string, unknown>) => {
  const sets: string[] = [];
  const params: unknown[] = [];
  Object.entries(changes).forEach(([key, value]) => {
    const column = UPDATABLE[key];
    if (!column || value === undefined) return;
    params.push(column === "hotspots" ? JSON.stringify(value) : value);
    sets.push(`${column} = $${params.length}${column === "hotspots" ? "::jsonb" : ""}`);
  });
  if (sets.length) {
    params.push(id);
    await query(`update artworks set ${sets.join(", ")}, updated_at = now() where id = $${params.length}`, params);
  }
  return getArtwork(id);
};

export const deleteArtwork = async (id: string) => {
  const artwork = await getArtwork(id);
  if (artwork) await query("delete from artworks where id = $1", [id]);
  return artwork;
};

// One statement, so it's a single round trip to the database.
export const reorderArtworks = async (ids: string[]) => {
  await query(
      `update artworks a set sort_order = o.position - 1
       from unnest($1::text[]) with ordinality as o(id, position)
       where a.id = o.id`,
      [ids],
  );
};

export const getPlacements = async () => {
  const rows = await query("select slot, artwork_id from placements");
  return Object.fromEntries(rows.map((row) => [row.slot, row.artwork_id])) as Record<string, string>;
};

// Replaces the whole layout in one statement, so a failure can't leave it half-saved:
// upsert the given slots, then clear every slot that wasn't given.
export const setPlacements = async (placements: Record<string, string>) => {
  const entries = Object.entries(placements);
  await query(
      `with saved as (
         insert into placements (slot, artwork_id)
         select * from unnest($1::text[], $2::text[])
         on conflict (slot) do update set artwork_id = excluded.artwork_id
         returning slot
       )
       delete from placements where slot not in (select slot from saved)`,
      [entries.map(([slot]) => slot), entries.map(([, id]) => id)],
  );
};

export const like = async (userId: number, artworkId: string) => {
  await query("insert into likes (user_id, artwork_id) values ($1, $2) on conflict do nothing", [userId, artworkId]);
};

export const unlike = async (userId: number, artworkId: string) => {
  await query("delete from likes where user_id = $1 and artwork_id = $2", [userId, artworkId]);
};

// Registered artists with published work, ranked by the likes their published works received.
export const artistRanking = async (limit = 10) => {
  const rows = await query(
      `select u.id, coalesce(nullif(u.display_name, ''), u.username) as name,
         count(distinct a.id)::int as works, count(l.user_id)::int as likes
       from users u
       join artworks a on a.owner_id = u.id and a.status = 'published'
       left join likes l on l.artwork_id = a.id
       where u.role <> 'guest'
       group by u.id
       order by likes desc, works desc, u.id
       limit $1`,
      [limit],
  );
  return rows.map((row) => ({id: row.id, name: row.name, works: row.works, likes: row.likes}));
};

// Per-user numbers for the dashboard.
export const ownerStats = async (ownerId: number) => {
  const [row] = await query(
      `select
         count(*) filter (where status = 'draft')::int as draft,
         count(*) filter (where status = 'pending')::int as pending,
         count(*) filter (where status = 'published')::int as published,
         count(*) filter (where status = 'rejected')::int as rejected,
         (select count(*) from likes l join artworks x on x.id = l.artwork_id where x.owner_id = $1)::int as likes
       from artworks where owner_id = $1`,
      [ownerId],
  );
  return row;
};

export const pendingCount = async () => {
  const [row] = await query("select count(*)::int as count from artworks where status = 'pending'");
  return row.count as number;
};

// --- user management (admin) -------------------------------------------------

export const listUsers = async () => {
  const rows = await query(
      `select u.id, u.username, coalesce(nullif(u.display_name, ''), u.username) as display_name, u.role, u.created_at,
         (select count(*) from artworks a where a.owner_id = u.id)::int as works
       from users u where u.role <> 'guest' order by u.created_at`,
  );
  return rows.map((row) => ({
    id: row.id, username: row.username, displayName: row.display_name, role: row.role,
    works: row.works, createdAt: new Date(row.created_at).toISOString(),
  }));
};
