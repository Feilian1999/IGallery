/* eslint-disable react/no-unknown-property, react/prop-types */
import * as React from "react";
import * as THREE from "three";
import {useTranslation} from "react-i18next";
import {PLATFORMS, THICKNESS, PORTAL_HOME, PORTAL_ANNEX, BOUNDS} from "../layout/parkour";
import {getGalleryState} from "../store";
import Portal from "./Portal";

// what each kind of platform glows with along its edges
const EDGE = {deck: "#ffd27f", step: "#7fd8ff"};
const SLAB_COLOR = "#23222c";

const boxEdges = (width, height, depth) => new THREE.EdgesGeometry(new THREE.BoxGeometry(width, height, depth));

// One platform: a dark slab with a bright rim, so its edges read against the void.
const Slab = ({center, size, top, kind}) => {
  const edges = React.useMemo(() => boxEdges(size[0], THICKNESS, size[1]), [size]);
  return (
    <group position={[center[0], top - THICKNESS / 2, center[1]]}>
      <mesh receiveShadow>
        <boxGeometry args={[size[0], THICKNESS, size[1]]} />
        <meshStandardMaterial color={SLAB_COLOR} roughness={0.55} metalness={0.2} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={EDGE[kind]} toneMapped={false} />
      </lineSegments>
      {/* the top is lit from within, so it shows even where no light reaches */}
      <mesh position={[0, THICKNESS / 2 + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size[0] - 0.16, size[1] - 0.16]} />
        <meshBasicMaterial color={EDGE[kind]} transparent opacity={kind === "deck" ? 0.1 : 0.16} toneMapped={false} />
      </mesh>
    </group>
  );
};

const Stars = () => {
  const geometry = React.useMemo(() => {
    const positions = [];
    const centerX = (BOUNDS.minX + BOUNDS.maxX) / 2;
    const centerZ = (BOUNDS.minZ + BOUNDS.maxZ) / 2;
    for (let i = 0; i < 900; i++) {
      // all around, above and below: the course hangs in open space
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 55 + Math.random() * 25;
      positions.push(centerX + Math.sin(phi) * Math.cos(theta) * r, Math.cos(phi) * r, centerZ + Math.sin(phi) * Math.sin(theta) * r);
    }
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return buffer;
  }, []);
  return (
    <points geometry={geometry}>
      <pointsMaterial color="#dfe8ff" size={0.22} sizeAttenuation fog={false} toneMapped={false} />
    </points>
  );
};

// Upstairs: platforms to run and jump across. The floating room opens from the last one.
const Parkour = () => {
  const {t} = useTranslation("gallery");

  React.useEffect(() => {
    getGalleryState().set({focusedId: null});
  }, []);

  return (
    <group>
      <hemisphereLight args={["#8fa4ff", "#1a1420", 0.9]} />
      {PLATFORMS.filter((platform) => platform.kind === "deck").map((platform) => (
        <pointLight key={platform.center.join()} position={[platform.center[0], platform.top + 3.2, platform.center[1]]} color="#ffd9a0" intensity={14} distance={11} decay={1.6} />
      ))}
      {PLATFORMS.map((platform) => <Slab key={platform.center.join()} {...platform} />)}
      <Stars />
      <Portal placement={PORTAL_HOME} colors={["#7a3b2a", "#ffd27f"]} label={t("portal.backToMain")} />
      <Portal placement={PORTAL_ANNEX} colors={["#3b2a7a", "#7fd8ff"]} label={t("portal.toAnnex")} />
    </group>
  );
};

export default Parkour;
