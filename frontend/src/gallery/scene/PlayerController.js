import * as React from "react";
import * as THREE from "three";
import {useFrame, useThree} from "@react-three/fiber";
import {useKeyboardControls} from "@react-three/drei";
import {runtime, markActive} from "../runtime";
import {getGalleryState} from "../store";
import {GRAFFITI, WALL_HEIGHT} from "../layout/mainHall";
import {stepPlayer, TUNING} from "../player";
import {enterPortal, openDetail} from "../actions";
import audio from "../audio/AudioEngine";

// radians per second while a turn key is held
const TURN_SPEED = 2.4;
// How quickly the camera reaches its place: the third person camera trails the robot a
// little, and a first person camera gliding in from elsewhere arrives and then stays put.
const FOLLOW_RATE = {third: 10, firstArrive: 12};
const PHOTO_PITCH = [-0.9, 0.7];
const FOCUS_RANGE = 2.3;
const TRAIL_STEP = 0.6;
const TRAIL_LIMIT = 500;
const FOOTPRINT_LIMIT = 160;
const FOLLOW_DISTANCE = 4.8;
const EYE_HEIGHT = 1.55;
const SEATED_EYE_HEIGHT = 1.12;
const CROUCH_EYE_HEIGHT = 0.97;
// The first person camera's body language: it bobs with each stride, leans into a
// sidestep, dips on landing and opens up a little at a sprint.
const VIEW = {
  eyeRate: 11,
  // metres covered per step
  stride: {walk: 1.55, sprint: 2.1, crouch: 1.05},
  bobY: 0.024,
  bobX: 0.013,
  bobSprint: 1.9,
  bobCrouch: 0.7,
  rollStrafe: 0.02,
  // how hard a landing pushes the view down per m/s of fall, and how far it may sink
  landDip: 0.36,
  landDipMax: 0.2,
  landDipPitch: 0.12,
  // a hop shorter than this lands without a dip
  landAirTime: 0.12,
  fovSprint: 6,
};
const BASE_FOV = 50;

const damp = (value, goal, rate, dt) => value + (goal - value) * (1 - Math.exp(-rate * dt));
const FOCUS_DISTANCE = 3.9;
// Shift the focus shot right so the wall label beside the painting is in frame.
const FOCUS_SHIFT = 0.7;
const DWELL_TO_VISIT_MS = 1500;

const smoothstep = (t) => t * t * (3 - 2 * t);

// The entrance camera move: from outside the door, gliding in to the follow position.
const INTRO_PATH = [
  {t: 0, position: [3, 2.3, 21], look: [3, 1.9, 9]},
  {t: 3.2, position: [3, 2.4, 12.5], look: [3, 1.4, 4.2]},
];
const INTRO_BLEND_END = 5.8;

const PlayerController = () => {
  const [, getKeys] = useKeyboardControls();
  const {camera} = useThree();
  const raycaster = React.useMemo(() => new THREE.Raycaster(), []);
  const local = React.useRef({
    lookAt: new THREE.Vector3(),
    lastPosition: new THREE.Vector3(),
    snap: true,
    // which camera pose is in charge, and whether a first person camera has arrived at the eyes
    pose: null,
    settled: false,
    eye: EYE_HEIGHT,
    mode: null,
    // strides walked (the fraction is how far through the current one), and the view effects
    step: 0,
    bob: 0,
    bobX: 0,
    bobY: 0,
    roll: 0,
    dip: 0,
    dipSpeed: 0,
    trailStep: 0,
    footSide: 1,
    // where a fall in a room with a drop puts the visitor back
    checkpoint: null,
    focusId: null,
    focusSince: 0,
    promptKey: null,
    room: null,
  });
  const scratch = React.useMemo(() => ({
    position: new THREE.Vector3(),
    look: new THREE.Vector3(),
    head: new THREE.Vector3(),
    direction: new THREE.Vector3(),
  }), []);

  const placeAt = (position, heading, height = 0) => {
    runtime.player.position.set(position[0], height, position[1]);
    runtime.player.onGround = true;
    runtime.player.ground = height;
    runtime.player.velocity.set(0, 0, 0);
    runtime.player.heading = heading;
    runtime.player.pitch = 0;
    runtime.player.seat = null;
    local.current.snap = true;
    local.current.lastPosition.copy(runtime.player.position);
  };

  React.useEffect(() => {
    const room = getGalleryState().exhibition.rooms[getGalleryState().room];
    placeAt(room.spawn.position, room.spawn.heading, room.spawn.height);
  }, []);

  // The third person camera: behind the robot, raised or lowered by where the visitor looks.
  const followPose = (target, look) => {
    const player = runtime.player;
    const yaw = player.heading + Math.PI;
    const elevation = THREE.MathUtils.clamp(0.48 - player.pitch, 0.1, 1.05);
    // rooms with a low roof over the visitor (the festival walkway) set their own ceiling
    const state = getGalleryState();
    const layout = state.exhibition.rooms[state.room].layout;
    const ceiling = layout.CAMERA_CEILING ?? WALL_HEIGHT - 0.45;
    const fullReach = Math.cos(elevation) * FOLLOW_DISTANCE;
    let reach = fullReach;
    // a round room keeps the camera inside its wall by pulling it in toward the robot
    if (layout.CAMERA_RADIUS) {
      const dx = Math.sin(yaw);
      const dz = Math.cos(yaw);
      const along = player.position.x * dx + player.position.z * dz;
      const inside = layout.CAMERA_RADIUS ** 2 - (player.position.x ** 2 + player.position.z ** 2);
      if (inside > 0) reach = Math.max(0.6, Math.min(reach, -along + Math.sqrt(along * along + inside)));
    }
    // pulled in close, the camera rises and looks past the robot instead of at its back
    const shortfall = fullReach - reach;
    target.set(
        player.position.x + Math.sin(yaw) * reach,
        Math.min(1.25 + player.position.y + Math.sin(elevation) * FOLLOW_DISTANCE + shortfall * 0.45, ceiling),
        player.position.z + Math.cos(yaw) * reach,
    );
    look.set(player.position.x - Math.sin(yaw) * shortfall * 0.9, 1.25 + player.position.y, player.position.z - Math.cos(yaw) * shortfall * 0.9);
  };

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const now = performance.now();
    const state = getGalleryState();
    const room = state.exhibition.rooms[state.room];
    const player = runtime.player;
    const l = local.current;

    if (l.room !== state.room) {
      l.room = state.room;
      l.focusId = null;
      l.checkpoint = null;
    }

    if (runtime.teleport) {
      placeAt(runtime.teleport.position, runtime.teleport.heading, runtime.teleport.height);
      runtime.teleport = null;
    }

    // --- looking and moving ----------------------------------------------
    const lookFree = state.phase === "explore" && !state.detailId && !state.mapOpen;
    const canMove = lookFree && state.mode === "explore" && !state.transition;
    const keys = getKeys();
    const lookX = runtime.look.dx * state.lookSensitivity;
    const lookY = runtime.look.dy * state.lookSensitivity * (state.invertY ? -1 : 1);
    runtime.look.dx = 0;
    runtime.look.dy = 0;

    // photo mode starts behind the robot, then orbits it without turning it
    if (l.mode !== state.mode) {
      l.mode = state.mode;
      if (state.mode === "photo") {
        runtime.camera.yaw = player.heading + Math.PI;
        runtime.camera.pitch = -0.12;
      }
    }

    // The mouse (or a drag) turns the view directly, with no smoothing in between;
    // W/S/A/D walk relative to it and Q/E or the arrow keys turn it from the keyboard.
    const intent = {forward: 0, strafe: 0, sprint: false, crouch: false, jump: false, heading: player.heading, pitch: player.pitch};
    const jumpPressed = runtime.jumpRequested;
    runtime.jumpRequested = false;
    if (lookFree && state.mode === "photo") {
      runtime.camera.yaw -= lookX;
      runtime.camera.pitch = THREE.MathUtils.clamp(runtime.camera.pitch - lookY, ...PHOTO_PITCH);
    } else if (lookFree && state.mode === "explore") {
      const turn = Number(keys.turnLeft) - Number(keys.turnRight);
      intent.heading += turn * TURN_SPEED * dt - lookX;
      intent.pitch -= lookY;
      if (turn) markActive(400);
    }
    if (canMove) {
      intent.forward = Number(keys.forward) - Number(keys.backward);
      intent.strafe = Number(keys.right) - Number(keys.left);
      intent.sprint = Boolean(keys.run);
      intent.crouch = Boolean(keys.crouch);
      intent.jump = jumpPressed;
    }

    l.lastPosition.copy(player.position);
    const airTime = player.airTime;
    stepPlayer(player, intent, dt, room.colliders);
    const moved = Math.hypot(player.position.x - l.lastPosition.x, player.position.z - l.lastPosition.z);
    if (player.moving || moved > 0 || !player.onGround) markActive(400);

    // a fall off the course ends back on the last checkpoint stood on
    if (player.onGround && player.surface?.checkpoint) l.checkpoint = player.surface.checkpoint;
    if (room.layout.FALL_HEIGHT != null && player.position.y < room.layout.FALL_HEIGHT) {
      const back = l.checkpoint || room.spawn;
      placeAt(back.position, back.heading, back.height);
      runtime.spawnedAt = now;
      markActive(1500);
    }

    // --- strides, and what the body's motion does to the view ---------------
    const speed = Math.hypot(player.velocity.x, player.velocity.z);
    let stepped = false;
    if (player.onGround && speed > 0.5) {
      const stride = VIEW.stride[player.crouching ? "crouch" : player.running ? "sprint" : "walk"];
      const before = l.step;
      l.step += (speed * dt) / stride;
      stepped = Math.floor(l.step) > Math.floor(before);
    } else if (player.onGround) {
      // come to rest with the feet together
      l.step = damp(l.step, Math.round(l.step), 8, dt);
    }
    const sway = player.onGround ?
      Math.min(1, speed / TUNING.walk) * (player.running ? VIEW.bobSprint : 1) * (player.crouching ? VIEW.bobCrouch : 1) : 0;
    l.bob = damp(l.bob, sway, 9, dt);
    l.bobY = -Math.cos(l.step * Math.PI * 2) * VIEW.bobY * l.bob;
    l.bobX = Math.sin(l.step * Math.PI) * VIEW.bobX * l.bob;
    const sideways = -player.velocity.x * Math.cos(player.heading) + player.velocity.z * Math.sin(player.heading);
    l.roll = damp(l.roll, (-sideways / TUNING.sprint) * VIEW.rollStrafe, 8, dt);
    if (player.landed && airTime > VIEW.landAirTime) {
      l.dipSpeed -= Math.min(player.landed * VIEW.landDip, 3.2);
      l.step = 0.35;
      audio.footstep();
    }
    // the dip is a damped spring back to level
    l.dipSpeed += (-l.dip * 150 - l.dipSpeed * 17) * dt;
    l.dip = THREE.MathUtils.clamp(l.dip + l.dipSpeed * dt, -VIEW.landDipMax, 0.05);
    if (Math.abs(l.dip) > 1e-4 || Math.abs(l.dipSpeed) > 1e-3 || l.bob > 0.01 || Math.abs(l.roll) > 1e-4) markActive(150);

    // --- footsteps, footprints and the map trail -------------------------
    if (stepped) {
      l.footSide *= -1;
      const side = l.footSide * 0.13;
      runtime.footprints.push({
        room: state.room,
        x: player.position.x + Math.cos(player.heading) * side,
        y: player.position.y,
        z: player.position.z - Math.sin(player.heading) * side,
        heading: player.heading,
        time: now,
      });
      if (runtime.footprints.length > FOOTPRINT_LIMIT) runtime.footprints.shift();
      audio.footstep();
    }
    if (moved > 0) {
      l.trailStep += moved;
      if (l.trailStep > TRAIL_STEP) {
        l.trailStep = 0;
        const trail = runtime.trail[state.room];
        trail.push([player.position.x, player.position.z]);
        if (trail.length > TRAIL_LIMIT) trail.shift();
      }
    }

    // --- what is the visitor looking at? --------------------------------
    let focus = null;
    if (state.phase === "explore" && state.mode === "explore" && !state.transition) {
      const facing = [Math.sin(player.heading), Math.cos(player.heading)];
      // most rooms hang their pieces on walls; one with moving pieces says where each is now
      const {livePosition, FOCUS_RANGE: liveRange} = room.layout;
      let best = livePosition ? liveRange : FOCUS_RANGE;
      room.artworks.forEach((entry) => {
        const at = livePosition ? livePosition(entry) : entry.placement.position;
        const reference = livePosition ? [at[0], at[2]] : entry.spot;
        const distance = Math.hypot(reference[0] - player.position.x, reference[1] - player.position.z);
        if (distance >= best) return;
        // in first person, and with pieces that drift past, you also have to be looking roughly at it
        if (state.cameraMode === "first" || livePosition) {
          const toArt = [at[0] - player.position.x, at[2] - player.position.z];
          const toLength = Math.hypot(...toArt) || 1;
          if ((facing[0] * toArt[0] + facing[1] * toArt[1]) / toLength < 0.55) return;
        }
        best = distance;
        focus = entry;
      });
    }
    const focusId = focus ? focus.artwork.id : null;
    if (focusId !== l.focusId) {
      l.focusId = focusId;
      l.focusSince = now;
      state.set({focusedId: focusId});
      if (focusId) audio.chime();
      markActive(2500);
    }
    if (focusId && now - l.focusSince > DWELL_TO_VISIT_MS && !state.visited.includes(focusId)) state.markVisited(focusId);

    // --- interactions -----------------------------------------------------
    let interactable = null;
    if (canMove || player.seat) {
      let best = Infinity;
      room.interactables.forEach((item) => {
        const distance = Math.hypot(item.position[0] - player.position.x, item.position[1] - player.position.z);
        // some are only in reach from a raised spot, e.g. the top of the stairs
        if (item.minHeight != null && player.position.y < item.minHeight) return;
        if (distance < item.radius && distance < best) {
          best = distance;
          interactable = item;
        }
      });
    }
    let prompt = null;
    if (player.seat) prompt = {key: "WASD", label: "prompt.standUp"};
    else if (interactable) prompt = {key: "F", label: interactable.label};
    else if (focus) prompt = {key: "Enter", label: "prompt.viewArtwork"};
    const promptKey = prompt ? `${prompt.key}:${prompt.label}` : null;
    if (promptKey !== l.promptKey) {
      l.promptKey = promptKey;
      state.set({prompt});
    }

    if (runtime.interactRequested) {
      runtime.interactRequested = false;
      if (interactable && !player.seat && canMove) {
        if (interactable.type === "bench") {
          const seat = interactable.seat;
          player.seat = seat;
          player.position.set(seat.position[0], 0, seat.position[1]);
          player.heading = seat.heading;
        } else if (interactable.type === "portal") {
          enterPortal(interactable.target, interactable.arrival);
        } else if (interactable.type === "graffiti") {
          state.set({mode: "graffiti", focusedId: null, prompt: null});
          l.focusId = null;
          l.promptKey = null;
        }
      } else if (focus && canMove) {
        openDetail(focus.artwork.id);
      }
    }

    // --- camera ------------------------------------------------------------
    const target = scratch.position;
    const look = scratch.look;
    let follow = 1 - Math.exp(-dt * 4);
    let pose = "third";
    if (state.phase !== "explore") {
      pose = "intro";
      const t = state.phase === "gate" ? 0 : (now - runtime.introStartedAt) / 1000;
      const [from, to] = INTRO_PATH;
      if (t <= to.t) {
        const u = smoothstep(Math.min(1, t / to.t));
        target.fromArray(from.position).lerp(scratch.head.fromArray(to.position), u);
        look.fromArray(from.look).lerp(scratch.head.fromArray(to.look), u);
      } else {
        const u = smoothstep(Math.min(1, (t - to.t) / (INTRO_BLEND_END - to.t)));
        followPose(target, look);
        target.lerp(scratch.head.fromArray(to.position), 1 - u);
        look.lerp(scratch.head.fromArray(to.look), 1 - u);
      }
      follow = 1;
    } else if (state.mode === "photo") {
      pose = "photo";
      const {yaw, pitch, photoDistance} = runtime.camera;
      const elevation = THREE.MathUtils.clamp(0.3 - pitch, -0.1, 1.3);
      target.set(
          player.position.x + Math.sin(yaw) * Math.cos(elevation) * photoDistance,
          Math.max(0.3, 1.1 + player.position.y + Math.sin(elevation) * photoDistance),
          player.position.z + Math.cos(yaw) * Math.cos(elevation) * photoDistance,
      );
      look.set(player.position.x, 1.1 + player.position.y, player.position.z);
      follow = 1 - Math.exp(-dt * 10);
    } else if (state.mode === "graffiti") {
      pose = "graffiti";
      target.set(GRAFFITI.position[0] + GRAFFITI.normal[0] * 4.6, 2.1, GRAFFITI.position[2] + GRAFFITI.normal[1] * 4.6);
      look.set(GRAFFITI.position[0], GRAFFITI.position[1], GRAFFITI.position[2]);
    } else if (state.cameraMode === "first") {
      pose = "first";
      const heading = player.heading;
      const pitch = player.pitch + l.dip * VIEW.landDipPitch;
      const eye = player.seat ? SEATED_EYE_HEIGHT : player.crouching ? CROUCH_EYE_HEIGHT : EYE_HEIGHT;
      l.eye = damp(l.eye, eye, VIEW.eyeRate, dt);
      if (Math.abs(l.eye - eye) > 0.002) markActive(200);
      target.set(
          player.position.x - Math.cos(heading) * l.bobX,
          player.position.y + l.eye + l.bobY + l.dip,
          player.position.z + Math.sin(heading) * l.bobX,
      );
      look.set(
          target.x + Math.sin(heading) * Math.cos(pitch),
          target.y + Math.sin(pitch),
          target.z + Math.cos(heading) * Math.cos(pitch),
      );
      // once the camera is at the eyes it is locked to them: any lag here is felt as mouse lag
      follow = l.settled ? 1 : 1 - Math.exp(-dt * FOLLOW_RATE.firstArrive);
    } else if (focus && room.layout.FOCUS_ZOOM !== false) {
      pose = "focus";
      const {position, normal} = focus.placement;
      const right = [-normal[1], normal[0]];
      // drift slowly closer the longer the visitor looks
      const distance = FOCUS_DISTANCE - Math.min(0.45, ((now - l.focusSince) / 1000) * 0.05);
      look.set(position[0] - right[0] * FOCUS_SHIFT, position[1], position[2] - right[1] * FOCUS_SHIFT);
      target.set(look.x + normal[0] * distance, position[1] + 0.55, look.z + normal[1] * distance);
      if (now - l.focusSince < 9000) markActive(200);
    } else {
      followPose(target, look);
      follow = 1 - Math.exp(-dt * FOLLOW_RATE.third);
    }
    if (pose !== l.pose) {
      l.pose = pose;
      l.settled = false;
    }

    const before = scratch.head.copy(camera.position);
    if (l.snap) {
      camera.position.copy(target);
      l.lookAt.copy(look);
      l.snap = false;
      l.settled = true;
    } else {
      camera.position.lerp(target, follow);
      l.lookAt.lerp(look, follow);
      if (!l.settled && camera.position.distanceToSquared(target) < 0.001 && l.lookAt.distanceToSquared(look) < 0.01) l.settled = true;
    }
    camera.lookAt(l.lookAt);
    if (pose === "first") camera.rotateZ(l.roll + l.bobX * 0.35);
    if (before.distanceToSquared(camera.position) > 1e-6) markActive(250);

    const inPortal = state.transition?.kind === "portal";
    const fov = inPortal ? 78 : BASE_FOV + (player.running ? VIEW.fovSprint : 0);
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = damp(camera.fov, fov, inPortal ? 3 : 7, dt);
      camera.updateProjectionMatrix();
      markActive(200);
    }

    // --- fade walls that hide the robot -----------------------------------
    const thirdPerson = state.cameraMode !== "first" || state.mode === "photo";
    const hits = new Set();
    if (thirdPerson && runtime.occluders.size) {
      const head = scratch.head.set(player.position.x, 1.2 + player.position.y, player.position.z);
      const direction = scratch.direction.subVectors(head, camera.position);
      const distance = direction.length();
      raycaster.set(camera.position, direction.normalize());
      raycaster.far = distance;
      raycaster.intersectObjects([...runtime.occluders], false).forEach((hit) => hits.add(hit.object));
    }
    // in photo mode a blocking wall vanishes completely so it can't ghost over the shot
    const hiddenOpacity = state.mode === "photo" ? 0 : 0.12;
    runtime.occluders.forEach((mesh) => {
      const material = mesh.material;
      const goal = hits.has(mesh) ? hiddenOpacity : 1;
      if (Math.abs(material.opacity - goal) < 0.005) return;
      material.opacity = THREE.MathUtils.lerp(material.opacity, goal, 1 - Math.exp(-dt * 10));
      material.transparent = material.opacity < 0.99;
      material.depthWrite = !material.transparent;
      mesh.visible = material.opacity > 0.01;
      markActive(200);
    });
  });

  return null;
};

export default PlayerController;
