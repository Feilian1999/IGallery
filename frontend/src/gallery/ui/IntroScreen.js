import * as React from "react";
import {useGalleryStore} from "../store";
import {startIntro, skipIntro} from "../actions";

// The entrance: a dark gate with the gallery name, then (after "enter") the
// curtain lifts while the camera glides in through the door.
const IntroScreen = () => {
  const phase = useGalleryStore((state) => state.phase);
  const status = useGalleryStore((state) => state.exhibitionStatus);

  if (phase === "explore") return null;

  if (phase === "gate") {
    return (
      <div className="intro">
        <div className="eyebrow" style={{color: "rgba(244,239,231,0.5)", marginBottom: 18}}>An Online Exhibition</div>
        <div className="intro__title">IGallery</div>
        <div className="intro__subtitle">一座可以走進去的線上美術館</div>
        {/* wait for the real exhibition, so nobody walks into a stand-in layout */}
        <button className="intro__enter" onClick={startIntro} disabled={status === "loading"} autoFocus>
          {status === "loading" ? "展覽載入中…" : "進入展覽"}
        </button>
        <div className="intro__hints">
          {status === "offline" ? "暫時連不上伺服器，先展示範例作品" : "建議戴上耳機 · WASD 走路 · 拖曳滑鼠轉動視角"}
        </div>
      </div>
    );
  }

  return (
    <div className="intro intro--playing">
      <div className="intro__curtain" />
      <div className="intro__title">IGallery</div>
      <div className="intro__subtitle">光之展廳</div>
      <button className="intro__skip" onClick={skipIntro}>跳過 ›</button>
    </div>
  );
};

export const TransitionOverlay = () => {
  const transition = useGalleryStore((state) => state.transition);
  if (!transition) return null;
  return (
    <div className={`transition transition--${transition.kind}`}>
      {transition.label && <div className="transition__label">{transition.label}</div>}
    </div>
  );
};

export default IntroScreen;
