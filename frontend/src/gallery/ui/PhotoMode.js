import * as React from "react";
import {useTranslation} from "react-i18next";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import {EMOTES} from "../outfits";
import {runtime} from "../runtime";
import {useGalleryStore} from "../store";
import {playEmote} from "../actions";
import audio from "../audio/AudioEngine";
import {formatDate} from "../../i18n";

// CSS filters, applied live to the canvas and baked into the saved photo.
// Names are translated with gallery:photo.filters.<id>.
export const PHOTO_FILTERS = {
  none: {css: "none"},
  warm: {css: "sepia(0.25) saturate(1.25) hue-rotate(-8deg) brightness(1.05)"},
  cool: {css: "saturate(0.9) hue-rotate(12deg) brightness(1.03) contrast(1.05)"},
  mono: {css: "grayscale(1) contrast(1.15)"},
  vintage: {css: "sepia(0.55) contrast(0.9) brightness(1.08) saturate(0.8)"},
  dream: {css: "saturate(1.35) brightness(1.08) contrast(0.92)"},
};

const POLAROID_SIDE = 0.04;
const POLAROID_BOTTOM = 0.16;

const capture = (filter, frame, roomName) => {
  const source = runtime.gl.domElement;
  const width = source.width;
  const height = source.height;
  const side = frame ? Math.round(width * POLAROID_SIDE) : 0;
  const bottom = frame ? Math.round(width * POLAROID_BOTTOM) : 0;
  const canvas = document.createElement("canvas");
  canvas.width = width + side * 2;
  canvas.height = height + side + bottom;
  const context = canvas.getContext("2d");
  if (frame) {
    context.fillStyle = "#f7f4ee";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.filter = PHOTO_FILTERS[filter].css;
  context.drawImage(source, side, side);
  context.filter = "none";
  if (frame) {
    const date = formatDate(new Date());
    context.fillStyle = "#3a3530";
    context.font = `600 ${Math.round(bottom * 0.28)}px "Noto Serif TC", serif`;
    context.textBaseline = "middle";
    context.fillText(`IGallery · ${roomName}`, side * 1.5, height + side + bottom * 0.42);
    context.font = `${Math.round(bottom * 0.18)}px "Noto Sans TC", sans-serif`;
    context.fillStyle = "#8a8178";
    context.fillText(date, side * 1.5, height + side + bottom * 0.72);
  }
  return canvas.toDataURL("image/png");
};

const PhotoMode = () => {
  const mode = useGalleryStore((state) => state.mode);
  const roomId = useGalleryStore((state) => state.room);
  const photo = useGalleryStore((state) => state.photo);
  const setPhoto = useGalleryStore((state) => state.setPhoto);
  const set = useGalleryStore((state) => state.set);
  const [flash, setFlash] = React.useState(0);
  const [result, setResult] = React.useState(null);
  const {t} = useTranslation("gallery");

  React.useEffect(() => {
    if (mode !== "photo") setResult(null);
  }, [mode]);

  if (mode !== "photo") return null;

  const shoot = () => {
    audio.shutter();
    setResult(capture(photo.filter, photo.frame, t(`common:rooms.${roomId}`)));
    setFlash((n) => n + 1);
  };

  return (
    <>
      <div className="photo-top glass">
        <span className="eyebrow">Photo Mode</span>
        <span>{t("photo.hint")}</span>
        <button className="icon-button" onClick={() => set({mode: "explore"})} aria-label={t("photo.exit")}><CloseIcon /></button>
      </div>
      <div className="photo-bottom glass">
        <div className="filters">
          {Object.entries(PHOTO_FILTERS).map(([id, filter]) => (
            <button key={id} className={`filter${photo.filter === id ? " filter--active" : ""}`} onClick={() => setPhoto({filter: id})}>
              <span className="filter__preview" style={{filter: filter.css}} />
              {t(`photo.filters.${id}`)}
            </button>
          ))}
        </div>
        <div className="chips" style={{flexDirection: "column"}}>
          <button className={`chip${photo.depthOfField ? " chip--active" : ""}`} onClick={() => setPhoto({depthOfField: !photo.depthOfField})}>{t("photo.depthOfField")}</button>
          <button className={`chip${photo.frame ? " chip--active" : ""}`} onClick={() => setPhoto({frame: !photo.frame})}>{t("photo.frame")}</button>
        </div>
        <div className="chips" style={{maxWidth: 170}}>
          {EMOTES.slice(0, 4).map((emote) => (
            <button key={emote.id} className="chip" onClick={() => playEmote(emote.id)}>{t(`emotes.${emote.id}`)}</button>
          ))}
        </div>
        <button className="shutter" onClick={shoot} aria-label={t("photo.shoot")} />
      </div>
      {flash > 0 && <div className="flash" key={flash} />}
      {result && (
        <div className="photo-result glass">
          <img src={result} alt={t("photo.resultAlt")} />
          <div className="photo-result__actions">
            <a className="button button--primary" href={result} download={`igallery-${Date.now()}.png`}><DownloadIcon fontSize="small" />{t("photo.download")}</a>
            <button className="button" onClick={() => setResult(null)}>{t("photo.close")}</button>
          </div>
        </div>
      )}
    </>
  );
};

export default PhotoMode;
