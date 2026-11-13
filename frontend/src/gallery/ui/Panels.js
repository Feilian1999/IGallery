import * as React from "react";
import {useTranslation} from "react-i18next";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import THEMES, {SEASONS, WEATHERS} from "../themes";
import {BODY_COLORS, TRIM_COLORS, ACCESSORIES, EMOTES} from "../outfits";
import {useGalleryStore} from "../store";
import {playEmote} from "../actions";

// translated with gallery:qualities.<id>
const QUALITIES = ["auto", "high", "balanced", "low"];

const OutfitPanel = () => {
  const outfit = useGalleryStore((state) => state.outfit);
  const setOutfit = useGalleryStore((state) => state.setOutfit);
  const {t} = useTranslation("gallery");
  return (
    <>
      <div className="eyebrow">Wardrobe</div>
      <div className="panel__title">{t("outfit.title")}</div>
      <div className="panel__section">
        <div className="panel__label">{t("outfit.body")}</div>
        <div className="swatches">
          {Object.entries(BODY_COLORS).map(([id, option]) => (
            <button key={id} className={`swatch${outfit.body === id ? " swatch--active" : ""}`} onClick={() => setOutfit({body: id})}>
              <span className="swatch__dot" style={{background: option.color}} />
              {t(`outfits.body.${id}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="panel__section">
        <div className="panel__label">{t("outfit.trim")}</div>
        <div className="swatches">
          {Object.entries(TRIM_COLORS).map(([id, option]) => (
            <button key={id} className={`swatch${outfit.trim === id ? " swatch--active" : ""}`} onClick={() => setOutfit({trim: id})}>
              <span className="swatch__dot" style={{background: option.color}} />
              {t(`outfits.trim.${id}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="panel__section">
        <div className="panel__label">{t("outfit.accessory")}</div>
        <div className="chips">
          {Object.keys(ACCESSORIES).map((id) => (
            <button key={id} className={`chip${outfit.accessory === id ? " chip--active" : ""}`} onClick={() => setOutfit({accessory: id})}>
              {t(`outfits.accessory.${id}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="panel__section">
        <div className="panel__label">{t("outfit.tryEmote")}</div>
        <div className="chips">
          {EMOTES.map((emote) => (
            <button key={emote.id} className="chip" onClick={() => playEmote(emote.id)}>{t(`emotes.${emote.id}`)}</button>
          ))}
        </div>
      </div>
    </>
  );
};

const ThemePanel = () => {
  const theme = useGalleryStore((state) => state.theme);
  const season = useGalleryStore((state) => state.season);
  const weather = useGalleryStore((state) => state.weather);
  const set = useGalleryStore((state) => state.set);
  const {t} = useTranslation("gallery");
  return (
    <>
      <div className="eyebrow">Atmosphere</div>
      <div className="panel__title">{t("theme.title")}</div>
      {Object.entries(THEMES).map(([id, option]) => (
        <button key={id} className={`theme-card${theme === id ? " theme-card--active" : ""}`} onClick={() => set({theme: id})}>
          <span className="theme-card__preview" style={{background: `linear-gradient(135deg, ${option.swatch[0]} 55%, ${option.swatch[1]} 55%)`}} />
          <span>
            <div className="theme-card__name">{t(`themes.${id}.name`)}</div>
            <div className="theme-card__caption">{t(`themes.${id}.caption`)}</div>
          </span>
        </button>
      ))}
      <div className="panel__section">
        <div className="panel__label">{t("theme.season")}</div>
        <div className="chips">
          {Object.keys(SEASONS).map((id) => (
            <button key={id} className={`chip${season === id ? " chip--active" : ""}`} onClick={() => set({season: id})}>{t(`seasons.${id}`)}</button>
          ))}
        </div>
      </div>
      <div className="panel__section">
        <div className="panel__label">{t("theme.weather")}</div>
        <div className="chips">
          {Object.keys(WEATHERS).map((id) => (
            <button key={id} className={`chip${weather === id ? " chip--active" : ""}`} onClick={() => set({weather: id})}>{t(`weathers.${id}`)}</button>
          ))}
        </div>
      </div>
    </>
  );
};

const SettingsPanel = () => {
  const quality = useGalleryStore((state) => state.quality);
  const musicOn = useGalleryStore((state) => state.musicOn);
  const volume = useGalleryStore((state) => state.volume);
  const cameraMode = useGalleryStore((state) => state.cameraMode);
  const lookSensitivity = useGalleryStore((state) => state.lookSensitivity);
  const invertY = useGalleryStore((state) => state.invertY);
  const set = useGalleryStore((state) => state.set);
  const {t} = useTranslation("gallery");
  return (
    <>
      <div className="eyebrow">Settings</div>
      <div className="panel__title">{t("settings.title")}</div>
      <div className="panel__section">
        <div className="panel__label">{t("settings.camera")}</div>
        <div className="chips">
          <button className={`chip${cameraMode === "third" ? " chip--active" : ""}`} onClick={() => set({cameraMode: "third"})}>{t("settings.thirdPerson")}</button>
          <button className={`chip${cameraMode === "first" ? " chip--active" : ""}`} onClick={() => set({cameraMode: "first"})}>{t("settings.firstPerson")}</button>
        </div>
      </div>
      <div className="panel__section">
        <div className="panel__label">{t("settings.sensitivity", {value: lookSensitivity.toFixed(1)})}</div>
        <input className="range" type="range" min="0.3" max="2.5" step="0.1" value={lookSensitivity}
          onChange={(event) => set({lookSensitivity: Number(event.target.value)})} />
        <div className="chips" style={{marginTop: 12}}>
          <button className={`chip${invertY ? " chip--active" : ""}`} onClick={() => set({invertY: !invertY})}>{t("settings.invertY")}</button>
        </div>
      </div>
      <div className="panel__section">
        <div className="panel__label">{t("settings.quality")}</div>
        <div className="chips">
          {QUALITIES.map((id) => (
            <button key={id} className={`chip${quality === id ? " chip--active" : ""}`} onClick={() => set({quality: id})}>{t(`qualities.${id}`)}</button>
          ))}
        </div>
      </div>
      <div className="panel__section">
        <div className="panel__label">{t("settings.music")}</div>
        <div className="chips" style={{marginBottom: 12}}>
          <button className={`chip${musicOn ? " chip--active" : ""}`} onClick={() => set({musicOn: true})}>{t("settings.on")}</button>
          <button className={`chip${!musicOn ? " chip--active" : ""}`} onClick={() => set({musicOn: false})}>{t("settings.off")}</button>
        </div>
        <div className="panel__label">{t("settings.volume", {percent: Math.round(volume * 100)})}</div>
        <input className="range" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => set({volume: Number(event.target.value)})} />
      </div>
      <div className="panel__section">
        <div className="panel__label">{t("common:language")}</div>
        <LanguageSwitcher className="select" />
      </div>
    </>
  );
};

// Each row: the keys to show and a gallery:help.keys.<id> description. Key caps
// listed in TRANSLATED_KEYS are words (e.g. "mouse") and are translated too.
const KEYS = [
  [["W", "A", "S", "D"], "move"],
  [["mouse"], "look"],
  [["Q", "E"], "turn"],
  [["Shift"], "run"],
  [["F"], "interact"],
  [["Enter"], "view"],
  [["1", "2", "3", "4"], "emotes"],
  [["Space"], "jump"],
  [["V"], "camera"],
  [["M"], "map"],
  [["P"], "photo"],
  [["C"], "outfit"],
  [["T"], "theme"],
  [["Esc"], "close"],
];
const TRANSLATED_KEYS = ["mouse"];

const HelpPanel = () => {
  const {t} = useTranslation("gallery");
  return (
    <>
      <div className="eyebrow">Controls</div>
      <div className="panel__title">{t("help.title")}</div>
      <div className="keys">
        {KEYS.map(([combo, id]) => (
          <React.Fragment key={id}>
            <span className="keys__combo">
              {combo.map((key) => <span key={key} className="kbd">{TRANSLATED_KEYS.includes(key) ? t(`help.keyNames.${key}`) : key}</span>)}
            </span>
            <span>{t(`help.keys.${id}`)}</span>
          </React.Fragment>
        ))}
      </div>
    </>
  );
};

const PANELS = {outfit: OutfitPanel, theme: ThemePanel, settings: SettingsPanel, help: HelpPanel};

const Panels = () => {
  const panel = useGalleryStore((state) => state.panel);
  const Panel = PANELS[panel];
  if (!Panel) return null;
  return (
    <div className="panel glass" key={panel}>
      <Panel />
    </div>
  );
};

export default Panels;
