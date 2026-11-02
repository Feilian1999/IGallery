// Fills an empty database with the sample artworks bundled in public/artworks
// (public-domain paintings from Wikimedia Commons),
// published and hung in their original slots.
//
//   npm run db:seed   (uses DATABASE_URL if set, otherwise the local PGlite database)
import * as sample from "../src/shared/sampleArtworks.json";
import {query} from "../api/_lib/db";
import {insertArtwork, setPlacements} from "../api/_lib/artworks";

export const seedIfEmpty = async () => {
  const [{count}] = await query("select count(*)::int as count from artworks");
  if (count > 0) return false;
  // the samples belong to the first admin
  const [admin] = await query("select id from users where role = 'admin' order by id limit 1");
  if (!admin) throw new Error("no admin account to own the sample artworks; set ADMIN_USERNAME / ADMIN_PASSWORD");
  const placements: Record<string, string> = {};
  for (const item of sample.artworks) {
    // centuries-old paintings, so no AI involved
    const artwork = await insertArtwork({...item, ownerId: admin.id, aiUsage: "none", status: "published"});
    placements[item.slot] = artwork.id;
    if (item.featured) placements.feature = artwork.id;
  }
  await setPlacements(placements);
  console.log(`[igallery] seeded ${sample.artworks.length} sample artworks`);
  return true;
};

if (require.main === module) {
  seedIfEmpty().then((seeded) => {
    if (!seeded) console.log("[igallery] database already has artworks, nothing to seed");
    process.exit(0);
  });
}
