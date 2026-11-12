/* eslint-disable react/no-unknown-property, react/prop-types */
import * as React from "react";
import {Environment, Lightformer} from "@react-three/drei";
import {WALL_HEIGHT, SOUTH_WALL} from "../layout/mainHall";

// An environment map built from simple light shapes laid out like the hall: the
// glowing ceiling, the window, and the colored walls. It is rendered once and
// gives every PBR surface soft bounce light and believable reflections
// (metal fixtures, the polished floor, frame edges).
const HallEnvironment = ({theme, season}) => {
  const {window: win} = SOUTH_WALL;
  const windowCenter = [(win.from + win.to) / 2, (win.bottom + win.top) / 2];
  return (
    <Environment
      // rebuild the map when the look changes; it is only rendered once
      key={`${theme.id}:${season.id}`}
      frames={1}
      resolution={128}
      environmentIntensity={theme.environment}
    >
      {/* ceiling wash */}
      <Lightformer form="rect" intensity={theme.dark ? 0.6 : 1.4} color={theme.ceiling} position={[0, WALL_HEIGHT, 0]} rotation-x={Math.PI / 2} scale={[24, 20, 1]} />
      {/* the ring of light strips under the ceiling */}
      <Lightformer form="ring" intensity={theme.dark ? 3 : 2} color={theme.glow} position={[0, WALL_HEIGHT - 0.1, -1.9]} rotation-x={Math.PI / 2} scale={10} />
      {/* daylight through the south window */}
      <Lightformer form="rect" intensity={3} color={season.light} position={[windowCenter[0], windowCenter[1], SOUTH_WALL.start[1]]} rotation-y={Math.PI} scale={[win.to - win.from, win.top - win.bottom, 1]} />
      {/* walls bounce their own color back into the room */}
      <Lightformer form="rect" intensity={0.5} color={theme.wall} position={[0, 2.5, -12]} scale={[24, 5, 1]} />
      <Lightformer form="rect" intensity={0.5} color={theme.wall} position={[-14, 2.5, 0]} rotation-y={Math.PI / 2} scale={[20, 5, 1]} />
      <Lightformer form="rect" intensity={0.5} color={theme.wall} position={[14, 2.5, 0]} rotation-y={-Math.PI / 2} scale={[20, 5, 1]} />
      {/* the floor */}
      <Lightformer form="rect" intensity={0.3} color={theme.floor} position={[0, 0, 0]} rotation-x={-Math.PI / 2} scale={[28, 24, 1]} />
    </Environment>
  );
};

export default HallEnvironment;
