/* eslint-disable react/no-unknown-property */
import * as React from "react";
import THEMES from "../themes";
import {useGalleryStore} from "../store";
import Lighting from "./Lighting";
import MainHall from "./MainHall";
import Mascot from "./Mascot";
import Footprints from "./Footprints";
import PlayerController from "./PlayerController";
import Effects from "./Effects";
import FrameDriver from "./FrameDriver";

// The other rooms are only downloaded when the visitor first goes there.
const Annex = React.lazy(() => import("./Annex"));
const Festival = React.lazy(() => import("./Festival"));
const Parkour = React.lazy(() => import("./Parkour"));

const ANNEX_FOG = ["#07070c", 18, 40];
const PARKOUR_FOG = ["#06070d", 30, 110];
const FESTIVAL_FOG = ["#4a3550", 30, 90];

const GalleryScene = () => {
  const themeId = useGalleryStore((state) => state.theme);
  const roomId = useGalleryStore((state) => state.room);
  const theme = THEMES[themeId];
  const fog = {annex: ANNEX_FOG, festival: FESTIVAL_FOG, parkour: PARKOUR_FOG}[roomId] || theme.fog;
  const Room = {main: MainHall, festival: Festival, parkour: Parkour}[roomId] || Annex;

  return (
    <>
      <color attach="background" args={[roomId === "main" ? theme.background : fog[0]]} />
      <fog attach="fog" args={fog} />
      <Lighting />
      <React.Suspense fallback={null}>
        <Room />
      </React.Suspense>
      <Mascot />
      <Footprints />
      <PlayerController />
      <Effects />
      <FrameDriver />
    </>
  );
};

export default GalleryScene;
