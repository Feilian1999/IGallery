import * as React from "react";
import {useTranslation} from "react-i18next";
import {useGalleryStore} from "../store";
import {startIntro, skipIntro} from "../actions";

// The entrance: a dark gate with the gallery name, then (after "enter") the
// curtain lifts while the camera glides in through the door.
const IntroScreen = () => {
  const phase = useGalleryStore((state) => state.phase);
  const status = useGalleryStore((state) => state.exhibitionStatus);
  const {t} = useTranslation("gallery");

  if (phase === "explore") return null;

  if (phase === "gate") {
    return (
      <div className="intro">
        <div className="eyebrow" style={{color: "rgba(244,239,231,0.5)", marginBottom: 18}}>An Online Exhibition</div>
        <div className="intro__title">IGallery</div>
        <div className="intro__subtitle">{t("intro.subtitle")}</div>
        {/* wait for the real exhibition, so nobody walks into a stand-in layout */}
        <button className="intro__enter" onClick={startIntro} disabled={status === "loading"} autoFocus>
          {status === "loading" ? t("intro.loading") : t("intro.enter")}
        </button>
        <div className="intro__hints">
          {status === "offline" ? t("intro.offline") : t("intro.hints")}
        </div>
      </div>
    );
  }

  return (
    <div className="intro intro--playing">
      <div className="intro__curtain" />
      <div className="intro__title">IGallery</div>
      <div className="intro__subtitle">{t("intro.hallOfLight")}</div>
      <button className="intro__skip" onClick={skipIntro}>{t("intro.skip")}</button>
    </div>
  );
};

export const TransitionOverlay = () => {
  const transition = useGalleryStore((state) => state.transition);
  const {t} = useTranslation("gallery");
  if (!transition) return null;
  // a room is stored by id, so its name follows the interface language
  const label = transition.label?.room ? t(`common:rooms.${transition.label.room}`) : transition.label;
  return (
    <div className={`transition transition--${transition.kind}`}>
      {label && <div className="transition__label">{label}</div>}
    </div>
  );
};

export default IntroScreen;
