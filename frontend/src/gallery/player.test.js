import {createPlayer, stepPlayer, TUNING, BODY_RADIUS} from "./player";
import {slab} from "./layout/geometry";

const OPEN = {segments: [], circles: [], rings: []};
const STEP = 1 / 60;
const IDLE = {forward: 0, strafe: 0, sprint: false, crouch: false, jump: false, heading: 0, pitch: 0};
const speedOf = (player) => Math.hypot(player.velocity.x, player.velocity.z);
const run = (player, intent, seconds, colliders = OPEN) => {
  for (let t = 0; t < seconds; t += STEP) stepPlayer(player, {...IDLE, ...intent}, STEP, colliders);
};

test("reaches walking speed quickly and stops soon after letting go", () => {
  const player = createPlayer();
  run(player, {forward: 1}, 0.2);
  expect(speedOf(player)).toBeCloseTo(TUNING.walk, 5);
  expect(player.moving).toBe(true);
  run(player, {}, 0.2);
  expect(speedOf(player)).toBe(0);
  expect(player.moving).toBe(false);
});

test("walks along the heading, and diagonals are no faster", () => {
  const player = createPlayer();
  run(player, {forward: 1, heading: Math.PI / 2}, 1);
  expect(player.position.x).toBeGreaterThan(3);
  expect(Math.abs(player.position.z)).toBeLessThan(1e-6);
  run(player, {forward: 1, strafe: 1}, 1);
  expect(speedOf(player)).toBeCloseTo(TUNING.walk, 5);
});

test("sprints forwards only, crouches slowly and backs up a little slower", () => {
  const player = createPlayer();
  run(player, {forward: 1, sprint: true}, 1);
  expect(speedOf(player)).toBeCloseTo(TUNING.sprint, 5);
  expect(player.running).toBe(true);
  run(player, {strafe: 1, sprint: true}, 1);
  expect(speedOf(player)).toBeCloseTo(TUNING.walk, 5);
  expect(player.running).toBe(false);
  run(player, {forward: 1, crouch: true, sprint: true}, 1);
  expect(speedOf(player)).toBeCloseTo(TUNING.crouch, 5);
  run(player, {forward: -1}, 1);
  expect(speedOf(player)).toBeCloseTo(TUNING.walk * TUNING.backpedal, 5);
});

test("a jump rises to its apex, lands again and reports the landing", () => {
  const player = createPlayer();
  stepPlayer(player, {...IDLE, jump: true}, STEP, OPEN);
  expect(player.jumped).toBe(true);
  expect(player.onGround).toBe(false);
  let apex = 0;
  let landed = 0;
  let steps = 1;
  while (!player.onGround && steps < 600) {
    stepPlayer(player, IDLE, STEP, OPEN);
    apex = Math.max(apex, player.position.y);
    landed = player.landed;
    steps++;
  }
  expect(apex).toBeCloseTo(TUNING.jumpApex, 1);
  expect(player.position.y).toBe(0);
  expect(landed).toBeGreaterThan(5);
  // up and down under gravity takes 2 * sqrt(2h / g)
  expect(steps * STEP).toBeCloseTo(2 * Math.sqrt((2 * TUNING.jumpApex) / TUNING.gravity), 1);
});

test("a jump pressed just before landing still happens, and the air keeps the speed", () => {
  const player = createPlayer();
  run(player, {forward: 1, sprint: true}, 1);
  stepPlayer(player, {...IDLE, forward: 1, sprint: true, jump: true}, STEP, OPEN);
  let buffered = false;
  for (let i = 0; i < 600 && !buffered; i++) {
    // let go in the air: almost no speed is lost until the feet touch down
    const nearFloor = player.velocity.y < 0 && player.position.y < 0.2;
    stepPlayer(player, {...IDLE, jump: nearFloor}, STEP, OPEN);
    buffered = player.jumped;
    if (!player.onGround && !buffered) expect(speedOf(player)).toBeGreaterThan(TUNING.sprint * 0.9);
  }
  expect(buffered).toBe(true);
});

test("stops at a wall and loses the speed it had into it", () => {
  const player = createPlayer();
  const wall = {segments: [[-5, 2, 5, 2, 0]], circles: [], rings: []};
  run(player, {forward: 1}, 2, wall);
  expect(player.position.z).toBeCloseTo(2 - BODY_RADIUS, 3);
  expect(speedOf(player)).toBeLessThan(0.05);
});

test("stays seated until asked to move or jump, and clamps the pitch", () => {
  const player = createPlayer();
  player.seat = {position: [0, 0], heading: 0};
  run(player, {pitch: 9}, 0.1);
  expect(player.seat).not.toBeNull();
  expect(player.pitch).toBe(TUNING.pitchLimit);
  stepPlayer(player, {...IDLE, jump: true}, STEP, OPEN);
  expect(player.seat).toBeNull();
});

// a ramp rising 1.8 m northwards (-z) over 3 m, onto a landing, then a 3 m gap and a far platform
const COURSE = {
  segments: [], circles: [], rings: [],
  slabs: [
    slab({center: [0, -2.5], direction: [0, -1], length: 3, width: 2, top: [0, 1.8]}),
    slab({center: [0, -5], direction: [0, -1], length: 2, width: 2, top: 1.8}),
    slab({center: [0, -11], direction: [0, -1], length: 4, width: 2, top: 1.8, bottom: 1.4}),
  ],
};
const NORTH = Math.PI;

test("walks up a ramp and back down without leaving the ground", () => {
  const player = createPlayer();
  let airborne = 0;
  for (let t = 0; t < 1.3; t += STEP) {
    stepPlayer(player, {...IDLE, forward: 1, heading: NORTH}, STEP, COURSE);
    if (!player.onGround) airborne++;
  }
  expect(player.position.y).toBeCloseTo(1.8, 5);
  for (let t = 0; t < 1.3; t += STEP) {
    stepPlayer(player, {...IDLE, forward: 1, heading: 0}, STEP, COURSE);
    if (!player.onGround) airborne++;
  }
  expect(player.position.y).toBe(0);
  expect(airborne).toBe(0);
});

test("the side of a ramp is a wall, and walking off a ledge is a fall", () => {
  const player = createPlayer();
  player.position.x = -3;
  player.position.z = -3;
  run(player, {forward: 1, heading: Math.PI / 2}, 1.5, COURSE);
  expect(player.position.x).toBeCloseTo(-1 - BODY_RADIUS, 3);
  expect(player.position.y).toBe(0);

  const faller = createPlayer();
  faller.position.y = 1.8;
  faller.position.z = -5;
  run(faller, {forward: 1, heading: NORTH}, 0.4, COURSE);
  expect(faller.onGround).toBe(false);
  run(faller, {}, 1, COURSE);
  expect(faller.position.y).toBe(0);
});

test("a sprinting jump clears a gap a walk cannot, and a room without a floor keeps falling", () => {
  const leap = (sprint) => {
    const player = createPlayer();
    player.position.y = 1.8;
    player.position.z = -4.2;
    const colliders = {...COURSE, floor: null};
    for (let t = 0; t < 3; t += STEP) {
      const atEdge = player.onGround && player.position.z < -5.95 && player.position.z > -6.6;
      stepPlayer(player, {...IDLE, forward: player.position.z > -8.5 ? 1 : 0, sprint, jump: atEdge, heading: NORTH}, STEP, colliders);
    }
    return player;
  };
  const sprinter = leap(true);
  expect(sprinter.onGround).toBe(true);
  expect(sprinter.position.y).toBeCloseTo(1.8, 5);
  expect(sprinter.surface).toBe(COURSE.slabs[2]);
  const walker = leap(false);
  expect(walker.onGround).toBe(false);
  expect(walker.position.y).toBeLessThan(-10);
});

test("jumping under a platform stops at its underside", () => {
  const player = createPlayer();
  player.position.z = -11;
  stepPlayer(player, {...IDLE, jump: true}, STEP, COURSE);
  let highest = 0;
  for (let t = 0; t < 1; t += STEP) {
    stepPlayer(player, IDLE, STEP, COURSE);
    highest = Math.max(highest, player.position.y);
  }
  // the underside is at 1.4 and the jump only reaches 1 m, so it never touches; a lower one does
  expect(highest).toBeCloseTo(1, 1);
  const low = {...COURSE, slabs: [slab({center: [0, -9], length: 2, width: 2, top: 2.6, bottom: 2.2})]};
  const bumped = createPlayer();
  bumped.position.z = -9;
  stepPlayer(bumped, {...IDLE, jump: true}, STEP, low);
  highest = 0;
  for (let t = 0; t < 1; t += STEP) {
    stepPlayer(bumped, IDLE, STEP, low);
    highest = Math.max(highest, bumped.position.y);
  }
  expect(highest).toBeCloseTo(0.5, 1);
  expect(bumped.position.y).toBe(0);
});
