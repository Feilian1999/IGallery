import {placeOn, viewingSpot, capsule, boxCapsule} from "./geometry";

// Summer festival: an open-air shrine square at night (meters, +x east, +z south).
//
//                 stage  ▭▭▭▭  (fn on the signboard in front)
//      fw1  ┃                          ┃  fe1
//      fw2  ┃          [yagura]        ┃  fe2      stalls along both sides,
//      fw3  ┃                          ┃  fe3      paintings on their back boards
//                      ⛩ torii (portal back to the main hall)
export const SQUARE = {minX: -13, maxX: 13, minZ: -15, maxZ: 11};

const STALL_ROWS = [-8, -2.5, 3];
export const STALL = {width: 4.2, depth: 1.5, counterHeight: 0.95, roofHeight: 3.7, boardInset: 0.15};
const BOARD_X = 11;

// One stall per slot: x of its back board, which way it faces, and the canopy color.
export const STALLS = [
  ...STALL_ROWS.map((z, i) => ({slot: `fw${i + 1}`, x: -BOARD_X, z, facing: 1, canopy: ["#c8323c", "#2d4a8a", "#e07a2a"][i]})),
  ...STALL_ROWS.map((z, i) => ({slot: `fe${i + 1}`, x: BOARD_X, z, facing: -1, canopy: ["#2d6a4f", "#c8323c", "#6a3d9a"][i]})),
];

export const YAGURA = {center: [0, -1.5], size: 2.6, deck: 2.6, roof: 4.3};
export const STAGE = {center: [0, -12.6], width: 9, depth: 3.6, height: 0.7};
export const SIGNBOARD = {center: [0, -9.4], width: 3.4, height: 3.1};
export const TORII = {center: [0, 9.6], width: 5.2, height: 5};

export const SLOT_PLACEMENTS = {
  ...Object.fromEntries(STALLS.map((stall) => [stall.slot, placeOn([stall.x, stall.z], [stall.facing, 0], STALL.boardInset)])),
  fn: placeOn([SIGNBOARD.center[0], SIGNBOARD.center[1]], [0, 1], 0.12),
};

// the portal stands inside the torii and leads back to the main hall
export const PORTAL = {...placeOn([TORII.center[0], TORII.center[1]], [0, -1], 0, 0), target: "main"};
export const SPAWN = {position: [0, 4.2], heading: Math.PI};

// Lantern strings: from the top of the yagura out to poles around the square.
export const POLES = [[-12.4, -13.8], [0, -15.2], [12.4, -13.8], [-12.4, -5.2], [12.4, -5.2], [-12.4, 5.8], [12.4, 5.8], [-4.2, 10.4], [4.2, 10.4]];
export const POLE_HEIGHT = 4.4;

const stallCollider = (stall) => boxCapsule([stall.x + stall.facing * (STALL.depth / 2 + 0.05), stall.z], Math.PI / 2, STALL.width, STALL.depth);

export const COLLIDERS = {
  segments: [
    capsule([SQUARE.minX, SQUARE.minZ], [SQUARE.maxX, SQUARE.minZ], 0.1),
    capsule([SQUARE.maxX, SQUARE.minZ], [SQUARE.maxX, SQUARE.maxZ], 0.1),
    capsule([SQUARE.minX, SQUARE.maxZ], [SQUARE.maxX, SQUARE.maxZ], 0.1),
    capsule([SQUARE.minX, SQUARE.minZ], [SQUARE.minX, SQUARE.maxZ], 0.1),
    ...STALLS.map(stallCollider),
    boxCapsule(STAGE.center, 0, STAGE.width, STAGE.depth),
    boxCapsule(SIGNBOARD.center, 0, SIGNBOARD.width, 0.3),
  ],
  circles: [
    [YAGURA.center[0], YAGURA.center[1], YAGURA.size * 0.72],
    // torii pillars
    [TORII.center[0] - TORII.width / 2, TORII.center[1], 0.4],
    [TORII.center[0] + TORII.width / 2, TORII.center[1], 0.4],
    ...POLES.map(([x, z]) => [x, z, 0.2]),
  ],
  rings: [],
};

export const INTERACTABLES = [
  // arrive just inside the main hall's south door, where the visitor left
  {id: "portal", type: "portal", position: viewingSpot(PORTAL, 1.2), radius: 1.6, label: "回到主展廳", target: "main", arrival: {position: [3, 7.6], heading: Math.PI}},
];

export const BOUNDS = {minX: SQUARE.minX, maxX: SQUARE.maxX, minZ: SQUARE.minZ, maxZ: SQUARE.maxZ};
