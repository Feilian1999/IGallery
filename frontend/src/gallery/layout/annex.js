import {placeOn, viewingSpot, normalize} from "./geometry";

// The annex: a round, dark hall where the artworks drift in a slow carousel around
// a projection disc, each on its own orbit and high enough to walk under. It is
// entered from the far end of the parkour run upstairs.
export const RADIUS = 14;
export const WALL_HEIGHT = 9;
export const PROJECTION = {center: [0, 0], radius: 2.6};
// The carousel has room for this many pieces; any further artworks are not shown here.
export const MAX_PIECES = 12;

// Every piece turns around the middle of the hall at the same rate, so they keep
// their spacing; what differs is how far out and how high each one rides.
export const ORBIT = {minRadius: 4.8, maxRadius: 9.4, speed: 0.045, minHeight: 3.1, maxHeight: 3.6, bob: 0.22};
// Where in that range each piece sits, neighbours kept well apart.
const LANES = [0.35, 1, 0.6, 0.1, 0.8, 0.45, 0.95, 0.2, 0.7, 0.05, 0.55, 0.9];

const orbitOf = (index, count) => ({
  angle: (index / count) * Math.PI * 2,
  radius: ORBIT.minRadius + (ORBIT.maxRadius - ORBIT.minRadius) * LANES[index % LANES.length],
  height: ORBIT.minHeight + (ORBIT.maxHeight - ORBIT.minHeight) * LANES[(index * 5 + 3) % LANES.length],
  phase: index * 1.7,
});

// Where a piece is `seconds` into the carousel: [x, y, z, angle around the middle].
export const orbitPosition = (orbit, seconds) => {
  const angle = orbit.angle + seconds * ORBIT.speed;
  return [
    Math.sin(angle) * orbit.radius,
    orbit.height + Math.sin(seconds * 0.6 + orbit.phase) * ORBIT.bob,
    -Math.cos(angle) * orbit.radius,
    angle,
  ];
};

// The carousel runs on the wall clock, so the scene, the focus check and the map agree.
export const carouselTime = () => performance.now() / 1000;

// The pieces as they stand at the start of the carousel (used by the map), each with its orbit.
export const ringPlacements = (count) => {
  const shown = Math.min(count, MAX_PIECES);
  return Array.from({length: shown}, (_, i) => {
    const orbit = orbitOf(i, shown);
    const [x, y, z, angle] = orbitPosition(orbit, 0);
    return {...placeOn([x, z], normalize([Math.sin(angle), -Math.cos(angle)]), 0, y), orbit};
  });
};

// Pieces move, so the room answers where one is right now...
export const livePosition = (entry, seconds = carouselTime()) => orbitPosition(entry.placement.orbit, seconds);
// ...and where to stand to look at it: a few steps further out, facing in.
export const viewingPose = (entry, seconds = carouselTime()) => {
  const [, , , angle] = livePosition(entry, seconds);
  const radius = Math.min(entry.placement.orbit.radius + 3.4, RADIUS - 1.2);
  return {position: [Math.sin(angle) * radius, -Math.cos(angle) * radius], heading: Math.atan2(-Math.sin(angle), Math.cos(angle))};
};
// A piece counts as being looked at from this far away; the camera stays where it is.
export const FOCUS_RANGE = 5.5;
export const FOCUS_ZOOM = false;

export const PORTAL = {...placeOn([0, RADIUS - 1.3], [0, -1], 0, 0), target: "main"};
export const SPAWN = {position: [0, RADIUS - 3.2], heading: Math.PI};

export const COLLIDERS = {
  segments: [],
  circles: [],
  rings: [[0, 0, RADIUS - 0.4]],
};

export const INTERACTABLES = [
  {id: "portal", type: "portal", position: viewingSpot(PORTAL, 1.2), radius: 1.6, label: "prompt.backToMain", target: "main"},
];

export const BOUNDS = {minX: -RADIUS, maxX: RADIUS, minZ: -RADIUS, maxZ: RADIUS};
