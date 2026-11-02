import {randomUUID} from "node:crypto";
import {query} from "./db";

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
  status: "draft" | "published";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

const COLUMNS = `id, title, author, character_name, description, story, image_url, preview_url,
  width, height, hotspots, status, sort_order, created_at, updated_at`;

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
  status: row.status,
  sortOrder: row.sort_order,
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
});

export const listArtworks = async ({publishedOnly}: {publishedOnly: boolean}) => {
  const rows = await query(
      `select ${COLUMNS} from artworks ${publishedOnly ? "where status = 'published'" : ""} order by sort_order, created_at`,
  );
  return rows.map(toArtwork);
};

export const getArtwork = async (id: string, {publishedOnly}: {publishedOnly: boolean}) => {
  const [row] = await query(
      `select ${COLUMNS} from artworks where id = $1 ${publishedOnly ? "and status = 'published'" : ""}`,
      [id],
  );
  return row ? toArtwork(row) : null;
};

export const insertArtwork = async (input: {
  imageUrl: string; previewUrl: string; width: number; height: number; title: string;
  author?: string; character?: string; description?: string; story?: string;
  hotspots?: Artwork["hotspots"]; status?: Artwork["status"];
}) => {
  // new artworks go to the end of the order
  const [row] = await query(
      `insert into artworks (id, title, author, character_name, description, story, image_url, preview_url,
        width, height, hotspots, status, sort_order)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12,
        (select coalesce(max(sort_order), -1) + 1 from artworks))
       returning ${COLUMNS}`,
      [
        randomUUID(), input.title, input.author || "", input.character || "", input.description || "", input.story || "",
        input.imageUrl, input.previewUrl, input.width, input.height, JSON.stringify(input.hotspots || []),
        input.status || "draft",
      ],
  );
  return toArtwork(row);
};

// Maps API field names to columns for partial updates.
const UPDATABLE: Record<string, string> = {
  title: "title",
  author: "author",
  character: "character_name",
  description: "description",
  story: "story",
  hotspots: "hotspots",
  status: "status",
};

export const updateArtwork = async (id: string, changes: Partial<Artwork>) => {
  const sets: string[] = [];
  const params: unknown[] = [];
  Object.entries(changes).forEach(([key, value]) => {
    const column = UPDATABLE[key];
    if (!column || value === undefined) return;
    params.push(column === "hotspots" ? JSON.stringify(value) : value);
    sets.push(`${column} = $${params.length}${column === "hotspots" ? "::jsonb" : ""}`);
  });
  if (!sets.length) return getArtwork(id, {publishedOnly: false});
  params.push(id);
  const [row] = await query(
      `update artworks set ${sets.join(", ")}, updated_at = now() where id = $${params.length} returning ${COLUMNS}`,
      params,
  );
  return row ? toArtwork(row) : null;
};

export const deleteArtwork = async (id: string) => {
  const [row] = await query(`delete from artworks where id = $1 returning ${COLUMNS}`, [id]);
  return row ? toArtwork(row) : null;
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
