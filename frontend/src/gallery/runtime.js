import * as THREE from "three";
import {createPlayer} from "./player";

// Per-frame state shared between the 3D scene and the overlay UI. It lives
// outside React so updating it every frame never triggers a re-render.
export const runtime = {
  // the local visitor's body; the view follows its heading and pitch
  player: createPlayer(() => new THREE.Vector3()),
  // the photo mode camera, orbiting the robot
  camera: {
    yaw: 0,
    pitch: -0.12,
    photoDistance: 4.5,
  },
  // mouse and touch look travel (radians) not yet applied by the player controller
  look: {dx: 0, dy: 0},
  // {position: [x, z], heading, height?} requested by the map or a portal, applied by the player controller
  teleport: null,
  // ms timestamp (performance.now) when the robot last appeared, drives the spawn effect
  spawnedAt: 0,
  introStartedAt: 0,
  // wall meshes that fade out when they block the third person camera
  occluders: new Set(),
  // recent walking path per room for the map, as [x, z] pairs
  trail: {main: [], parkour: [], annex: [], festival: []},
  // footprints left on the floor: {room, x, y, z, heading, time}
  footprints: [],
  interactRequested: false,
  // the jump key went down since the last frame
  jumpRequested: false,
  // until when (performance.now) the scene renders at full frame rate
  activeUntil: 0,
  keysDown: new Set(),
  dragging: false,
  // set by the canvas so photo mode can grab a frame
  gl: null,
  // frames drawn and frames asked for, for checking the idle frame rate
  frames: 0,
  frameRequests: 0,
};

// Keep rendering at full rate for a little while, e.g. after input or while something animates.
export const markActive = (ms = 1200) => {
  runtime.activeUntil = Math.max(runtime.activeUntil, performance.now() + ms);
};
