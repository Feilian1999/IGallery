import {resolveBody, STEP_HEIGHT} from "./collision";

// How a visitor's body moves. Nothing here reads the keyboard, the camera, the store
// or three.js: a body is advanced from an intent, so the same step can drive the local
// visitor today and replay or predict other visitors (in the browser or on a server)
// once the gallery is shared.

export const BODY_RADIUS = 0.38;

// Speeds in metres per second, accelerations in metres per second squared.
export const TUNING = {
  walk: 3.8,
  sprint: 6.4,
  crouch: 1.9,
  // walking backwards is a little slower
  backpedal: 0.82,
  accelGround: 34,
  decelGround: 26,
  // in the air a direction only nudges the body, and letting go barely slows it
  accelAir: 9,
  decelAir: 0.6,
  gravity: 21,
  // how high a jump rises
  jumpApex: 1,
  // a jump still counts this long after walking off the ground...
  coyote: 0.12,
  // ...and one asked for this long before landing happens on touchdown
  jumpBuffer: 0.13,
  terminalFall: 40,
  pitchLimit: 1.5,
};
const JUMP_SPEED = Math.sqrt(2 * TUNING.gravity * TUNING.jumpApex);

// `vector` makes the position and velocity; anything with x / y / z works (the scene passes THREE.Vector3).
export const createPlayer = (vector = () => ({x: 0, y: 0, z: 0})) => ({
  // y is the height of the feet above the floor
  position: vector(),
  velocity: vector(),
  // where the body faces and how far the head tilts up (+) or down (-)
  heading: Math.PI,
  pitch: 0,
  onGround: true,
  // height of the surface under the body (-Infinity over a drop) and the slab it belongs to, if any
  ground: 0,
  surface: null,
  // a direction is being held
  moving: false,
  running: false,
  crouching: false,
  // seconds left in which a jump may still start, and in which a requested one is remembered
  coyote: 0,
  jumpBuffer: 0,
  // seconds since leaving the ground, and the fastest fall of that flight
  airTime: 0,
  fallSpeed: 0,
  // what the last step did, for sounds and camera effects: a jump began, or the
  // body touched down at this speed (0 when it didn't)
  jumped: false,
  landed: 0,
  // null, or the bench seat the mascot is sitting on
  seat: null,
  // emote waiting to be played by this visitor's mascot
  emote: null,
});

/**
 * Advance a body by one step.
 * @param {object} player a body from createPlayer
 * @param {object} intent what the visitor is asking for: `forward` / `strafe` in -1..1
 *   relative to the heading, `sprint` and `crouch` while held, `jump` on the step it was
 *   pressed, and the `heading` / `pitch` they look along
 * @param {number} dt seconds
 * @param {object} colliders the room's colliders: walls, plus any slabs to climb and jump between
 */
export const stepPlayer = (player, intent, dt, colliders) => {
  const {position, velocity} = player;
  player.heading = intent.heading;
  player.pitch = Math.max(-TUNING.pitchLimit, Math.min(TUNING.pitchLimit, intent.pitch));
  player.jumped = false;
  player.landed = 0;

  let {forward, strafe} = intent;
  const push = Math.hypot(forward, strafe);
  if (push > 1) {
    forward /= push;
    strafe /= push;
  }
  player.moving = push > 0.1;

  // sitting: any wish to move or jump stands the mascot up
  if (player.seat) {
    if (!player.moving && !intent.jump) {
      velocity.x = 0;
      velocity.y = 0;
      velocity.z = 0;
      player.running = false;
      player.crouching = false;
      return;
    }
    player.seat = null;
  }

  player.crouching = Boolean(intent.crouch);
  // sprinting is for going forwards: it needs speed to start, and a jump carries it
  const wantsSprint = Boolean(intent.sprint) && forward > 0.55 && Math.abs(strafe) < 0.6 && !player.crouching;
  const speedNow = Math.hypot(velocity.x, velocity.z);
  player.running = wantsSprint && (player.onGround ? speedNow > TUNING.walk * 0.6 : player.running);

  let speed = player.crouching ? TUNING.crouch : wantsSprint ? TUNING.sprint : TUNING.walk;
  if (forward < 0) speed *= 1 + (TUNING.backpedal - 1) * -forward;
  const sin = Math.sin(player.heading);
  const cos = Math.cos(player.heading);
  const wishX = (sin * forward - cos * strafe) * speed;
  const wishZ = (cos * forward + sin * strafe) * speed;

  let gapX = wishX - velocity.x;
  let gapZ = wishZ - velocity.z;
  let rate = player.moving ? TUNING.accelGround : TUNING.decelGround;
  if (!player.onGround) {
    rate = player.moving ? TUNING.accelAir : TUNING.decelAir;
    if (!player.moving) {
      gapX = -velocity.x;
      gapZ = -velocity.z;
    }
  }
  const gap = Math.hypot(gapX, gapZ);
  const change = rate * dt;
  if (gap <= change || gap < 1e-6) {
    if (player.onGround || player.moving) {
      velocity.x = wishX;
      velocity.z = wishZ;
    }
  } else {
    velocity.x += (gapX / gap) * change;
    velocity.z += (gapZ / gap) * change;
  }

  player.coyote = player.onGround ? TUNING.coyote : Math.max(0, player.coyote - dt);
  player.jumpBuffer = intent.jump ? TUNING.jumpBuffer : Math.max(0, player.jumpBuffer - dt);
  if (player.jumpBuffer > 0 && player.coyote > 0) {
    velocity.y = JUMP_SPEED;
    player.jumpBuffer = 0;
    player.coyote = 0;
    player.onGround = false;
    player.crouching = false;
    player.jumped = true;
  }

  // gravity is split around the move so the arc is the same at any frame rate
  velocity.y = Math.max(-TUNING.terminalFall, velocity.y - TUNING.gravity * dt * 0.5);
  const fallingAt = -velocity.y;
  const fromX = position.x;
  const fromY = position.y;
  const fromZ = position.z;
  position.x += velocity.x * dt;
  position.y += velocity.y * dt;
  position.z += velocity.z * dt;
  const {ground, slab} = resolveBody(position, BODY_RADIUS, colliders, fromY);
  // speed a wall took away is gone, so the body slides along it instead of pressing in
  if (dt > 0) {
    const actualX = (position.x - fromX) / dt;
    const actualZ = (position.z - fromZ) / dt;
    if (Math.hypot(actualX, actualZ) < Math.hypot(velocity.x, velocity.z)) {
      velocity.x = actualX;
      velocity.z = actualZ;
    }
    // and a ceiling ends the rise
    if (position.y < fromY + velocity.y * dt - 1e-9 && velocity.y > 0) velocity.y = 0;
  }

  const wasOnGround = player.onGround;
  player.ground = ground;
  player.surface = slab;
  // walking keeps the feet on steps and slopes that fall away gently; anything
  // further down is a drop
  const followsDown = wasOnGround && !player.jumped && position.y - ground <= STEP_HEIGHT;
  player.onGround = velocity.y <= 0 && (position.y <= ground || followsDown);
  if (player.onGround) {
    position.y = ground;
    velocity.y = 0;
    if (!wasOnGround) player.landed = Math.max(fallingAt, player.fallSpeed, 0.01);
    player.airTime = 0;
    player.fallSpeed = 0;
  } else {
    // a ledge met on the way up lifts the feet onto it
    if (position.y < ground) position.y = ground;
    velocity.y -= TUNING.gravity * dt * 0.5;
    player.airTime += dt;
    player.fallSpeed = Math.max(player.fallSpeed, -velocity.y);
  }
};
