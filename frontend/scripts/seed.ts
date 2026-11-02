// Fills an empty database with the sample artworks bundled in public/artworks,
// published and hung in their original slots.
//
//   npm run db:seed   (uses DATABASE_URL if set, otherwise the local PGlite database)
import sample from "../src/shared/sampleArtworks.json";
import {query} from "../api/_lib/db";
import {insertArtwork, setPlacements} from "../api/_lib/artworks";

export const seedIfEmpty = async () => {
  const [{count}] = await query("select count(*)::int as count from artworks");
  if (count > 0) return false;
  const placements: Record<string, string> = {};
  for (const item of sample.artworks) {
    const artwork = await insertArtwork({...item, status: "published"});
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
