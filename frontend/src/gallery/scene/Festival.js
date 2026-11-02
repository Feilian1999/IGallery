/* eslint-disable react/no-unknown-property, react/prop-types */
import * as React from "react";
import * as THREE from "three";
import {useFrame} from "@react-three/fiber";
import {SQUARE, STALLS, STALL, YAGURA, STAGE, SIGNBOARD, TORII, PORTAL, POLES, POLE_HEIGHT} from "../layout/festival";
import {useGalleryStore, getGalleryState} from "../store";
import audio from "../audio/AudioEngine";
import Painting from "./Painting";
import Portal from "./Portal";

const WOOD = "#5b3a24";
const DARK_WOOD = "#3a2618";
const SHRINE_RED = "#c0392b";
const LANTERN_COLORS = ["#ff4b3e", "#fff0d2", "#ff4b3e", "#ffb347"];

// Red and white vertical stripes, the curtain (紅白幕) hung around festival structures.
const stripeTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 8;
  const context = canvas.getContext("2d");
  context.fillStyle = "#f4efe6";
  context.fillRect(0, 0, 64, 8);
  context.fillStyle = "#c62f37";
  context.fillRect(0, 0, 32, 8);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const Box = ({position, size, color, rotation, roughness = 0.85}) => (
  <mesh position={position} rotation={rotation} castShadow receiveShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={roughness} />
  </mesh>
);

// --- the square ------------------------------------------------------------------------

const Ground = () => {
  const width = SQUARE.maxX - SQUARE.minX;
  const depth = SQUARE.maxZ - SQUARE.minZ;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color="#17130f" roughness={1} />
      </mesh>
      {/* gravel square */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(SQUARE.minX + SQUARE.maxX) / 2, 0, (SQUARE.minZ + SQUARE.maxZ) / 2]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#3b342c" roughness={0.97} />
      </mesh>
      {/* stone path from the torii to the stage */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, (TORII.center[1] + STAGE.center[1]) / 2]} receiveShadow>
        <planeGeometry args={[2.4, TORII.center[1] - STAGE.center[1]]} />
        <meshStandardMaterial color="#5a5148" roughness={0.9} />
      </mesh>
    </group>
  );
};

const Fence = () => {
  const rails = [];
  const add = (from, to) => rails.push({from, to});
  add([SQUARE.minX, SQUARE.minZ], [SQUARE.maxX, SQUARE.minZ]);
  add([SQUARE.minX, SQUARE.minZ], [SQUARE.minX, SQUARE.maxZ]);
  add([SQUARE.maxX, SQUARE.minZ], [SQUARE.maxX, SQUARE.maxZ]);
  add([SQUARE.minX, SQUARE.maxZ], [-TORII.width / 2 - 0.6, SQUARE.maxZ]);
  add([TORII.width / 2 + 0.6, SQUARE.maxZ], [SQUARE.maxX, SQUARE.maxZ]);
  return (
    <group>
      {rails.map(({from, to}, i) => {
        const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
        const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
        const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
        return (
          <group key={i} position={[mid[0], 0, mid[1]]} rotation={[0, -angle, 0]}>
            <Box position={[0, 0.75, 0]} size={[length, 0.08, 0.08]} color={DARK_WOOD} />
            <Box position={[0, 0.4, 0]} size={[length, 0.08, 0.08]} color={DARK_WOOD} />
            {Array.from({length: Math.floor(length / 1.6) + 1}, (_, j) => (
              <Box key={j} position={[-length / 2 + j * 1.6, 0.45, 0]} size={[0.1, 0.9, 0.1]} color={DARK_WOOD} />
            ))}
          </group>
        );
      })}
    </group>
  );
};

// Dark tree silhouettes around the square, for a skyline.
const Trees = () => {
  const mesh = React.useRef();
  const trees = React.useMemo(() => {
    const list = [];
    for (let i = 0; i < 70; i++) {
      const angle = (i / 70) * Math.PI * 2 + Math.sin(i * 7.1) * 0.05;
      const radius = 22 + ((i * 37) % 9);
      list.push({x: Math.cos(angle) * radius, z: Math.sin(angle) * radius - 2, scale: 0.8 + ((i * 13) % 7) / 10});
    }
    return list;
  }, []);
  React.useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    trees.forEach((tree, i) => {
      matrix.compose(new THREE.Vector3(tree.x, 4 * tree.scale, tree.z), new THREE.Quaternion(), new THREE.Vector3(tree.scale, tree.scale, tree.scale));
      mesh.current.setMatrixAt(i, matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [trees]);
  return (
    <instancedMesh ref={mesh} args={[null, null, trees.length]}>
      <coneGeometry args={[2.6, 8, 7]} />
      <meshStandardMaterial color="#0e1712" roughness={1} />
    </instancedMesh>
  );
};

// --- structures -------------------------------------------------------------------------

const Torii = () => {
  const [x, z] = TORII.center;
  const half = TORII.width / 2;
  return (
    <group position={[x, 0, z]}>
      {[-half, half].map((offset) => (
        <mesh key={offset} position={[offset, TORII.height / 2, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.3, TORII.height, 16]} />
          <meshStandardMaterial color={SHRINE_RED} roughness={0.6} />
        </mesh>
      ))}
      {/* nuki, the lower beam */}
      <Box position={[0, TORII.height - 1.1, 0]} size={[TORII.width + 1, 0.28, 0.24]} color={SHRINE_RED} roughness={0.6} />
      {/* kasagi, the top beam, with its black cap */}
      <Box position={[0, TORII.height + 0.05, 0]} size={[TORII.width + 2.2, 0.36, 0.5]} color={SHRINE_RED} roughness={0.6} />
      <Box position={[0, TORII.height + 0.3, 0]} size={[TORII.width + 2.6, 0.18, 0.62]} color="#1a1412" />
      <Box position={[0, TORII.height - 0.5, 0]} size={[0.3, 0.9, 0.2]} color={SHRINE_RED} />
    </group>
  );
};

const HangingLantern = ({position, color = "#ff4b3e", scale = 1}) => (
  <group position={position} scale={scale}>
    <mesh scale={[1, 1.25, 1]}>
      <sphereGeometry args={[0.22, 16, 12]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
    {[-1, 1].map((side) => (
      <mesh key={side} position={[0, side * 0.27, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.06, 12]} />
        <meshStandardMaterial color="#1a1412" />
      </mesh>
    ))}
  </group>
);

// A food stall (屋台): back board with the painting, a counter, posts and a striped canopy.
const Stall = ({stall}) => {
  const {width, depth, counterHeight, roofHeight} = STALL;
  const stripes = React.useMemo(() => {
    const texture = stripeTexture();
    texture.repeat.set(5, 1);
    return texture;
  }, []);
  return (
    <group position={[stall.x, 0, stall.z]} rotation={[0, Math.atan2(stall.facing, 0), 0]}>
      {/* back board */}
      <Box position={[0, 1.7, -0.05]} size={[width, 3.4, 0.1]} color={WOOD} />
      {/* counter */}
      <Box position={[0, counterHeight / 2, depth]} size={[width - 0.2, counterHeight, 0.5]} color={DARK_WOOD} />
      <mesh position={[0, counterHeight / 2, depth + 0.26]}>
        <planeGeometry args={[width - 0.2, counterHeight - 0.1]} />
        <meshStandardMaterial map={stripes} roughness={0.9} />
      </mesh>
      {/* posts */}
      {[-1, 1].map((side) => [0, depth + 0.2].map((d) => (
        <Box key={`${side}${d}`} position={[side * (width / 2 - 0.05), roofHeight / 2, d]} size={[0.1, roofHeight, 0.1]} color={DARK_WOOD} />
      )))}
      {/* canopy, sloping toward the visitor */}
      <Box position={[0, roofHeight + 0.15, depth / 2 + 0.15]} rotation={[0.28, 0, 0]} size={[width + 0.5, 0.08, depth + 1.1]} color={stall.canopy} roughness={0.7} />
      {/* short curtain (noren) along the canopy's front edge */}
      {[-1, 0, 1].map((i) => (
        <mesh key={i} position={[i * (width / 3), roofHeight - 0.32, depth + 0.62]}>
          <planeGeometry args={[width / 3 - 0.08, 0.5]} />
          <meshStandardMaterial color={stall.canopy} side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
      ))}
      {/* lanterns at the outer corners, clear of the painting and its label */}
      <HangingLantern position={[-width / 2 - 0.15, roofHeight - 0.6, depth + 0.45]} color="#ff4b3e" />
      <HangingLantern position={[width / 2 + 0.15, roofHeight - 0.6, depth + 0.45]} color="#fff0d2" />
    </group>
  );
};

// The drum tower (櫓) in the middle of the square.
const Yagura = () => {
  const {center, size, deck, roof} = YAGURA;
  const skirt = React.useMemo(() => {
    const texture = stripeTexture();
    texture.repeat.set(4, 1);
    return texture;
  }, []);
  return (
    <group position={[center[0], 0, center[1]]}>
      {[-1, 1].map((sx) => [-1, 1].map((sz) => (
        <Box key={`${sx}${sz}`} position={[sx * size / 2, roof / 2, sz * size / 2]} size={[0.16, roof, 0.16]} color={DARK_WOOD} />
      )))}
      {/* red and white curtain around the base */}
      {[0, 1, 2, 3].map((side) => (
        <mesh key={side} rotation={[0, (side * Math.PI) / 2, 0]} position={[Math.sin((side * Math.PI) / 2) * (size / 2 + 0.02), deck / 2, Math.cos((side * Math.PI) / 2) * (size / 2 + 0.02)]}>
          <planeGeometry args={[size, deck]} />
          <meshStandardMaterial map={skirt} roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <Box position={[0, deck + 0.06, 0]} size={[size + 0.5, 0.12, size + 0.5]} color={WOOD} />
      {/* railing */}
      {[0, 1, 2, 3].map((side) => (
        <Box key={side} position={[Math.sin((side * Math.PI) / 2) * (size / 2 + 0.22), deck + 0.55, Math.cos((side * Math.PI) / 2) * (size / 2 + 0.22)]}
          rotation={[0, (side * Math.PI) / 2, 0]} size={[size + 0.5, 0.08, 0.08]} color={SHRINE_RED} />
      ))}
      {/* taiko drum */}
      <mesh position={[0, deck + 0.75, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.8, 24]} />
        <meshStandardMaterial color="#7a3b1e" roughness={0.6} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, deck + 0.75, side * 0.41]}>
          <circleGeometry args={[0.6, 24]} />
          <meshStandardMaterial color="#e9dcc0" side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* pyramid roof */}
      <mesh position={[0, roof + 0.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[size * 0.95, 1.1, 4]} />
        <meshStandardMaterial color="#26201c" roughness={0.8} />
      </mesh>
      {[0, 1, 2, 3].map((side) => {
        const angle = (side * Math.PI) / 2 + Math.PI / 4;
        return <HangingLantern key={side} position={[Math.sin(angle) * size * 0.7, deck - 0.35, Math.cos(angle) * size * 0.7]} color={LANTERN_COLORS[side]} />;
      })}
    </group>
  );
};

// The kagura stage at the north end, with the signboard that holds a painting in front.
const Stage = () => {
  const {center, width, depth, height} = STAGE;
  return (
    <group>
      <group position={[center[0], 0, center[1]]}>
        <Box position={[0, height / 2, 0]} size={[width, height, depth]} color={WOOD} />
        {[-1, 1].map((sx) => [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * (width / 2 - 0.3), height + 1.6, sz * (depth / 2 - 0.3)]} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 3.2, 12]} />
            <meshStandardMaterial color={SHRINE_RED} roughness={0.6} />
          </mesh>
        )))}
        <Box position={[0, height + 1.6, -depth / 2 + 0.1]} size={[width - 0.6, 3.2, 0.12]} color="#2b1d14" />
        {/* gable roof */}
        {[-1, 1].map((side) => (
          <Box key={side} position={[0, height + 3.65, side * depth * 0.3]} rotation={[side * -0.42, 0, 0]} size={[width + 1.2, 0.14, depth * 0.72]} color="#26201c" />
        ))}
        {[-1, 0, 1].map((i) => <HangingLantern key={i} position={[i * 2.6, height + 2.75, depth / 2 - 0.1]} color="#fff0d2" scale={1.2} />)}
      </group>
      {/* signboard */}
      <group position={[SIGNBOARD.center[0], 0, SIGNBOARD.center[1]]}>
        <Box position={[0, 2.1, -0.04]} size={[SIGNBOARD.width, SIGNBOARD.height, 0.12]} color={WOOD} />
        <Box position={[0, 3.75, 0.02]} size={[SIGNBOARD.width + 0.5, 0.2, 0.4]} color={SHRINE_RED} />
        {[-1, 1].map((side) => (
          <Box key={side} position={[side * (SIGNBOARD.width / 2 + 0.05), 1.9, 0]} size={[0.14, 3.8, 0.14]} color={DARK_WOOD} />
        ))}
      </group>
    </group>
  );
};

// --- lanterns, sky and fireworks --------------------------------------------------------

// Paper lanterns strung from the top of the yagura out to poles around the square.
const LanternStrings = () => {
  const mesh = React.useRef();
  const {lanterns, lines} = React.useMemo(() => {
    const top = new THREE.Vector3(YAGURA.center[0], YAGURA.roof + 0.4, YAGURA.center[1]);
    const lanterns = [];
    const lines = [];
    POLES.forEach(([x, z], p) => {
      const end = new THREE.Vector3(x, POLE_HEIGHT, z);
      const count = Math.max(4, Math.round(top.distanceTo(end) / 1.25));
      let previous = top.clone();
      for (let i = 1; i <= count; i++) {
        const t = i / count;
        const point = new THREE.Vector3().lerpVectors(top, end, t);
        point.y -= Math.sin(t * Math.PI) * 0.9; // the string sags
        lines.push(previous.x, previous.y, previous.z, point.x, point.y, point.z);
        previous = point;
        if (i < count) lanterns.push({position: point.clone().setY(point.y - 0.3), color: LANTERN_COLORS[(i + p) % LANTERN_COLORS.length]});
      }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
    return {lanterns, lines: geometry};
  }, []);

  React.useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    lanterns.forEach((lantern, i) => {
      matrix.compose(lantern.position, new THREE.Quaternion(), new THREE.Vector3(1, 1.25, 1));
      mesh.current.setMatrixAt(i, matrix);
      mesh.current.setColorAt(i, color.set(lantern.color));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.instanceColor.needsUpdate = true;
  }, [lanterns]);

  return (
    <group>
      <lineSegments geometry={lines}>
        <lineBasicMaterial color="#2a211a" />
      </lineSegments>
      <instancedMesh ref={mesh} args={[null, null, lanterns.length]}>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {POLES.map(([x, z], i) => (
        <mesh key={i} position={[x, POLE_HEIGHT / 2, z]}>
          <cylinderGeometry args={[0.07, 0.09, POLE_HEIGHT, 8]} />
          <meshStandardMaterial color={DARK_WOOD} />
        </mesh>
      ))}
    </group>
  );
};

const NightSky = () => {
  const stars = React.useMemo(() => {
    const positions = [];
    for (let i = 0; i < 700; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.42;
      const r = 90;
      positions.push(Math.sin(phi) * Math.cos(theta) * r, Math.cos(phi) * r * 0.6 + 6, Math.sin(phi) * Math.sin(theta) * r);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  }, []);
  return (
    <group>
      <points geometry={stars}>
        <pointsMaterial color="#e6ecff" size={0.22} sizeAttenuation toneMapped={false} fog={false} />
      </points>
      <mesh position={[-34, 38, -52]}>
        <sphereGeometry args={[2.6, 24, 16]} />
        <meshBasicMaterial color="#fff3d6" toneMapped={false} fog={false} />
      </mesh>
    </group>
  );
};

const SHELLS = 3;
const SPARKS = 150;
const FIREWORK_COLORS = ["#ff6b6b", "#ffd166", "#7bdff2", "#cdb4db", "#f4a261", "#b8f2a8"];
const BURST_SECONDS = 2.6;

// A few firework shells over the north sky, reused one after another.
const Fireworks = () => {
  const shells = React.useMemo(() => Array.from({length: SHELLS}, () => {
    const directions = new Float32Array(SPARKS * 3);
    for (let i = 0; i < SPARKS; i++) {
      const direction = new THREE.Vector3().randomDirection().multiplyScalar(0.75 + Math.random() * 0.25);
      directions.set([direction.x, direction.y, direction.z], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3));
    const material = new THREE.PointsMaterial({size: 0.55, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false, fog: false});
    return {directions, geometry, material, start: -100, origin: new THREE.Vector3(), radius: 8};
  }), []);
  const next = React.useRef(1.5);

  React.useEffect(() => () => shells.forEach((shell) => {
    shell.geometry.dispose();
    shell.material.dispose();
  }), [shells]);

  useFrame(({clock}) => {
    const now = clock.elapsedTime;
    if (now > next.current) {
      const shell = shells.find((item) => now - item.start > BURST_SECONDS) || shells[0];
      shell.start = now;
      shell.origin.set((Math.random() - 0.5) * 50, 20 + Math.random() * 10, -36 - Math.random() * 14);
      shell.radius = 6 + Math.random() * 5;
      shell.material.color.set(FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]);
      next.current = now + 1.6 + Math.random() * 3;
      if (getGalleryState().room === "festival") audio.firework();
    }
    shells.forEach((shell) => {
      const t = now - shell.start;
      if (t > BURST_SECONDS) {
        shell.material.opacity = 0;
        return;
      }
      const spread = 1 - Math.exp(-t * 3.2);
      const positions = shell.geometry.attributes.position.array;
      for (let i = 0; i < SPARKS; i++) {
        positions[i * 3] = shell.origin.x + shell.directions[i * 3] * shell.radius * spread;
        positions[i * 3 + 1] = shell.origin.y + shell.directions[i * 3 + 1] * shell.radius * spread - t * t * 0.9;
        positions[i * 3 + 2] = shell.origin.z + shell.directions[i * 3 + 2] * shell.radius * spread;
      }
      shell.geometry.attributes.position.needsUpdate = true;
      shell.material.opacity = Math.max(0, 1 - t / BURST_SECONDS);
    });
  });

  return shells.map((shell, i) => <points key={i} geometry={shell.geometry} material={shell.material} frustumCulled={false} />);
};

// Warm light from the lanterns, kept to a few lights so it stays cheap.
const FestivalLights = () => (
  <group>
    <pointLight position={[YAGURA.center[0], YAGURA.deck + 1.2, YAGURA.center[1]]} color="#ffb36b" intensity={28} distance={20} decay={1.6} />
    <pointLight position={[-8, 3.2, -2.5]} color="#ff9a5c" intensity={14} distance={14} decay={1.6} />
    <pointLight position={[8, 3.2, -2.5]} color="#ff9a5c" intensity={14} distance={14} decay={1.6} />
    <pointLight position={[0, 3.4, STAGE.center[1] + 2.5]} color="#ffd9a0" intensity={14} distance={12} decay={1.6} />
    <pointLight position={[0, 4, TORII.center[1] - 1.5]} color="#ffb36b" intensity={8} distance={10} decay={1.6} />
  </group>
);

const Festival = () => {
  const room = useGalleryStore((state) => state.exhibition.rooms.festival);

  React.useEffect(() => {
    getGalleryState().set({focusedId: null});
  }, []);

  return (
    <group>
      <Ground />
      <Fence />
      <Trees />
      <Torii />
      {STALLS.map((stall) => <Stall key={stall.slot} stall={stall} />)}
      <Yagura />
      <Stage />
      <LanternStrings />
      <NightSky />
      <Fireworks />
      <FestivalLights />
      <Portal placement={PORTAL} colors={["#7a2a3b", "#ffb36b"]} label="← 回到主展廳" />
      <React.Suspense fallback={null}>
        {room.artworks.map(({artwork, placement}) => (
          <Painting key={artwork.id} artwork={artwork} placement={placement} />
        ))}
      </React.Suspense>
    </group>
  );
};

export default Festival;
