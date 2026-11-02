// The exhibition the 3D gallery shows: published artworks, which slot each hangs
// in, and the rooms built from them. Loaded from /api/exhibition; the bundled
// sample artworks are used until then, or if the API can't be reached.
import sample from "../shared/sampleArtworks.json";
import {buildRooms} from "./layout";

const sampleData = () => {
  const artworks = sample.artworks.map(({slot, featured, ...artwork}) => ({id: `sample-${slot}`, ...artwork}));
  const placements = Object.fromEntries(sample.artworks.map(({slot}) => [slot, `sample-${slot}`]));
  const featured = sample.artworks.find((artwork) => artwork.featured);
  if (featured) placements.feature = `sample-${featured.slot}`;
  return {artworks, placements};
};

export const buildExhibition = ({artworks, placements}, source) => ({
  source,
  artworks,
  byId: Object.fromEntries(artworks.map((artwork) => [artwork.id, artwork])),
  feature: artworks.find((artwork) => artwork.id === placements.feature) || null,
  rooms: buildRooms(artworks, placements),
});

export const sampleExhibition = () => buildExhibition(sampleData(), "sample");

export const fetchExhibition = async () => {
  const response = await fetch("/api/exhibition");
  if (!response.ok) throw new Error(`exhibition request failed: ${response.status}`);
  return buildExhibition(await response.json(), "api");
};
