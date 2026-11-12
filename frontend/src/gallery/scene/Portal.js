/* eslint-disable react/no-unknown-property, react/prop-types */
import * as React from "react";
import * as THREE from "three";
import PropTypes from "prop-types";
import {useFrame} from "@react-three/fiber";
import {Html, MeshPortalMaterial, useTexture} from "@react-three/drei";
import {runtime} from "../runtime";
import {useGalleryStore} from "../store";
import {radialTexture, lightPoolTexture} from "../textures";

const WIDTH = 2.4;
const PILLAR_HEIGHT = 2.3;
const ARCH_RADIUS = WIDTH / 2;
const TOP = PILLAR_HEIGHT + ARCH_RADIUS;
const FRAME_RADIUS = 0.055;
// the label shows within this distance
const LABEL_DISTANCE = 7;

// Opening shape: a rectangle topped by a half circle.
const openingShape = () => {
  const shape = new THREE.Shape();
  shape.moveTo(-ARCH_RADIUS, 0);
  shape.lineTo(-ARCH_RADIUS, PILLAR_HEIGHT);
  shape.absarc(0, PILLAR_HEIGHT, ARCH_RADIUS, Math.PI, 0, true);
  shape.lineTo(ARCH_RADIUS, 0);
  shape.lineTo(-ARCH_RADIUS, 0);
  return shape;
};

// The outline of the opening as a 3D curve, `offset` meters outside it.
const archCurve = (offset) => {
  const radius = ARCH_RADIUS + offset;
  const points = [];
  for (let i = 0; i <= 8; i++) points.push(new THREE.Vector3(-radius, (PILLAR_HEIGHT * i) / 8, 0));
  for (let i = 1; i < 40; i++) {
    const angle = Math.PI - (Math.PI * i) / 40;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, PILLAR_HEIGHT + Math.sin(angle) * radius, 0));
  }
  for (let i = 8; i >= 0; i--) points.push(new THREE.Vector3(radius, (PILLAR_HEIGHT * i) / 8, 0));
  return new THREE.CatmullRomCurve3(points, false, "centripetal");
};

const membraneVertex = `
  varying vec3 vPosition;
  void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Energy at the edge of the opening: brightest along the frame, flowing upward.
// On low quality it also fills the opening with a soft gradient instead of the
// rendered view through the portal.
const membraneFragment = `
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uFill;
  varying vec3 vPosition;
  void main() {
    vec2 p = vPosition.xy;
    float edge = p.y < ${PILLAR_HEIGHT.toFixed(2)}
      ? min(${ARCH_RADIUS.toFixed(2)} - abs(p.x), p.y + 0.4)
      : ${ARCH_RADIUS.toFixed(2)} - length(p - vec2(0.0, ${PILLAR_HEIGHT.toFixed(2)}));
    float flow = sin(p.y * 7.0 - uTime * 2.4 + sin(p.x * 5.0 + uTime) * 1.5) * 0.5 + 0.5;
    float rim = exp(-edge * 22.0) * (0.45 + flow * 0.55);
    vec3 color = mix(uColorA, uColorB, 0.5 + flow * 0.5) * rim * 1.2;
    float fill = uFill * (0.35 + 0.25 * smoothstep(0.0, ${TOP.toFixed(2)}, p.y));
    color += mix(uColorA, uColorB, p.y / ${TOP.toFixed(2)}) * fill;
    gl_FragColor = vec4(color, 1.0);
  }
`;

// --- what you see through the portal ----------------------------------------------
// Each view is a small set built behind the opening (negative z), rendered with
// the visitor's own camera so it shifts with parallax like a real doorway.

const seeded = (seed) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const Stars = ({color, count = 260, seed = 3}) => {
  const geometry = React.useMemo(() => {
    const random = seeded(seed);
    const positions = [];
    for (let i = 0; i < count; i++) positions.push((random() - 0.5) * 30, random() * 14 - 1, -4 - random() * 30);
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return result;
  }, [count, seed]);
  return (
    <points geometry={geometry}>
      <pointsMaterial color={color} size={0.07} sizeAttenuation transparent opacity={0.85} toneMapped={false} />
    </points>
  );
};

// A framed preview of one of the destination's artworks.
const PreviewFrame = ({url, position, rotationY = 0, height = 1.3, mat = "#f4f1ea", bob = 0}) => {
  const texture = useTexture(url, (loaded) => {
    loaded.colorSpace = THREE.SRGBColorSpace;
  });
  const group = React.useRef();
  const width = (height * texture.image.width) / texture.image.height;
  useFrame(({clock}) => {
    if (bob && group.current) group.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.8 + bob) * 0.12;
  });
  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[width + 0.22, height + 0.22]} />
        <meshBasicMaterial color={mat} toneMapped={false} />
      </mesh>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
};

const useRoomPreviews = (roomId, count) => useGalleryStore((state) => state.exhibition.rooms[roomId]?.artworks
    .slice(0, count)
    .map((entry) => entry.artwork.previewUrl)
    .join("|") || "").split("|").filter(Boolean);

const ANNEX_SPOTS = [[-1.5, 1.8, -4.5, 0.35], [1.6, 2.5, -6.5, -0.3], [-0.3, 3.1, -9.5, 0.1], [2.9, 1.5, -11.5, -0.4], [-3.2, 2.6, -13, 0.4]];

// The floating room: paintings drifting in a starry dark, with glowing rings below.
const AnnexView = () => {
  const previews = useRoomPreviews("annex", ANNEX_SPOTS.length);
  return (
    <>
      <color attach="background" args={["#05060d"]} />
      <fog attach="fog" args={["#05060d", 5, 28]} />
      <Stars color="#cfe0ff" />
      {[3.2, 6, 9].map((radius) => (
        <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, -10]}>
          <ringGeometry args={[radius - 0.03, radius, 128]} />
          <meshBasicMaterial color="#7fd8ff" transparent opacity={0.7} toneMapped={false} />
        </mesh>
      ))}
      <React.Suspense fallback={null}>
        {previews.map((url, i) => {
          const [x, y, z, rotationY] = ANNEX_SPOTS[i];
          return <PreviewFrame key={url} url={url} position={[x, y, z]} rotationY={rotationY} bob={i * 1.7} />;
        })}
      </React.Suspense>
    </>
  );
};

const MAIN_SPOTS = [-3.4, 0, 3.4];

// The main hall: a warm gallery wall with lit paintings.
const MainView = () => {
  const previews = useRoomPreviews("main", MAIN_SPOTS.length);
  return (
    <>
      <color attach="background" args={["#1a120c"]} />
      <fog attach="fog" args={["#1a120c", 6, 22]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -6]}>
        <planeGeometry args={[30, 16]} />
        <meshBasicMaterial color="#2e2118" />
      </mesh>
      <mesh position={[0, 3, -9]}>
        <planeGeometry args={[30, 7]} />
        <meshBasicMaterial color="#4a3a2e" />
      </mesh>
      {MAIN_SPOTS.map((x) => (
        <mesh key={x} position={[x, 2.4, -8.98]}>
          <planeGeometry args={[3.2, 5]} />
          <meshBasicMaterial map={lightPoolTexture()} color="#ffd6a0" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      <React.Suspense fallback={null}>
        {previews.map((url, i) => <PreviewFrame key={url} url={url} position={[MAIN_SPOTS[i], 2.1, -8.95]} height={1.6} />)}
      </React.Suspense>
    </>
  );
};

const VIEWS = {annex: AnnexView, main: MainView};

/**
 * A slim metal archway that opens onto another room: you see the destination
 * through it, with an energy shimmer along its edge.
 * @return {Portal} portal
 */
const Portal = ({placement, colors, label}) => {
  const quality = useGalleryStore((state) => state.resolvedQuality());
  const [near, setNear] = React.useState(false);
  const opening = React.useMemo(() => new THREE.ShapeGeometry(openingShape(), 32), []);
  const frame = React.useMemo(() => new THREE.TubeGeometry(archCurve(FRAME_RADIUS), 120, FRAME_RADIUS, 12, false), []);
  const rim = React.useMemo(() => new THREE.TubeGeometry(archCurve(0.004), 120, 0.012, 6, false), []);
  const throughView = quality !== "low";
  const uniforms = React.useMemo(() => ({
    uTime: {value: 0},
    uColorA: {value: new THREE.Color(colors[0])},
    uColorB: {value: new THREE.Color(colors[1])},
    uFill: {value: 0},
  }), [colors]);
  uniforms.uFill.value = throughView ? 0 : 1;
  const View = VIEWS[placement.target] || MainView;

  useFrame(({clock}) => {
    uniforms.uTime.value = clock.elapsedTime;
    const distance = Math.hypot(runtime.player.position.x - placement.position[0], runtime.player.position.z - placement.position[2]);
    if ((distance < LABEL_DISTANCE) !== near) setNear(distance < LABEL_DISTANCE);
  });

  return (
    <group position={placement.position} rotation={[0, placement.rotationY, 0]}>
      {throughView && (
        <mesh geometry={opening} position={[0, 0, 0.01]}>
          <MeshPortalMaterial resolution={512}>
            <View />
          </MeshPortalMaterial>
        </mesh>
      )}
      {/* the energy at the edge (and the whole fill on low quality) */}
      <mesh geometry={opening} position={[0, 0, 0.02]} renderOrder={2}>
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={membraneVertex}
          fragmentShader={membraneFragment}
          transparent
          depthWrite={false}
          blending={throughView ? THREE.AdditiveBlending : THREE.NormalBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh geometry={frame}>
        <meshStandardMaterial color="#1f1f22" metalness={0.85} roughness={0.28} />
      </mesh>
      <mesh geometry={rim} position={[0, 0, 0.03]}>
        <meshBasicMaterial color={colors[1]} toneMapped={false} />
      </mesh>
      {/* a threshold plate and light spilling onto the floor */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[WIDTH + FRAME_RADIUS * 4, 0.02, 0.24]} />
        <meshStandardMaterial color="#1f1f22" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 1.1]} renderOrder={1}>
        <planeGeometry args={[WIDTH * 2, 2.6]} />
        <meshBasicMaterial map={radialTexture()} color={colors[1]} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {near && (
        <Html position={[0, TOP + 0.45, 0]} center zIndexRange={[20, 0]} style={{pointerEvents: "none"}}>
          <div className="gallery-portal-label">{label}</div>
        </Html>
      )}
    </group>
  );
};

Portal.propTypes = {
  // placement.target names the room the portal leads to, which it shows through the opening
  placement: PropTypes.object.isRequired,
  colors: PropTypes.arrayOf(PropTypes.string).isRequired,
  label: PropTypes.string.isRequired,
};

export default Portal;
