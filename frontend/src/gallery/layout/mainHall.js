import {segmentNormal, placeOn, lerpPoint, viewingSpot, capsule, boxCapsule, normalize} from "./geometry";

// Main hall floor plan (meters, +x east, +z south):
//
//            curved north wall (paintings n1 n2 n3)
//        D ⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒⌒ E
//   graffiti /    benches   \ portal
//          C       (●)        F       ● floating piece on a platform, the way to the festival
//   e1     |   P2 ╲    ╱ P1   |   w1   P1 / P2 freestanding partitions
//          B ─ door ─ window ─ A       south wall, opens to the outdoors
export const WALL_HEIGHT = 5.4;
export const PARTITION_HEIGHT = 3.5;
export const PARTITION_THICKNESS = 0.24;

const A = [-14, 10];
const B = [14, 10];
const C = [14, -4];
const D = [9, -10];
const E = [-9, -10];
const F = [-14, -4];

// The north wall is an arc bulging away from the room.
export const ARC = {center: [0, -1.875], radius: 12.125, from: 0.8355, to: -0.8355, segments: 16};
const arcPoint = (angle, radius = ARC.radius) => [
  ARC.center[0] + Math.sin(angle) * radius,
  ARC.center[1] - Math.cos(angle) * radius,
];
const arcPoints = Array.from({length: ARC.segments + 1}, (_, i) =>
  arcPoint(ARC.from + ((ARC.to - ARC.from) * i) / ARC.segments));

// Floor outline, in order around the room.
export const BOUNDARY = [A, B, C, ...arcPoints, F];
const CENTER = [0, 0];

// Every wall except the south one, which has a window and a door cut into it.
export const PERIMETER_WALLS = [[B, C], [C, D], ...arcPoints.slice(1).map((point, i) => [arcPoints[i], point]), [E, F], [F, A]]
    .map(([a, b]) => ({start: a, end: b, normal: segmentNormal(a, b, CENTER)}));

export const SOUTH_WALL = {
  start: A,
  end: B,
  thickness: 0.3,
  window: {from: -10, to: -3, bottom: 0.9, top: 4.3},
  door: {from: 1.5, to: 4.5, top: 3.4},
};

export const PARTITIONS = [
  {start: [-9, 6.5], end: [-5.5, 3.5]},
  {start: [5.5, 3.5], end: [9, 6.5]},
];

// Each freestanding wall has a straight face for the painting and short curved
// wings that fold toward the viewer, so it reads as a shallow bay rather than
// a flat slab. `bend` is how far each wing turns, in radians.
export const PARTITION_WING = {length: 1, bend: 0.95};
const WING_STEPS = 6;

// The wall's centerline in its own frame: u runs along the wall, v toward the viewer.
export const partitionCenterline = (length) => {
  const radius = PARTITION_WING.length / PARTITION_WING.bend;
  const wing = Array.from({length: WING_STEPS}, (_, i) => {
    const angle = (PARTITION_WING.bend * (i + 1)) / WING_STEPS;
    return [length / 2 + radius * Math.sin(angle), radius * (1 - Math.cos(angle))];
  });
  return [...wing.map(([u, v]) => [-u, v]).reverse(), [-length / 2, 0], [length / 2, 0], ...wing];
};

// Both partitions present their painting toward the entrance.
const VIEWER = [0, 10];
const partitionFrame = (partition) => {
  const length = Math.hypot(partition.end[0] - partition.start[0], partition.end[1] - partition.start[1]);
  const direction = [(partition.end[0] - partition.start[0]) / length, (partition.end[1] - partition.start[1]) / length];
  return {
    length,
    direction,
    normal: segmentNormal(partition.start, partition.end, VIEWER),
    mid: lerpPoint(partition.start, partition.end, 0.5),
  };
};

// The same centerlines in world coordinates, for collisions and the map.
export const PARTITION_PATHS = PARTITIONS.map((partition) => {
  const {length, direction, normal, mid} = partitionFrame(partition);
  return partitionCenterline(length).map(([u, v]) => [
    mid[0] + direction[0] * u + normal[0] * v,
    mid[1] + direction[1] * u + normal[1] * v,
  ]);
});

// Colored feature panels stand slightly proud of the wall behind each painting,
// the way many museums set works against a deep accent color.
export const BAY = {width: 4.4, depth: 0.04, bottom: 0.1, top: WALL_HEIGHT - 0.08};
// paintings hang this far out from a plain wall surface, clear of the panel
const HANG_OFFSET = BAY.depth + 0.06;

const partitionFace = (partition) => {
  const {normal, mid} = partitionFrame(partition);
  return placeOn(mid, normal, PARTITION_THICKNESS / 2 + HANG_OFFSET);
};

const onArc = (angle) => {
  const point = arcPoint(angle, ARC.radius - 0.1);
  // the wall curves toward the label beside the painting, so hold it further out
  return {...placeOn(point, normalize([-Math.sin(angle), Math.cos(angle)]), 0), labelDepth: 0.26};
};

const ARC_SLOTS = {n1: -0.42, n2: 0, n3: 0.42};
const SIDE_SLOTS = {e1: {point: [14, 2.5], normal: [-1, 0]}, w1: {point: [-14, 2.5], normal: [1, 0]}};

// Where each wall slot is. Which artwork hangs in a slot is decided in the admin page.
export const SLOT_PLACEMENTS = {
  ...Object.fromEntries(Object.entries(ARC_SLOTS).map(([id, angle]) => [id, onArc(angle)])),
  ...Object.fromEntries(Object.entries(SIDE_SLOTS).map(([id, {point, normal}]) => [id, placeOn(point, normal, HANG_OFFSET)])),
  // partition faces that look back toward the entrance
  s2: partitionFace(PARTITIONS[0]),
  s1: partitionFace(PARTITIONS[1]),
};

// Centerlines of the feature panels on the perimeter walls, in world coordinates.
// The curved wall is built from straight chords, so its panels sit a little
// further in to stay in front of every chord.
const BAY_INSET = BAY.depth / 2 + 0.005;
const arcBay = (angle) => {
  const half = BAY.width / 2 / ARC.radius;
  return Array.from({length: 17}, (_, i) => arcPoint(angle - half + (half * 2 * i) / 16, ARC.radius - BAY_INSET));
};
const lineBay = ({point, normal}) => {
  const tangent = [-normal[1], normal[0]];
  return [-1, 1].map((side) => [
    point[0] + normal[0] * BAY_INSET + (tangent[0] * side * BAY.width) / 2,
    point[1] + normal[1] * BAY_INSET + (tangent[1] * side * BAY.width) / 2,
  ]);
};
export const WALL_BAYS = [...Object.values(ARC_SLOTS).map(arcBay), ...Object.values(SIDE_SLOTS).map(lineBay)];

const benchAt = (angle) => {
  const position = arcPoint(angle, 6.6);
  return {
    position,
    rotationY: -angle,
    // sitting faces the curved wall
    heading: Math.atan2(Math.sin(angle), -Math.cos(angle)),
  };
};
export const BENCHES = [benchAt(-0.32), benchAt(0.32)];
export const BENCH_SIZE = {length: 2.2, depth: 0.55, height: 0.46};

export const PLATFORM = {center: [0, -2.6], radius: 1.7, height: 0.22};

const chamferNormal = (a, b) => segmentNormal(a, b, CENTER);
export const PORTAL = {...placeOn(lerpPoint(E, F, 0.5), chamferNormal(E, F), 0.45, 0), target: "annex"};
// The piece floating above the platform is also the way to the summer festival:
// walk up to the platform and step through it.
export const FESTIVAL_GATE = {position: PLATFORM.center, radius: PLATFORM.radius + 1.1, target: "festival"};
// where the visitor lands when coming back from the festival, facing the platform
export const FESTIVAL_ARRIVAL = {position: [0, 0.4], heading: Math.PI};
export const GRAFFITI = {...placeOn(lerpPoint(C, D, 0.5), chamferNormal(C, D), 0.04, 1.95), width: 5, height: 2.6};

export const SPAWN = {position: [3, 4.2], heading: Math.PI};
export const BALL_START = [-1.6, 5.6];

export const COLLIDERS = {
  segments: [
    ...PERIMETER_WALLS.map((wall) => capsule(wall.start, wall.end, 0)),
    capsule(A, B, 0.15),
    ...PARTITION_PATHS.flatMap((path) => path.slice(1).map((point, i) => capsule(path[i], point, PARTITION_THICKNESS / 2))),
    ...BENCHES.map((bench) => boxCapsule(bench.position, bench.rotationY, BENCH_SIZE.length, BENCH_SIZE.depth)),
  ],
  circles: [
    [PLATFORM.center[0], PLATFORM.center[1], PLATFORM.radius],
  ],
  rings: [],
};

// Things the visitor can press F on. `radius` is how close they need to be.
export const INTERACTABLES = [
  ...BENCHES.map((bench, i) => ({id: `bench${i}`, type: "bench", position: bench.position, radius: 1.5, label: "坐下", seat: bench})),
  {id: "portal", type: "portal", position: viewingSpot(PORTAL, 1.2), radius: 1.6, label: "進入懸浮展廳", target: "annex"},
  {id: "festival", type: "portal", position: FESTIVAL_GATE.position, radius: FESTIVAL_GATE.radius, label: "前往夏日祭典", target: "festival"},
  {id: "graffiti", type: "graffiti", position: viewingSpot(GRAFFITI, 2.2), radius: 2.2, label: "開始塗鴉"},
];

export const BOUNDS = {minX: -14, maxX: 14, minZ: -14, maxZ: 10};
