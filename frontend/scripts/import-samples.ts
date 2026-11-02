// Gives the bundled sample paintings to one account: adds the ones the database doesn't
// have yet (published, no AI) and moves any that already exist to that account. The
// exhibition layout is left alone, so the owner can arrange the halls themselves.
//
//   npm run db:import-samples -- <username>   (uses DATABASE_URL if set, otherwise local PGlite)
import * as sample from "../src/shared/sampleArtworks.json";
import {query, databaseKind} from "../api/_lib/db";
import {insertArtwork} from "../api/_lib/artworks";

const run = async (username: string) => {
  const [owner] = await query("select id, role from users where lower(username) = lower($1)", [username]);
  if (!owner) throw new Error(`no account named ${username}`);
  if (owner.role !== "admin" && owner.role !== "artist") throw new Error(`${username} is a ${owner.role}; only artists and admins can own artworks`);
  console.log(`[igallery] ${databaseKind} database, owner ${username} (#${owner.id})`);
  for (const {slot, featured, ...item} of sample.artworks) {
    const [existing] = await query("select id, owner_id from artworks where image_url = $1", [item.imageUrl]);
    if (!existing) {
      await insertArtwork({...item, ownerId: owner.id, aiUsage: "none", status: "published"});
      console.log(`  added  ${item.title}`);
    } else if (existing.owner_id !== owner.id) {
      await query("update artworks set owner_id = $2, updated_at = now() where id = $1", [existing.id, owner.id]);
      console.log(`  moved  ${item.title}`);
    } else {
      console.log(`  kept   ${item.title}`);
    }
  }
};

const username = process.argv[2];
if (!username) {
  console.error("usage: npm run db:import-samples -- <username>");
  process.exit(1);
}
run(username).then(() => process.exit(0), (error) => {
  console.error(`[igallery] ${error.message}`);
  process.exit(1);
});
