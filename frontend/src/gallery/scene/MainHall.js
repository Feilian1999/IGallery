/* eslint-disable react/no-unknown-property, react/prop-types */
import * as React from "react";
import * as THREE from "three";
import {useFrame} from "@react-three/fiber";
import {useTranslation} from "react-i18next";
import THEMES, {SEASONS} from "../themes";
import {PLATFORM, PORTAL} from "../layout/mainHall";
import {useGalleryStore} from "../store";
import Painting from "./Painting";
import Portal from "./Portal";
import FestivalGate from "./FestivalGate";
import GraffitiWall from "./GraffitiWall";
import Ball from "./Ball";
import Outdoors from "./Outdoors";
import {
  Floor, Ceiling, PerimeterWalls, WallBays, SouthWall, WindowLight, Partitions, Benches, Platform, Stairs, TrackLights, useSurfaces,
} from "./Architecture";
import HallEnvironment from "./HallEnvironment";

const FLOAT_HEIGHT = 2.35;
const FEATURE_ANCHOR = [PLATFORM.center[0], FLOAT_HEIGHT, PLATFORM.center[1]];
const FEATURE_PLACEMENT = {position: [0, 0, 0], rotationY: 0};

// The featured piece hovers and slowly turns above the central platform; it is
// also the gate to the summer festival (see FestivalGate).
// It stops animating while it is off screen.
const FloatingFeature = ({artwork}) => {
  const group = React.useRef();
  const frustum = React.useMemo(() => new THREE.Frustum(), []);
  const matrix = React.useMemo(() => new THREE.Matrix4(), []);
  const bounds = React.useMemo(() => new THREE.Sphere(new THREE.Vector3(...FEATURE_ANCHOR), 2), []);
  useFrame(({camera, clock}) => {
    matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(matrix);
    if (!frustum.intersectsSphere(bounds)) return;
    const time = clock.elapsedTime;
    group.current.position.y = FLOAT_HEIGHT + Math.sin(time * 0.8) * 0.12;
    group.current.rotation.y = time * 0.25;
  });
  return (
    <group ref={group} position={FEATURE_ANCHOR}>
      <Painting artwork={artwork} placement={FEATURE_PLACEMENT} anchor={FEATURE_ANCHOR} floating />
    </group>
  );
};

// Floor, walls and furniture. Rendered with the canvas textures until the
// scanned PBR surfaces have loaded.
const Shell = ({theme, themeId, reflective, surfaces = null}) => (
  <>
    <Floor theme={theme} reflective={reflective} surfaces={surfaces} />
    <PerimeterWalls theme={theme} surfaces={surfaces} />
    <WallBays theme={theme} surfaces={surfaces} />
    <SouthWall theme={theme} surfaces={surfaces} />
    <Partitions theme={theme} surfaces={surfaces} />
    <Benches themeId={themeId} surfaces={surfaces} />
  </>
);

const TexturedShell = (props) => <Shell {...props} surfaces={useSurfaces()} />;

const MainHall = () => {
  const themeId = useGalleryStore((state) => state.theme);
  const seasonId = useGalleryStore((state) => state.season);
  const weather = useGalleryStore((state) => state.weather);
  const quality = useGalleryStore((state) => state.resolvedQuality());
  const theme = THEMES[themeId];
  const room = useGalleryStore((state) => state.exhibition.rooms.main);
  const feature = useGalleryStore((state) => state.exhibition.feature);
  const reflective = theme.reflective && quality === "high";
  const {t} = useTranslation("gallery");

  return (
    <group>
      <HallEnvironment theme={theme} season={SEASONS[seasonId]} />
      <React.Suspense fallback={<Shell theme={theme} themeId={themeId} reflective={reflective} />}>
        <TexturedShell theme={theme} themeId={themeId} reflective={reflective} />
      </React.Suspense>
      <Ceiling theme={theme} />
      <TrackLights theme={theme} />
      <WindowLight color={SEASONS[seasonId].light} strength={weather === "rain" ? 0.12 : 0.28} />
      <Platform theme={theme} />
      <Stairs theme={theme} />
      <FestivalGate />
      {feature && (
        <React.Suspense fallback={null}>
          <FloatingFeature artwork={feature} />
        </React.Suspense>
      )}
      <Portal placement={PORTAL} colors={["#3b2a7a", "#7fd8ff"]} label={t("portal.toParkour")} />
      <GraffitiWall />
      <Ball />
      <Outdoors />
      <React.Suspense fallback={null}>
        {room.artworks.map(({artwork, placement}) => (
          <Painting key={artwork.id} artwork={artwork} placement={placement} />
        ))}
      </React.Suspense>
    </group>
  );
};

export default MainHall;
