import {createPlayer, stepPlayer, WALK_SPEED, RUN_SPEED, BODY_RADIUS} from "./player";

const OPEN = {segments: [], circles: [], rings: []};
const STEP = 1 / 60;
const speedOf = (player) => Math.hypot(player.velocity.x, player.velocity.z);
const run = (player, intent, seconds, colliders = OPEN) => {
  for (let t = 0; t < seconds; t += STEP) stepPlayer(player, {strafe: 0, forward: 0, run: false, heading: 0, pitch: 0, ...intent}, STEP, colliders);
};

test("reaches walking speed quickly and stops soon after letting go", () => {
  const player = createPlayer();
  run(player, {forward: 1}, 0.2);
  expect(speedOf(player)).toBeCloseTo(WALK_SPEED, 5);
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
  run(player, {forward: 1, strafe: 1, run: true}, 1);
  expect(speedOf(player)).toBeCloseTo(RUN_SPEED, 5);
});

test("stops at a wall and loses the speed it had into it", () => {
  const player = createPlayer();
  const wall = {segments: [[-5, 2, 5, 2, 0]], circles: [], rings: []};
  run(player, {forward: 1}, 2, wall);
  expect(player.position.z).toBeCloseTo(2 - BODY_RADIUS, 3);
  expect(speedOf(player)).toBeLessThan(0.05);
});

test("stays seated until asked to move, and clamps the pitch", () => {
  const player = createPlayer();
  player.seat = {position: [0, 0], heading: 0};
  run(player, {pitch: 9}, 0.1);
  expect(player.seat).not.toBeNull();
  expect(player.pitch).toBeLessThan(1.3);
  run(player, {strafe: 1}, 0.1);
  expect(player.seat).toBeNull();
});
