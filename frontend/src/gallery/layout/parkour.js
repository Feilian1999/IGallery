import {placeOn, viewingSpot, slab} from "./geometry";
import {STAIRS_ARRIVAL} from "./mainHall";

// Upstairs: a run of platforms hanging in the dark, with nothing underneath (meters,
// +x east, +z south, heights above the starting deck). It is reached by the stairs in
// the main hall, and the floating room can only be entered from its far end.
//
//        [finish]  9  8
//                        7
//                          [6]         a sprint is needed to reach 6
//                           .
//        2   3  ==4==  [5]             4 is a narrow beam, 5 a checkpoint
//        1
//     [start]
export const THICKNESS = 0.4;

const START = {center: [0, 0], size: [6, 6], top: 0};
const FINISH = {center: [-1.6, -21.4], size: [5, 5], top: 3};

// kind: "deck" (start, finish and the checkpoint in between) or "step"
export const PLATFORMS = [
  {...START, kind: "deck", checkpoint: {heading: Math.PI}},
  {center: [0, -5.4], size: [2.2, 2.2], top: 0.3, kind: "step"},
  {center: [0, -8.9], size: [2, 2], top: 0.7, kind: "step"},
  {center: [2.9, -11.2], size: [2, 2], top: 1.1, kind: "step"},
  {center: [7.4, -11.2], size: [4.4, 0.7], top: 1.1, kind: "step"},
  {center: [11.8, -11.2], size: [3, 3], top: 1.3, kind: "deck", checkpoint: {heading: Math.PI}},
  {center: [11.8, -17.2], size: [2.6, 2.6], top: 1.3, kind: "step"},
  {center: [9.2, -19.6], size: [1.6, 1.6], top: 1.8, kind: "step"},
  {center: [6.4, -21.4], size: [1.6, 1.6], top: 2.4, kind: "step"},
  {center: [3.4, -21.4], size: [1.6, 1.6], top: 3, kind: "step"},
  {...FINISH, kind: "deck", checkpoint: {heading: -Math.PI / 2}},
];

// Back down to the main hall from the starting deck, and on to the floating room from the last one.
export const PORTAL_HOME = {...placeOn([START.center[0], START.center[1] + 2.5], [0, -1], 0, START.top), target: "main"};
export const PORTAL_ANNEX = {...placeOn([FINISH.center[0] - 2, FINISH.center[1]], [1, 0], 0, FINISH.top), target: "annex"};

export const SPAWN = {position: [0, 0.6], heading: Math.PI, height: START.top};
// falling this far below the starting deck puts the visitor back on the last checkpoint
export const FALL_HEIGHT = -9;
// nothing overhead, so the third person camera may rise as far as it likes
export const CAMERA_CEILING = 60;

export const COLLIDERS = {
  segments: [],
  circles: [],
  rings: [],
  floor: null,
  slabs: PLATFORMS.map(({center, size, top, checkpoint}) => slab({
    center, length: size[0], width: size[1], top, bottom: top - THICKNESS,
    // where to put the visitor back after a fall
    checkpoint: checkpoint && {position: center, height: top, heading: checkpoint.heading},
  })),
};

export const INTERACTABLES = [
  {id: "home", type: "portal", position: viewingSpot(PORTAL_HOME, 1.2), radius: 1.6, label: "prompt.backToMain", target: "main", arrival: STAIRS_ARRIVAL},
  {id: "annex", type: "portal", position: viewingSpot(PORTAL_ANNEX, 1.2), radius: 1.6, minHeight: FINISH.top - 0.5, label: "prompt.enterAnnex", target: "annex"},
];

export const BOUNDS = {minX: -6, maxX: 15, minZ: -25, maxZ: 4};
