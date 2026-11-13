import {resolveCircle} from "./collision";

// How a visitor's body moves. Nothing here reads the keyboard, the camera, the store
// or three.js: a body is advanced from an intent, so the same step can drive the local
// visitor today and replay or predict other visitors (in the browser or on a server)
// once the gallery is shared.

export const WALK_SPEED = 3.6;
export const RUN_SPEED = 6;
export const BODY_RADIUS = 0.38;
export const PITCH_LIMIT = 1.2;
// metres per second gained while a direction is held, and lost once it is let go
const ACCELERATION = 30;
const BRAKING = 24;

// `vector` makes the position and velocity; anything with x / z works (the scene passes THREE.Vector3).
export const createPlayer = (vector = () => ({x: 0, y: 0, z: 0})) => ({
  position: vector(),
  velocity: vector(),
  // where the body faces and how far the head tilts up (+) or down (-)
  heading: Math.PI,
  pitch: 0,
  moving: false,
  running: false,
  // null, or the bench seat the robot is sitting on
  seat: null,
  // emote waiting to be played by this visitor's robot
  emote: null,
});

/**
 * Advance a body by one step.
 * @param {object} player a body from createPlayer
 * @param {{forward: number, strafe: number, run: boolean, heading: number, pitch: number}} intent
 *   what the visitor is asking for: forward / strafe in -1..1 relative to the heading, and where they look
 * @param {number} dt seconds
 * @param {object} colliders the room's colliders
 */
export const stepPlayer = (player, intent, dt, colliders) => {
  const {position, velocity} = player;
  player.heading = intent.heading;
  player.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, intent.pitch));

  let {forward, strafe} = intent;
  const push = Math.hypot(forward, strafe);
  if (push > 1) {
    forward /= push;
    strafe /= push;
  }
  player.moving = push > 0.01;
  player.running = player.moving && Boolean(intent.run);
  if (player.moving) player.seat = null;
  if (player.seat) {
    velocity.x = 0;
    velocity.z = 0;
    return;
  }

  const speed = player.running ? RUN_SPEED : WALK_SPEED;
  const sin = Math.sin(player.heading);
  const cos = Math.cos(player.heading);
  const wishX = (sin * forward - cos * strafe) * speed;
  const wishZ = (cos * forward + sin * strafe) * speed;
  const gapX = wishX - velocity.x;
  const gapZ = wishZ - velocity.z;
  const gap = Math.hypot(gapX, gapZ);
  const change = (player.moving ? ACCELERATION : BRAKING) * dt;
  if (gap <= change) {
    velocity.x = wishX;
    velocity.z = wishZ;
  } else {
    velocity.x += (gapX / gap) * change;
    velocity.z += (gapZ / gap) * change;
  }

  const fromX = position.x;
  const fromZ = position.z;
  position.x += velocity.x * dt;
  position.z += velocity.z * dt;
  resolveCircle(position, BODY_RADIUS, colliders);
  // speed a wall took away is gone, so the body slides along it instead of pressing in
  if (dt > 0) {
    const actualX = (position.x - fromX) / dt;
    const actualZ = (position.z - fromZ) / dt;
    if (Math.hypot(actualX, actualZ) < Math.hypot(velocity.x, velocity.z)) {
      velocity.x = actualX;
      velocity.z = actualZ;
    }
  }
};
