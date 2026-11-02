import {placeOn, viewingSpot, normalize} from "./geometry";

// The annex: a round, dark hall where artworks float in a ring around a
// projection disc. Reached through the portal in the main hall.
export const RADIUS = 10;
export const RING_RADIUS = 6.8;
export const PROJECTION = {center: [0, 0], radius: 2.6};
// The ring has room for this many pieces; any further artworks are not shown here.
export const MAX_PIECES = 12;

const ringPoint = (angle, radius) => [Math.sin(angle) * radius, -Math.cos(angle) * radius];

// Spreads `count` pieces over the north side of the ring, leaving the south free for the portal.
export const ringPlacements = (count) => {
  const shown = Math.min(count, MAX_PIECES);
  return Array.from({length: shown}, (_, i) => {
    const angle = shown === 1 ? 0 : -2.3 + (4.6 * i) / (shown - 1);
    return placeOn(ringPoint(angle, RING_RADIUS), normalize([-Math.sin(angle), Math.cos(angle)]), 0, 2.25);
  });
};

export const PORTAL = {...placeOn([0, 8.7], [0, -1], 0, 0), target: "main"};
export const SPAWN = {position: [0, 6.6], heading: Math.PI};

// A small pedestal under each floating piece blocks walking through it.
export const colliders = (placements) => ({
  segments: [],
  circles: placements.map((placement) => [placement.position[0], placement.position[2], 0.55]),
  rings: [[0, 0, RADIUS - 0.4]],
});

export const INTERACTABLES = [
  {id: "portal", type: "portal", position: viewingSpot(PORTAL, 1.2), radius: 1.6, label: "回到主展廳", target: "main"},
];

export const BOUNDS = {minX: -RADIUS, maxX: RADIUS, minZ: -RADIUS, maxZ: RADIUS};
