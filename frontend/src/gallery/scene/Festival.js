/* eslint-disable react/no-unknown-property, react/prop-types */
import * as React from "react";
import * as THREE from "three";
import {useFrame} from "@react-three/fiber";
import {
  WALL_RADIUS, WALL_HEIGHT, GARDEN_RADIUS, POST_RADIUS, BENCH_RADIUS, ROOF, GATE_HALF_ANGLE, BAMBOO, TREE,
  SLOT_ANGLES, POST_ANGLES, BENCH_ANGLES, BENCH, TORII, PORTAL, ringPoint,
} from "../layout/festival";
import {useGalleryStore, getGalleryState} from "../store";
import audio from "../audio/AudioEngine";
import Painting from "./Painting";
import Portal from "./Portal";

const DARK_WOOD = "#3b2a1f";
const POST_RED = "#7a2a20";
const SHRINE_RED = "#b8322a";

// A small deterministic random, so the garden looks the same on every visit.
const seeded = (seed) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const canvasTexture = (width, height, draw, repeat) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d"), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(...repeat);
  }
  return texture;
};

// Raked gravel: concentric grooves around the tree.
const gravelTexture = () => canvasTexture(1024, 1024, (context, size) => {
  context.fillStyle = "#d8d1c3";
  context.fillRect(0, 0, size, size);
  context.lineWidth = 3;
  for (let r = 40; r < size / 2; r += 14) {
    context.strokeStyle = r % 28 ? "rgba(120, 108, 92, 0.32)" : "rgba(255, 255, 255, 0.5)";
    context.beginPath();
    context.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    context.stroke();
  }
});

// Paving for the walkway.
const pavingTexture = () => canvasTexture(256, 256, (context, size) => {
  context.fillStyle = "#8c5c4a";
  context.fillRect(0, 0, size, size);
  for (let row = 0; row < 8; row++) {
    for (let column = 0; column < 4; column++) {
      const offset = row % 2 ? 32 : 0;
      context.fillStyle = `hsl(14, ${28 + ((row * 7 + column * 3) % 10)}%, ${36 + ((row * 5 + column * 11) % 9)}%)`;
      context.fillRect(column * 64 + offset + 2, row * 32 + 2, 60, 28);
    }
  }
}, [36, 4]);

// Shoji: a paper screen with a wooden lattice, lit from behind.
const shojiTexture = () => canvasTexture(256, 384, (context, width, height) => {
  context.fillStyle = "#fbf2df";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#6b4a32";
  context.lineWidth = 6;
  context.strokeRect(3, 3, width - 6, height - 6);
  context.lineWidth = 3;
  for (let x = width / 4; x < width; x += width / 4) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = height / 6; y < height; y += height / 6) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
});

// Roof slats seen from below.
const slatTexture = () => canvasTexture(512, 16, (context, width, height) => {
  context.fillStyle = "#5e1c16";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#9a2f24";
  for (let x = 0; x < width; x += 16) context.fillRect(x, 0, 11, height);
}, [6, 1]);

// A paper umbrella canopy: colored panels with thin ribs.
const umbrellaTexture = (colors) => canvasTexture(512, 64, (context, width, height) => {
  const panels = 16;
  for (let i = 0; i < panels; i++) {
    context.fillStyle = colors[i % colors.length];
    context.fillRect((i * width) / panels, 0, width / panels, height);
  }
  context.fillStyle = "rgba(60, 30, 20, 0.6)";
  for (let i = 0; i < panels; i++) context.fillRect((i * width) / panels, 0, 2, height);
  context.fillStyle = "rgba(255, 255, 255, 0.35)";
  context.fillRect(0, height * 0.72, width, 3);
});

const Box = ({position, size, color, rotation, roughness = 0.85}) => (
  <mesh position={position} rotation={rotation} castShadow receiveShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={roughness} />
  </mesh>
);

// Something standing on the ring at `angle`, turned to face the garden.
const OnRing = ({angle, radius, y = 0, children}) => {
  const [x, z] = ringPoint(angle, radius);
  return <group position={[x, y, z]} rotation={[0, -angle, 0]}>{children}</group>;
};

// --- sky -----------------------------------------------------------------------------

const SKY_VERTEX = `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
// summer dusk: deep blue overhead, violet, then a warm band at the horizon
const SKY_FRAGMENT = `
  varying vec3 vDirection;
  void main() {
    float h = clamp(vDirection.y, -0.1, 1.0);
    vec3 horizon = vec3(0.98, 0.62, 0.40);
    vec3 middle = vec3(0.46, 0.27, 0.45);
    vec3 top = vec3(0.10, 0.10, 0.24);
    vec3 color = mix(horizon, middle, smoothstep(0.0, 0.18, h));
    color = mix(color, top, smoothstep(0.18, 0.6, h));
    gl_FragColor = vec4(color, 1.0);
  }
`;

const Sky = () => {
  const stars = React.useMemo(() => {
    const random = seeded(7);
    const positions = [];
    for (let i = 0; i < 400; i++) {
      const theta = random() * Math.PI * 2;
      const phi = 0.15 + random() * 0.9;
      positions.push(Math.cos(theta) * Math.sin(phi) * 110, Math.cos(phi) * 110, Math.sin(theta) * Math.sin(phi) * 110);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  }, []);
  return (
    <group>
      <mesh>
        <sphereGeometry args={[130, 32, 16]} />
        <shaderMaterial vertexShader={SKY_VERTEX} fragmentShader={SKY_FRAGMENT} side={THREE.BackSide} depthWrite={false} fog={false} />
      </mesh>
      <points geometry={stars}>
        <pointsMaterial color="#e6ecff" size={0.25} sizeAttenuation transparent opacity={0.8} toneMapped={false} fog={false} />
      </points>
    </group>
  );
};

const SHELLS = 3;
const SPARKS = 150;
const FIREWORK_COLORS = ["#ff6b6b", "#ffd166", "#7bdff2", "#cdb4db", "#f4a261", "#b8f2a8"];
const BURST_SECONDS = 2.6;

// A few firework shells over the courtyard wall, reused one after another.
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
      const angle = Math.random() * Math.PI * 2;
      shell.start = now;
      shell.origin.set(Math.sin(angle) * (30 + Math.random() * 12), 24 + Math.random() * 10, -Math.cos(angle) * (30 + Math.random() * 12));
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

// Dark tree tops beyond the wall, so the horizon isn't empty.
const Treeline = () => {
  const mesh = React.useRef();
  const trees = React.useMemo(() => {
    const random = seeded(11);
    return Array.from({length: 60}, (_, i) => {
      const angle = (i / 60) * Math.PI * 2 + random() * 0.05;
      const radius = 19 + random() * 7;
      return {x: Math.sin(angle) * radius, z: -Math.cos(angle) * radius, scale: 0.9 + random() * 0.8};
    });
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
      <coneGeometry args={[3, 9, 7]} />
      <meshStandardMaterial color="#1b2420" roughness={1} />
    </instancedMesh>
  );
};

// --- the walkway -----------------------------------------------------------------------

const Walkway = () => {
  const paving = React.useMemo(pavingTexture, []);
  const slats = React.useMemo(slatTexture, []);
  const roof = React.useMemo(() => new THREE.LatheGeometry([
    new THREE.Vector2(ROOF.inner, ROOF.innerHeight),
    new THREE.Vector2(ROOF.outer, ROOF.outerHeight),
  ], 96), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <ringGeometry args={[GARDEN_RADIUS + 0.2, WALL_RADIUS + 0.4, 128, 1]} />
        <meshStandardMaterial map={paving} roughness={0.9} />
      </mesh>
      {/* the back wall, open to the south for the torii */}
      <mesh position={[0, WALL_HEIGHT / 2, 0]} receiveShadow>
        <cylinderGeometry args={[WALL_RADIUS, WALL_RADIUS, WALL_HEIGHT, 128, 1, true, GATE_HALF_ANGLE, Math.PI * 2 - GATE_HALF_ANGLE * 2]} />
        <meshStandardMaterial color="#2c2622" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* roof slats and the beam along its inner edge */}
      <mesh geometry={roof}>
        <meshStandardMaterial map={slats} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, ROOF.innerHeight - 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ROOF.inner, 0.12, 8, 128]} />
        <meshStandardMaterial color={DARK_WOOD} roughness={0.8} />
      </mesh>
      <mesh position={[0, ROOF.innerHeight - 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[POST_RADIUS, 0.08, 8, 128]} />
        <meshStandardMaterial color={POST_RED} roughness={0.7} />
      </mesh>
      {POST_ANGLES.map((angle) => {
        const [x, z] = ringPoint(angle, POST_RADIUS);
        return (
          <mesh key={angle} position={[x, ROOF.innerHeight / 2, z]} castShadow>
            <cylinderGeometry args={[0.14, 0.16, ROOF.innerHeight, 10]} />
            <meshStandardMaterial color={POST_RED} roughness={0.7} />
          </mesh>
        );
      })}
      {/* paper lanterns under the roof */}
      {POST_ANGLES.filter((_, i) => i % 2).map((angle) => {
        const [x, z] = ringPoint(angle + 0.17, 12.4);
        return (
          <group key={angle} position={[x, 4.05, z]}>
            <mesh scale={[1, 1.25, 1]}>
              <sphereGeometry args={[0.22, 16, 12]} />
              <meshBasicMaterial color="#ffb347" toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.5, 0]}>
              <cylinderGeometry args={[0.01, 0.01, 0.7, 4]} />
              <meshBasicMaterial color="#1a1412" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// Shoji screens between the paintings, and a red frame around each painting and its label.
const WallDressing = () => {
  const shoji = React.useMemo(shojiTexture, []);
  const slotAngles = Object.values(SLOT_ANGLES).sort((a, b) => a - b);
  const between = slotAngles.slice(0, -1).map((angle, i) => (angle + slotAngles[i + 1]) / 2);
  return (
    <group>
      {between.map((angle) => (
        <OnRing key={angle} angle={angle} radius={WALL_RADIUS - 0.06} y={1.7}>
          <mesh>
            <planeGeometry args={[2.4, 3.1]} />
            <meshBasicMaterial map={shoji} toneMapped={false} />
          </mesh>
        </OnRing>
      ))}
      {slotAngles.map((angle) => (
        <OnRing key={angle} angle={angle} radius={WALL_RADIUS - 0.35}>
          {/* wide enough for a landscape painting and the label beside it */}
          {[-1, 1].map((side) => (
            <Box key={side} position={[side * 3.3, 1.75, 0]} size={[0.14, 3.5, 0.14]} color={SHRINE_RED} roughness={0.6} />
          ))}
          <Box position={[0, 3.55, 0]} size={[7.2, 0.16, 0.18]} color={SHRINE_RED} roughness={0.6} />
          <Box position={[0, 3.25, 0]} size={[6.7, 0.08, 0.1]} color={SHRINE_RED} roughness={0.6} />
          {/* a thin teal line glowing under the beam */}
          <mesh position={[0, 3.18, 0.06]}>
            <planeGeometry args={[6.4, 0.03]} />
            <meshBasicMaterial color="#38c9b8" toneMapped={false} />
          </mesh>
        </OnRing>
      ))}
    </group>
  );
};

const Benches = () => BENCH_ANGLES.map((angle) => (
  <OnRing key={angle} angle={angle} radius={BENCH_RADIUS}>
    <Box position={[0, BENCH.height, 0]} size={[BENCH.length, 0.08, BENCH.depth]} color="#8a5a34" roughness={0.6} />
    {[-1, 1].map((side) => (
      <Box key={side} position={[side * (BENCH.length / 2 - 0.25), BENCH.height / 2, 0]} size={[0.12, BENCH.height, BENCH.depth - 0.1]} color="#4a4440" />
    ))}
  </OnRing>
));

const Torii = () => {
  const [x, z] = TORII.center;
  const half = TORII.width / 2;
  return (
    <group position={[x, 0, z]}>
      {[-half, half].map((offset) => (
        <mesh key={offset} position={[offset, TORII.height / 2, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.26, TORII.height, 16]} />
          <meshStandardMaterial color={SHRINE_RED} roughness={0.6} />
        </mesh>
      ))}
      <Box position={[0, TORII.height - 0.9, 0]} size={[TORII.width + 0.8, 0.24, 0.22]} color={SHRINE_RED} roughness={0.6} />
      <Box position={[0, TORII.height + 0.05, 0]} size={[TORII.width + 1.8, 0.32, 0.44]} color={SHRINE_RED} roughness={0.6} />
      <Box position={[0, TORII.height + 0.28, 0]} size={[TORII.width + 2.2, 0.16, 0.56]} color="#1a1412" />
    </group>
  );
};

// --- the garden --------------------------------------------------------------------------

const Garden = () => {
  const gravel = React.useMemo(gravelTexture, []);
  const {moss, rocks} = React.useMemo(() => {
    const random = seeded(23);
    const moss = Array.from({length: 7}, (_, i) => {
      const angle = (i / 7) * Math.PI * 2 + random() * 0.4;
      const radius = 3.2 + random() * 3;
      return {position: ringPoint(angle, radius), scale: [1.2 + random() * 1.4, 1, 0.8 + random()], rotation: random() * Math.PI};
    });
    const rocks = Array.from({length: 9}, (_, i) => {
      const angle = (i / 9) * Math.PI * 2 + 0.3;
      const radius = 4 + random() * 2.6;
      return {position: ringPoint(angle, radius), scale: [0.5 + random() * 0.8, 0.4 + random() * 0.9, 0.5 + random() * 0.7], rotation: random() * Math.PI};
    });
    return {moss, rocks};
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <circleGeometry args={[GARDEN_RADIUS, 128]} />
        <meshStandardMaterial map={gravel} roughness={1} />
      </mesh>
      {/* stone curb */}
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[GARDEN_RADIUS + 0.2, GARDEN_RADIUS + 0.2, 0.28, 128, 1, true]} />
        <meshStandardMaterial color="#77716a" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.28, 0]}>
        <ringGeometry args={[GARDEN_RADIUS, GARDEN_RADIUS + 0.2, 128]} />
        <meshStandardMaterial color="#8d867d" roughness={0.9} />
      </mesh>
      {moss.map((item, i) => (
        <mesh key={i} position={[item.position[0], 0.05, item.position[1]]} rotation={[0, item.rotation, 0]} scale={[item.scale[0], 0.12, item.scale[2]]} receiveShadow>
          <sphereGeometry args={[1, 20, 10]} />
          <meshStandardMaterial color="#5f7233" roughness={1} />
        </mesh>
      ))}
      {rocks.map((item, i) => (
        <mesh key={i} position={[item.position[0], item.scale[1] * 0.4, item.position[1]]} rotation={[0.2, item.rotation, 0.1]} scale={item.scale} castShadow>
          <dodecahedronGeometry args={[0.8, 0]} />
          <meshStandardMaterial color="#4a4743" roughness={0.95} flatShading />
        </mesh>
      ))}
      <StoneLantern position={[3.4, 0, 3.6]} />
      <StoneLantern position={[-4.2, 0, -2.6]} />
    </group>
  );
};

// 石燈籠
const StoneLantern = ({position}) => (
  <group position={position}>
    <Box position={[0, 0.1, 0]} size={[0.7, 0.2, 0.7]} color="#8a857c" />
    <mesh position={[0, 0.6, 0]}>
      <cylinderGeometry args={[0.12, 0.16, 0.8, 8]} />
      <meshStandardMaterial color="#8a857c" roughness={0.95} />
    </mesh>
    <Box position={[0, 1.05, 0]} size={[0.6, 0.12, 0.6]} color="#8a857c" />
    <Box position={[0, 1.3, 0]} size={[0.42, 0.38, 0.42]} color="#8a857c" />
    <mesh position={[0, 1.3, 0]}>
      <boxGeometry args={[0.44, 0.2, 0.2]} />
      <meshBasicMaterial color="#ffcf7a" toneMapped={false} />
    </mesh>
    <mesh position={[0, 1.65, 0]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[0.6, 0.35, 4]} />
      <meshStandardMaterial color="#7d786f" roughness={0.95} />
    </mesh>
  </group>
);

const Bamboo = () => {
  const mesh = React.useRef();
  const stalks = React.useMemo(() => {
    const random = seeded(31);
    const list = [];
    while (list.length < 90) {
      const angle = random() * Math.PI * 2;
      const radius = BAMBOO.inner + random() * (BAMBOO.outer - BAMBOO.inner);
      // keep a clear view from the gate to the tree
      if (Math.abs(Math.atan2(Math.sin(angle - Math.PI), Math.cos(angle - Math.PI))) < 0.22) continue;
      list.push({position: ringPoint(angle, radius), height: 7 + random() * 5, radius: 0.06 + random() * 0.05, tint: random()});
    }
    return list;
  }, []);
  React.useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    stalks.forEach((stalk, i) => {
      matrix.compose(new THREE.Vector3(stalk.position[0], stalk.height / 2, stalk.position[1]), new THREE.Quaternion(),
          new THREE.Vector3(stalk.radius / 0.08, stalk.height, stalk.radius / 0.08));
      mesh.current.setMatrixAt(i, matrix);
      mesh.current.setColorAt(i, color.setHSL(0.2 + stalk.tint * 0.08, 0.42, 0.3 + stalk.tint * 0.12));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.instanceColor.needsUpdate = true;
  }, [stalks]);
  return (
    <instancedMesh ref={mesh} args={[null, null, stalks.length]} castShadow>
      <cylinderGeometry args={[0.08, 0.08, 1, 8]} />
      <meshStandardMaterial roughness={0.6} />
    </instancedMesh>
  );
};

// A crape myrtle (百日紅), which flowers pink through the summer.
const FloweringTree = () => {
  const blossoms = React.useRef();
  const {branches, clusters} = React.useMemo(() => {
    const random = seeded(47);
    const [cx, cz] = TREE.center;
    const trunk = [[cx, 0, cz], [cx + 0.2, 1.1, cz - 0.1], [cx - 0.1, 2.1, cz + 0.15], [cx + 0.1, 2.8, cz]];
    const branches = [{points: trunk, radius: 0.32}];
    const tips = [];
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2 + random() * 0.4;
      const reach = 2 + random() * 1.3;
      const lift = 1 + random() * 1.3;
      const tip = [cx + Math.sin(angle) * reach, 2.8 + lift, cz - Math.cos(angle) * reach];
      const mid = [cx + Math.sin(angle) * reach * 0.45, 2.8 + lift * 0.4 + 0.35, cz - Math.cos(angle) * reach * 0.45];
      branches.push({points: [[cx + 0.1, 2.5, cz], mid, tip], radius: 0.12 + random() * 0.05});
      tips.push(tip);
    }
    const clusters = [];
    tips.forEach((tip) => {
      for (let i = 0; i < 34; i++) {
        const offset = new THREE.Vector3().randomDirection().multiplyScalar(Math.cbrt(random()) * 1.5);
        clusters.push({position: [tip[0] + offset.x, tip[1] + offset.y * 0.65 + 0.2, tip[2] + offset.z], scale: 0.28 + random() * 0.32, tint: random()});
      }
    });
    return {branches, clusters};
  }, []);
  const geometries = React.useMemo(() => branches.map(({points, radius}) =>
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point))), 24, radius, 8, false)), [branches]);
  React.useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    clusters.forEach((cluster, i) => {
      matrix.compose(new THREE.Vector3(...cluster.position), new THREE.Quaternion(), new THREE.Vector3(cluster.scale, cluster.scale * 0.8, cluster.scale));
      blossoms.current.setMatrixAt(i, matrix);
      blossoms.current.setColorAt(i, color.setHSL(0.93 + cluster.tint * 0.05, 0.62, 0.62 + cluster.tint * 0.14));
    });
    blossoms.current.instanceMatrix.needsUpdate = true;
    blossoms.current.instanceColor.needsUpdate = true;
  }, [clusters]);
  return (
    <group>
      {geometries.map((geometry, i) => (
        <mesh key={i} geometry={geometry} castShadow>
          <meshStandardMaterial color="#6b4a3a" roughness={0.85} />
        </mesh>
      ))}
      <instancedMesh ref={blossoms} args={[null, null, clusters.length]} castShadow>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={0.8} flatShading />
      </instancedMesh>
    </group>
  );
};

const UMBRELLA_COLORS = [
  ["#c8323c", "#f3e6d2"], ["#f2c14e", "#f7e3b0"], ["#e7848f", "#f6d5d8"],
  ["#c8323c", "#c8323c", "#f3e6d2"], ["#f3e6d2", "#e9b872"], ["#e06c4f", "#f3e6d2"],
];

// Paper umbrellas (和傘) floating over the garden, turning slowly.
const Umbrellas = () => {
  const group = React.useRef();
  const umbrellas = React.useMemo(() => {
    const random = seeded(59);
    return Array.from({length: 10}, (_, i) => {
      const angle = (i / 10) * Math.PI * 2 + random() * 0.3;
      const radius = 2.5 + random() * 4.5;
      return {
        position: [...ringPoint(angle, radius)], height: 5.4 + random() * 2.4, size: 1.2 + random() * 0.7,
        tilt: [(random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5], texture: umbrellaTexture(UMBRELLA_COLORS[i % UMBRELLA_COLORS.length]), phase: random() * 6,
      };
    });
  }, []);
  useFrame(({clock}) => {
    const time = clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const umbrella = umbrellas[i];
      child.position.y = umbrella.height + Math.sin(time * 0.5 + umbrella.phase) * 0.25;
      child.rotation.y = time * 0.08 + umbrella.phase;
    });
  });
  return (
    <group ref={group}>
      {umbrellas.map((umbrella, i) => (
        <group key={i} position={[umbrella.position[0], umbrella.height, umbrella.position[1]]}>
          <group rotation={umbrella.tilt}>
            <mesh>
              <coneGeometry args={[umbrella.size, umbrella.size * 0.32, 32, 1, true]} />
              <meshStandardMaterial map={umbrella.texture} roughness={0.8} side={THREE.DoubleSide} transparent opacity={0.94} />
            </mesh>
            <mesh position={[0, -0.55, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 1.2, 6]} />
              <meshStandardMaterial color="#5a3a22" />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
};

// Warm evening light: the lanterns along the walkway and a glow under the tree.
const FestivalLights = () => (
  <group>
    <hemisphereLight args={["#f6b48a", "#3a2a2a", 0.6]} />
    <directionalLight position={[-20, 9, 18]} color="#ffb27a" intensity={0.9} />
    <pointLight position={[0, 2.5, 0]} color="#ffc3d0" intensity={22} distance={14} decay={1.6} />
    {[45, 135, 225, 315].map((degrees) => {
      const [x, z] = ringPoint((degrees * Math.PI) / 180, 12.3);
      return <pointLight key={degrees} position={[x, 3.1, z]} color="#ffb36b" intensity={12} distance={11} decay={1.6} />;
    })}
  </group>
);

const Festival = () => {
  const room = useGalleryStore((state) => state.exhibition.rooms.festival);

  React.useEffect(() => {
    getGalleryState().set({focusedId: null});
  }, []);

  return (
    <group>
      <Sky />
      <Fireworks />
      <Treeline />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#2a2620" roughness={1} />
      </mesh>
      <Walkway />
      <WallDressing />
      <Benches />
      <Torii />
      <Garden />
      <Bamboo />
      <FloweringTree />
      <Umbrellas />
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
