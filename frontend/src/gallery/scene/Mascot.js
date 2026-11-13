/* eslint-disable react/no-unknown-property, react/prop-types */
import * as React from "react";
import * as THREE from "three";
import {useFrame} from "@react-three/fiber";
import {runtime, markActive} from "../runtime";
import {useGalleryStore, getGalleryState} from "../store";
import {BODY_COLORS, TRIM_COLORS} from "../outfits";
import {BENCH_SIZE} from "../layout/mainHall";
import {radialTexture} from "../textures";

// The visitor's body: a round little sprout creature. It has no skeleton and no
// canned clips; every motion is worked out from what the body is doing right now
// (its speed, its rise and fall, a landing), so it can never fall out of step.

const HEIGHT = 1.3;
const RADIUS = 0.46;
const SPAWN_MS = 900;
const FIRST_PERSON_HIDE = 1.3;
// metres walked per pair of steps
const GAIT = 1.3;
const WAVE_SECONDS = 1.6;
const BLINK_EVERY = 3.7;
const DARK = "#1b1a1f";

const easeOutBack = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
const damp = (value, goal, rate, dt) => value + (goal - value) * (1 - Math.exp(-rate * dt));

// How wide the body is at a height (0 at the feet .. HEIGHT): a gumdrop with a round
// top, a little fuller below the middle.
const girth = (y) => {
  const t = THREE.MathUtils.clamp(y / HEIGHT, 0, 1);
  return RADIUS * Math.pow(1 - Math.pow(Math.abs(2 * t - 1), 2.6), 1 / 2.2) * (1.1 - 0.24 * t);
};
// A point on the body's surface, `angle` round from straight ahead.
const onBody = (y, angle, proud = 0) => {
  const r = girth(y) + proud;
  return [Math.sin(angle) * r, y, Math.cos(angle) * r];
};

const bodyGeometry = () => {
  const points = Array.from({length: 41}, (_, i) => {
    const y = (HEIGHT * i) / 40;
    return new THREE.Vector2(girth(y), y);
  });
  return new THREE.LatheGeometry(points, 48);
};

const Eye = ({side}) => (
  <>
    <mesh scale={[0.07, 0.095, 0.045]}>
      <sphereGeometry args={[1, 20, 16]} />
      <meshStandardMaterial color={DARK} roughness={0.15} />
    </mesh>
    {/* the catchlight that makes it look alive */}
    <mesh position={[side * -0.018, 0.035, 0.04]}>
      <sphereGeometry args={[0.02, 10, 8]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} />
    </mesh>
  </>
);

const Cheek = ({side}) => (
  <mesh position={onBody(0.66, side * 0.72, -0.01)} rotation={[0, side * 0.72, 0]} scale={[0.065, 0.04, 0.02]}>
    <sphereGeometry args={[1, 14, 10]} />
    <meshStandardMaterial color="#ff8fa3" roughness={0.9} transparent opacity={0.75} />
  </mesh>
);

const Beret = () => (
  <group position={[-0.03, HEIGHT - 0.07, 0]} rotation={[0, 0, 0.2]}>
    <mesh scale={[1.05, 0.34, 1]}>
      <sphereGeometry args={[0.27, 24, 12]} />
      <meshStandardMaterial color="#b3263a" roughness={0.85} />
    </mesh>
    <mesh position={[0, 0.1, 0]}>
      <cylinderGeometry args={[0.014, 0.02, 0.07, 8]} />
      <meshStandardMaterial color="#b3263a" roughness={0.85} />
    </mesh>
  </group>
);

const SCARF_AT = 0.56;
const Scarf = () => (
  <group position={[0, SCARF_AT, 0]}>
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[girth(SCARF_AT) + 0.01, 0.055, 10, 40]} />
      <meshStandardMaterial color="#f2c94c" roughness={0.9} />
    </mesh>
    <mesh position={[0.16, -0.14, girth(SCARF_AT) + 0.03]} rotation={[0.12, 0, 0.14]}>
      <boxGeometry args={[0.11, 0.28, 0.04]} />
      <meshStandardMaterial color="#f2c94c" roughness={0.9} />
    </mesh>
  </group>
);

const PHONES_AT = 0.88;
const Headphones = () => (
  <group position={[0, PHONES_AT, 0]}>
    <mesh>
      <torusGeometry args={[girth(PHONES_AT) + 0.05, 0.028, 8, 32, Math.PI]} />
      <meshStandardMaterial color="#1f1f24" roughness={0.4} metalness={0.3} />
    </mesh>
    {[-1, 1].map((side) => (
      <mesh key={side} position={[side * (girth(PHONES_AT) + 0.05), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.13, 0.13, 0.11, 20]} />
        <meshStandardMaterial color="#1f1f24" roughness={0.4} metalness={0.3} />
      </mesh>
    ))}
  </group>
);

const ACCESSORY = {beret: Beret, scarf: Scarf, headphones: Headphones};

// `player` is the body to show and `outfit` what it wears (the visitor's own by default).
// `self` marks the local visitor's own mascot, which steps out of the way of a first person camera.
const Mascot = ({player = runtime.player, outfit: worn, self = true}) => {
  const root = React.useRef();
  const body = React.useRef();
  const face = React.useRef();
  const sprout = React.useRef();
  const shadow = React.useRef();
  const feet = [React.useRef(), React.useRef()];
  const arms = [React.useRef(), React.useRef()];
  const eyes = [React.useRef(), React.useRef()];
  const ownOutfit = useGalleryStore((state) => state.outfit);
  const outfit = worn || ownOutfit;
  const geometry = React.useMemo(bodyGeometry, []);
  const anim = React.useRef({
    time: 0,
    // how far through the walk cycle, and how much of it shows
    gait: 0,
    stride: 0,
    // squash (-) and stretch (+) of the body, as a spring
    squash: 0,
    squashSpeed: 0,
    crouch: 0,
    sit: 0,
    wave: 0,
    surprise: 0,
    wasOnGround: true,
    fall: 0,
  });

  const bodyColor = (BODY_COLORS[outfit.body] || BODY_COLORS.orange).color;
  const trimColor = (TRIM_COLORS[outfit.trim] || TRIM_COLORS.silver).color;
  const Accessory = ACCESSORY[outfit.accessory];

  React.useEffect(() => {
    markActive();
  }, [outfit]);

  useFrame(({camera}, delta) => {
    const a = anim.current;
    const dt = Math.min(delta, 0.1);
    a.time += dt;
    const {velocity} = player;
    const speed = Math.hypot(velocity.x, velocity.z);
    const grounded = player.onGround && !player.seat;

    // --- walking: a bouncy waddle whose pace is the distance actually covered ---
    a.stride = damp(a.stride, grounded ? Math.min(1, speed / 3.8) : 0, 10, dt);
    if (grounded && speed > 0.3) a.gait += (speed * dt) / GAIT;
    const swing = a.gait * Math.PI * 2;
    const hop = Math.abs(Math.sin(swing)) * 0.06 * a.stride;

    // --- jumping: stretch on the way up, flatten on the way down, splat and wobble on landing ---
    if (!player.onGround) a.fall = Math.max(0, -velocity.y);
    const landed = player.onGround && !a.wasOnGround;
    if (landed) a.squashSpeed -= Math.min(a.fall * 0.55, 4.5);
    a.wasOnGround = player.onGround;
    const stretch = player.onGround ? 0 : THREE.MathUtils.clamp(velocity.y * 0.035, -0.12, 0.22);
    a.squashSpeed += (-(a.squash - stretch) * 180 - a.squashSpeed * 14) * dt;
    a.squash = THREE.MathUtils.clamp(a.squash + a.squashSpeed * dt, -0.4, 0.3);

    a.crouch = damp(a.crouch, player.crouching && !player.seat ? 1 : 0, 12, dt);
    a.sit = damp(a.sit, player.seat ? 1 : 0, 7, dt);
    if (player.emote) {
      a.wave = WAVE_SECONDS;
      player.emote = null;
    }
    a.wave = Math.max(0, a.wave - dt);
    // a greeting: rock from side to side, arms up, easing in and out
    const greeting = Math.sin(Math.PI * (a.wave / WAVE_SECONDS));

    const breath = Math.sin(a.time * 2.1) * 0.012;
    const tall = (1 + a.squash + breath) * (1 - a.crouch * 0.38) * (1 - a.sit * 0.1);
    const wide = (1 - a.squash * 0.5) * (1 + a.crouch * 0.16) * (1 + a.sit * 0.05);
    const spawn = Math.min(1, (performance.now() - runtime.spawnedAt) / SPAWN_MS);
    const grow = self && spawn < 1 ? Math.max(0.001, easeOutBack(spawn)) : 1;

    root.current.position.set(player.position.x, player.position.y + a.sit * BENCH_SIZE.height, player.position.z);
    root.current.rotation.y = player.heading;
    root.current.scale.setScalar(grow);
    body.current.position.y = 0.05 + hop + greeting * Math.abs(Math.sin(a.time * 9)) * 0.08;
    body.current.scale.set(wide, tall, wide);
    // lean into the walk, sway with each step
    const pace = player.running ? 1.7 : 1;
    body.current.rotation.x = a.stride * 0.1 * pace - a.squashSpeed * 0.006;
    body.current.rotation.z = Math.sin(swing) * 0.055 * a.stride + Math.sin(a.time * 9) * 0.2 * greeting;

    // feet step in turn; in the air they tuck up, and sitting they stick out in front
    feet.forEach((foot, i) => {
      const side = i ? 1 : -1;
      const phase = swing + (i ? Math.PI : 0);
      const lift = Math.max(0, Math.sin(phase)) * 0.11 * a.stride;
      const tuck = player.onGround ? 0 : 0.1;
      foot.current.position.set(side * 0.17, 0.055 + lift + tuck, 0.07 + Math.cos(phase) * 0.12 * a.stride + a.sit * 0.2);
      foot.current.rotation.x = -Math.sin(phase) * 0.5 * a.stride - a.sit * 0.9;
    });
    // arms swing against the feet, fly up in the air and wave hello
    arms.forEach((arm, i) => {
      const side = i ? 1 : -1;
      const lifted = Math.max(player.onGround ? 0 : 1, greeting);
      arm.current.rotation.z = side * (0.35 + lifted * 1.5 + Math.sin(a.time * 14) * 0.25 * greeting);
      arm.current.rotation.x = Math.sin(swing + (i ? 0 : Math.PI)) * 0.7 * a.stride;
    });
    // the sprout trails behind every movement
    sprout.current.rotation.x = -a.stride * 0.35 * pace - a.squashSpeed * 0.08;
    sprout.current.rotation.z = Math.sin(a.time * 1.7) * 0.07 - Math.sin(swing) * 0.12 * a.stride;

    // blinking, and wide eyes in front of a painting
    const surprised = self && getGalleryState().focusedId ? 1 : 0;
    a.surprise = damp(a.surprise, surprised, 5, dt);
    const blink = a.time % BLINK_EVERY < 0.12 ? 0.12 : 1;
    eyes.forEach((eye) => eye.current.scale.set(1 + a.surprise * 0.2, (1 + a.surprise * 0.3) * blink, 1));
    face.current.position.y = -a.crouch * 0.02;

    // the shadow stays on the surface below, and there is none over a drop
    shadow.current.visible = Number.isFinite(player.ground);
    if (shadow.current.visible) {
      const height = player.position.y - player.ground;
      shadow.current.position.y = 0.012 - height - a.sit * BENCH_SIZE.height;
      shadow.current.material.opacity = (0.5 * spawn) / (1 + height * 1.2);
      shadow.current.scale.setScalar(wide);
    }

    if (speed > 0.05 || !player.onGround || a.wave > 0 || Math.abs(a.squash) > 0.002 || Math.abs(a.squashSpeed) > 0.02 || spawn < 1) markActive(300);

    // out of the way while painting the graffiti wall, and in first person once the
    // camera has moved inside
    const {cameraMode, mode, phase} = getGalleryState();
    const cameraInside = Math.hypot(camera.position.x - player.position.x, camera.position.z - player.position.z) < FIRST_PERSON_HIDE;
    root.current.visible = !self || mode === "photo" || phase !== "explore" ||
      (mode !== "graffiti" && !(cameraMode === "first" && cameraInside));
  });

  return (
    <group ref={root}>
      <group ref={body}>
        <mesh geometry={geometry} castShadow>
          <meshStandardMaterial color={bodyColor} roughness={0.42} />
        </mesh>
        <group ref={face}>
          {[-1, 1].map((side, i) => (
            <group key={side} ref={eyes[i]} position={onBody(0.8, side * 0.36, -0.012)} rotation={[0, side * 0.36, 0]}>
              <Eye side={side} />
            </group>
          ))}
          <Cheek side={-1} />
          <Cheek side={1} />
          {/* a small smile */}
          <mesh position={onBody(0.7, 0, 0.004)} rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.04, 0.009, 8, 16, Math.PI]} />
            <meshStandardMaterial color={DARK} roughness={0.4} />
          </mesh>
        </group>
        {[-1, 1].map((side, i) => (
          <group key={side} ref={arms[i]} position={onBody(0.56, (side * Math.PI) / 2, -0.03)}>
            <mesh position={[side * 0.09, 0, 0]} scale={[0.11, 0.06, 0.07]}>
              <sphereGeometry args={[1, 14, 10]} />
              <meshStandardMaterial color={bodyColor} roughness={0.42} />
            </mesh>
          </group>
        ))}
        {/* a sprout on top, unless a beret is in the way */}
        <group ref={sprout} position={[0, HEIGHT - 0.02, 0]} visible={outfit.accessory !== "beret"}>
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.012, 0.018, 0.14, 8]} />
            <meshStandardMaterial color={trimColor} roughness={0.6} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.07, 0.15, 0]} rotation={[0, 0, side * -0.6]} scale={[0.085, 0.022, 0.05]}>
              <sphereGeometry args={[1, 14, 10]} />
              <meshStandardMaterial color={trimColor} roughness={0.6} />
            </mesh>
          ))}
        </group>
        {Accessory && <Accessory />}
      </group>
      {[0, 1].map((i) => (
        <mesh key={i} ref={feet[i]} scale={[0.12, 0.065, 0.17]} castShadow>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color={trimColor} roughness={0.6} />
        </mesh>
      ))}
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} renderOrder={1}>
        <planeGeometry args={[1.3, 1.3]} />
        <meshBasicMaterial map={radialTexture()} color="#000000" transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  );
};

export default Mascot;
