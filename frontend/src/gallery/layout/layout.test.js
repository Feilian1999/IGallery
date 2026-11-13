import {createPlayer, stepPlayer} from "../player";
import * as mainHall from "./mainHall";
import * as parkour from "./parkour";
import * as annex from "./annex";

const STEP = 1 / 60;
const IDLE = {forward: 0, strafe: 0, sprint: false, crouch: false, jump: false, heading: 0, pitch: 0};
const headingTo = (player, [x, z]) => Math.atan2(x - player.position.x, z - player.position.z);
const distanceTo = (player, [x, z]) => Math.hypot(x - player.position.x, z - player.position.z);

test("the main hall stairs can be walked up to the portal", () => {
  const player = createPlayer();
  const {STAIRS, STAIRS_ARRIVAL, COLLIDERS, INTERACTABLES} = mainHall;
  [player.position.x, player.position.z] = STAIRS_ARRIVAL.position;
  const portal = INTERACTABLES.find((item) => item.id === "portal");
  expect(player.position.y < portal.minHeight).toBe(true);
  for (let t = 0; t < 6 && distanceTo(player, portal.position) > 0.3; t += STEP) {
    stepPlayer(player, {...IDLE, forward: 1, heading: headingTo(player, portal.position)}, STEP, COLLIDERS);
  }
  expect(player.position.y).toBeCloseTo(STAIRS.rise, 5);
  expect(distanceTo(player, portal.position)).toBeLessThan(portal.radius);
  // and the stairs can't be entered from the side
  const side = createPlayer();
  const mid = [(STAIRS.head[0] + STAIRS.foot[0]) / 2, (STAIRS.head[1] + STAIRS.foot[1]) / 2];
  const across = [-STAIRS.direction[1], STAIRS.direction[0]];
  [side.position.x, side.position.z] = [mid[0] + across[0] * 3, mid[1] + across[1] * 3];
  for (let t = 0; t < 2; t += STEP) stepPlayer(side, {...IDLE, forward: 1, heading: headingTo(side, mid)}, STEP, COLLIDERS);
  expect(side.position.y).toBe(0);
  expect(distanceTo(side, mid)).toBeGreaterThan(STAIRS.width / 2);
});

// Runs the course the plain way: walk to the middle of each platform, run at the
// next one and jump at the edge.
const runCourse = (sprint) => {
  const player = createPlayer();
  const {COLLIDERS, PLATFORMS, SPAWN, FALL_HEIGHT} = parkour;
  [player.position.x, player.position.z] = SPAWN.position;
  let reached = 0;
  for (let t = 0; t < 120 && reached < PLATFORMS.length - 1; t += STEP) {
    if (player.position.y < FALL_HEIGHT) break;
    const here = COLLIDERS.slabs[reached];
    const next = COLLIDERS.slabs[reached + 1];
    if (player.onGround && player.surface === next) {
      reached++;
      continue;
    }
    const target = [next.x, next.z];
    const heading = headingTo(player, target);
    // a step further on would be off this platform: time to jump
    const aheadX = player.position.x + Math.sin(heading) * 0.3 - here.x;
    const aheadZ = player.position.z + Math.cos(heading) * 0.3 - here.z;
    const leaving = Math.abs(aheadX) > here.halfLength || Math.abs(aheadZ) > here.halfWidth;
    stepPlayer(player, {...IDLE, forward: 1, sprint, jump: player.onGround && leaving, heading}, STEP, COLLIDERS);
  }
  return reached;
};

test("the parkour run can be finished at a sprint, but not at a walk", () => {
  const last = parkour.PLATFORMS.length - 1;
  expect(runCourse(true)).toBe(last);
  expect(runCourse(false)).toBeLessThan(last);
  // the first stretch is walkable, so the sprint is learnt before it is needed
  expect(runCourse(false)).toBeGreaterThanOrEqual(5);
});

test("the door to the floating room is only in reach on the last platform", () => {
  const door = parkour.INTERACTABLES.find((item) => item.target === "annex");
  const finish = parkour.PLATFORMS[parkour.PLATFORMS.length - 1];
  expect(finish.top).toBeGreaterThanOrEqual(door.minHeight);
  parkour.PLATFORMS.slice(0, -1).forEach((platform) => {
    const near = Math.hypot(platform.center[0] - door.position[0], platform.center[1] - door.position[1]) < door.radius + 2;
    expect(near && platform.top >= door.minHeight).toBe(false);
  });
});

test("the floating pieces orbit the middle on different radii without meeting", () => {
  const pieces = annex.ringPlacements(annex.MAX_PIECES).map((placement) => ({placement}));
  const radii = new Set(pieces.map((entry) => entry.placement.orbit.radius.toFixed(2)));
  expect(radii.size).toBeGreaterThan(6);
  for (let seconds = 0; seconds < 600; seconds += 7.3) {
    const now = pieces.map((entry) => annex.livePosition(entry, seconds));
    now.forEach(([x, y, z], i) => {
      expect(Math.hypot(x, z)).toBeCloseTo(pieces[i].placement.orbit.radius, 5);
      expect(Math.hypot(x, z)).toBeLessThan(annex.RADIUS - 3);
      // high enough to walk under: a piece is about 2.3 m tall
      expect(y - 1.15).toBeGreaterThan(1.7);
      now.slice(i + 1).forEach(([ox, , oz]) => expect(Math.hypot(x - ox, z - oz)).toBeGreaterThan(2.4));
    });
  }
  // they do go round
  const [x0, , z0] = annex.livePosition(pieces[0], 0);
  const [x1, , z1] = annex.livePosition(pieces[0], 30);
  expect(Math.hypot(x1 - x0, z1 - z0)).toBeGreaterThan(1);
});
