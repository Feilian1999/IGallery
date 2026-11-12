/* eslint-disable react/no-unknown-property */
import * as React from "react";
import * as THREE from "three";
import {useFrame} from "@react-three/fiber";
import {Html} from "@react-three/drei";
import {runtime} from "../runtime";
import {PLATFORM, FESTIVAL_GATE} from "../layout/mainHall";

const COLORS = ["#7a2a3b", "#ffb36b"];
const BEAM_HEIGHT = 3.9;
const BEAM_RADIUS = PLATFORM.radius * 0.72;
const LABEL_HEIGHT = 4.1;
// the label shows within this distance of the platform
const LABEL_DISTANCE = 7;

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// A slow spiral on the platform top, in the festival's dusk colors.
const swirlShader = `
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec3 vPosition;
  void main() {
    vec2 p = vPosition.xy / ${BEAM_RADIUS.toFixed(3)};
    float r = length(p);
    float a = atan(p.y, p.x);
    float swirl = sin(a * 3.0 + r * 7.0 - uTime * 1.6) * 0.5 + 0.5;
    float core = smoothstep(1.0, 0.0, r);
    vec3 color = mix(uColorA, uColorB, swirl) * (0.5 + core) + vec3(1.0) * pow(core, 6.0) * 0.6;
    float alpha = smoothstep(1.0, 0.75, r) * 0.85;
    gl_FragColor = vec4(color, alpha);
  }
`;

// A column of light that fades upward, with bands drifting up through it.
const beamShader = `
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;
  void main() {
    float h = vUv.y;
    float bands = sin(h * 18.0 - uTime * 2.4) * 0.5 + 0.5;
    float fade = (1.0 - h) * (1.0 - h) * smoothstep(0.0, 0.04, h);
    vec3 color = mix(uColorB, uColorA, h) * (0.7 + bands * 0.5);
    gl_FragColor = vec4(color, fade * (0.09 + bands * 0.06));
  }
`;

const useUniforms = () => React.useMemo(() => ({
  uTime: {value: 0},
  uColorA: {value: new THREE.Color(COLORS[0])},
  uColorB: {value: new THREE.Color(COLORS[1])},
}), []);

// Marks the platform as the way to the summer festival: the floating piece
// above it is the gate.
const FestivalGate = () => {
  const swirl = useUniforms();
  const beam = useUniforms();
  const [near, setNear] = React.useState(false);

  useFrame(({clock}) => {
    swirl.uTime.value = clock.elapsedTime;
    beam.uTime.value = clock.elapsedTime;
    const distance = Math.hypot(runtime.player.position.x - FESTIVAL_GATE.position[0], runtime.player.position.z - FESTIVAL_GATE.position[1]);
    if ((distance < LABEL_DISTANCE) !== near) setNear(distance < LABEL_DISTANCE);
  });

  return (
    <group position={[FESTIVAL_GATE.position[0], 0, FESTIVAL_GATE.position[1]]}>
      <mesh position={[0, PLATFORM.height + 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <circleGeometry args={[BEAM_RADIUS, 64]} />
        <shaderMaterial uniforms={swirl} vertexShader={vertexShader} fragmentShader={swirlShader} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, PLATFORM.height + BEAM_HEIGHT / 2, 0]} renderOrder={3}>
        <cylinderGeometry args={[BEAM_RADIUS * 0.85, BEAM_RADIUS, BEAM_HEIGHT, 48, 1, true]} />
        <shaderMaterial
          uniforms={beam}
          vertexShader={vertexShader}
          fragmentShader={beamShader}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      {near && (
        <Html position={[0, LABEL_HEIGHT, 0]} center zIndexRange={[20, 0]} style={{pointerEvents: "none"}}>
          <div className="gallery-portal-label gallery-portal-label--festival">→ 夏日祭典</div>
        </Html>
      )}
    </group>
  );
};

export default FestivalGate;
