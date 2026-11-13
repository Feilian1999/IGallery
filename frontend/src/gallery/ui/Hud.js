/* eslint-disable react/prop-types */
import * as React from "react";
import {useTranslation} from "react-i18next";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import CheckroomOutlinedIcon from "@mui/icons-material/CheckroomOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import MusicNoteOutlinedIcon from "@mui/icons-material/MusicNoteOutlined";
import MusicOffOutlinedIcon from "@mui/icons-material/MusicOffOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {ROOM_INFO} from "../layout";
import {useGalleryStore} from "../store";
import Panels from "./Panels";
import {MiniMap} from "./GalleryMap";

const ToolButton = ({tip, active, onClick, children}) => (
  <button className={`icon-button${active ? " icon-button--active" : ""}`} data-tip={tip} onClick={onClick} aria-label={tip}>
    {children}
  </button>
);

const Hud = () => {
  const phase = useGalleryStore((state) => state.phase);
  const mode = useGalleryStore((state) => state.mode);
  const roomId = useGalleryStore((state) => state.room);
  const visited = useGalleryStore((state) => state.visited);
  const panel = useGalleryStore((state) => state.panel);
  const mapOpen = useGalleryStore((state) => state.mapOpen);
  const musicOn = useGalleryStore((state) => state.musicOn);
  const cameraMode = useGalleryStore((state) => state.cameraMode);
  const prompt = useGalleryStore((state) => state.prompt);
  const detailId = useGalleryStore((state) => state.detailId);
  const pointerLocked = useGalleryStore((state) => state.pointerLocked);
  const set = useGalleryStore((state) => state.set);
  const togglePanel = useGalleryStore((state) => state.togglePanel);
  const {t} = useTranslation("gallery");

  const artworks = useGalleryStore((state) => state.exhibition.artworks);
  const room = ROOM_INFO[roomId];
  const total = artworks.length;
  const seen = artworks.filter((artwork) => visited.includes(artwork.id)).length;
  const hidden = phase !== "explore" || mode !== "explore" || detailId;

  return (
    <div className={`hud${hidden ? " hud--hidden" : ""}`}>
      <div className="brand glass">
        <div className="eyebrow">{room.subtitle}</div>
        <div className="brand__name">IGallery</div>
        <div className="brand__room">{t(`common:rooms.${roomId}`)}</div>
        <div className="brand__progress">
          <span>{t("hud.visited", {seen, total})}</span>
          <span className="brand__bar"><span style={{width: `${(seen / total) * 100}%`}} /></span>
        </div>
      </div>

      <div className="toolbar glass">
        <ToolButton tip={t("hud.map")} active={mapOpen} onClick={() => set({mapOpen: !mapOpen, panel: null})}><MapOutlinedIcon /></ToolButton>
        <ToolButton tip={cameraMode === "first" ? t("hud.toThirdPerson") : t("hud.toFirstPerson")} active={cameraMode === "first"}
          onClick={() => set({cameraMode: cameraMode === "first" ? "third" : "first"})}>
          {cameraMode === "first" ? <VisibilityOutlinedIcon /> : <PersonOutlineIcon />}
        </ToolButton>
        <ToolButton tip={t("hud.photo")} onClick={() => set({mode: "photo", panel: null})}><PhotoCameraOutlinedIcon /></ToolButton>
        <span className="toolbar__divider" />
        <ToolButton tip={t("hud.outfit")} active={panel === "outfit"} onClick={() => togglePanel("outfit")}><CheckroomOutlinedIcon /></ToolButton>
        <ToolButton tip={t("hud.theme")} active={panel === "theme"} onClick={() => togglePanel("theme")}><PaletteOutlinedIcon /></ToolButton>
        <ToolButton tip={musicOn ? t("hud.musicOff") : t("hud.musicOn")} onClick={() => set({musicOn: !musicOn})}>
          {musicOn ? <MusicNoteOutlinedIcon /> : <MusicOffOutlinedIcon />}
        </ToolButton>
        <ToolButton tip={t("hud.settings")} active={panel === "settings"} onClick={() => togglePanel("settings")}><TuneOutlinedIcon /></ToolButton>
        <ToolButton tip={t("hud.help")} active={panel === "help"} onClick={() => togglePanel("help")}><HelpOutlineIcon /></ToolButton>
        <span className="toolbar__divider" />
        <ToolButton tip={t("hud.leave")} onClick={() => {
          window.location.hash = "";
        }}><LogoutOutlinedIcon /></ToolButton>
      </div>

      <Panels />
      <MiniMap />

      {pointerLocked && cameraMode === "first" && <div className="crosshair" />}

      <div className="dock">
        {prompt && (
          <div className="prompt glass" key={`${prompt.key}${prompt.label}`}>
            <span className="kbd">{prompt.key}</span>
            {t(prompt.label)}
          </div>
        )}
        <div className="look-hint">{pointerLocked ? t("hud.releaseHint") : t("hud.lookHint")}</div>
      </div>
    </div>
  );
};

export default Hud;
