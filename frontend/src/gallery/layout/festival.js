import {placeOn, viewingSpot, normalize} from "./geometry";

// Summer festival: a round courtyard gallery at dusk (meters, +x east, +z south).
// A covered walkway runs around the outside, with the paintings on its back wall;
// the middle is a raked-gravel garden with a ring of bamboo and a flowering tree,
// paper umbrellas floating above. The torii in the south gap leads back to the main hall.
//
//                    fn
//          fw1   ╭────────╮   fe1
//        fw2    │  garden  │    fe2       walkway between GARDEN_RADIUS and WALL_RADIUS
//          fw3   ╰────────╯   fe3
//                    ⛩
export const WALL_RADIUS = 14;
export const WALL_HEIGHT = 5.4;
// the garden is not walkable; its stone curb is at this radius
export const GARDEN_RADIUS = 10;
export const POST_RADIUS = 10.6;
export const BENCH_RADIUS = 10.95;
export const ROOF = {inner: 10.2, outer: 14.4, innerHeight: 4.8, outerHeight: 5.5};
// the south gap in the wall, where the torii stands (half-width, radians)
export const GATE_HALF_ANGLE = 0.32;
export const BAMBOO = {inner: 7.2, outer: 9.4};
export const TREE = {center: [0, 0], height: 6.5, crown: 3.4};

// angle 0 is north, growing clockwise (east)
export const ringPoint = (angle, radius) => [Math.sin(angle) * radius, -Math.cos(angle) * radius];
const inward = (angle) => normalize([-Math.sin(angle), Math.cos(angle)]);

const DEG = Math.PI / 180;
// where each slot hangs on the back wall
export const SLOT_ANGLES = {fn: 0, fe1: 50 * DEG, fe2: 100 * DEG, fe3: 150 * DEG, fw1: -50 * DEG, fw2: -100 * DEG, fw3: -150 * DEG};

export const SLOT_PLACEMENTS = Object.fromEntries(Object.entries(SLOT_ANGLES).map(([slot, angle]) => [
  slot,
  // the wall curves toward the label beside the painting, so hold it further out (as on the main hall's arc)
  {...placeOn(ringPoint(angle, WALL_RADIUS - 0.08), inward(angle), 0), labelDepth: 0.26},
]));

// Posts holding up the walkway roof, every 20° except in the gate gap.
export const POST_ANGLES = Array.from({length: 18}, (_, i) => i * 20 * DEG).filter((angle) => Math.abs(angle - Math.PI) > GATE_HALF_ANGLE + 0.05);
// Benches sit between posts along the garden edge.
export const BENCH_ANGLES = POST_ANGLES.slice(0, -1).map((angle, i) => (angle + POST_ANGLES[i + 1]) / 2).filter((angle, i) => i % 2 === 0);
export const BENCH = {length: 2.4, depth: 0.5, height: 0.45};

export const TORII = {center: [0, WALL_RADIUS - 0.2], width: 4.2, height: 4.6};
export const PORTAL = {...placeOn([0, WALL_RADIUS - 0.35], [0, -1], 0, 0), target: "main"};
export const SPAWN = {position: [0, 12.1], heading: Math.PI};

export const COLLIDERS = {
  segments: [],
  circles: [
    // the garden, its curb and the benches along it
    [0, 0, BENCH_RADIUS + BENCH.depth / 2 + 0.05],
    ...POST_ANGLES.map((angle) => [...ringPoint(angle, POST_RADIUS), 0.2]),
    // torii pillars
    [TORII.center[0] - TORII.width / 2, TORII.center[1], 0.35],
    [TORII.center[0] + TORII.width / 2, TORII.center[1], 0.35],
  ],
  // stay inside the back wall
  rings: [[0, 0, WALL_RADIUS - 0.35]],
};

export const INTERACTABLES = [
  // arrive in front of the main hall's festival portal, where the visitor left
  {id: "portal", type: "portal", position: viewingSpot(PORTAL, 1.2), radius: 1.6, label: "回到主展廳", target: "main", arrival: {position: [-0.75, 7.6], heading: Math.PI}},
];

// the third person camera stays under the walkway roof and inside the wall
export const CAMERA_CEILING = 4.3;
export const CAMERA_RADIUS = WALL_RADIUS - 0.3;

export const BOUNDS = {minX: -WALL_RADIUS, maxX: WALL_RADIUS, minZ: -WALL_RADIUS, maxZ: WALL_RADIUS};
