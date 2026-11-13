import * as React from "react";
import {Canvas} from "@react-three/fiber";
import {KeyboardControls} from "@react-three/drei";
import GalleryScene from "../gallery/scene/GalleryScene";
import Hud from "../gallery/ui/Hud";
import GalleryMap from "../gallery/ui/GalleryMap";
import ArtworkDetail from "../gallery/ui/ArtworkDetail";
import PhotoMode, {PHOTO_FILTERS} from "../gallery/ui/PhotoMode";
import GraffitiToolbar from "../gallery/ui/GraffitiToolbar";
import IntroScreen, {TransitionOverlay} from "../gallery/ui/IntroScreen";
import THEMES from "../gallery/themes";
import {useGalleryStore, getGalleryState} from "../gallery/store";
import {runtime, markActive} from "../gallery/runtime";
import {requestInteract, openDetail, skipIntro, startIntro} from "../gallery/actions";
import audio from "../gallery/audio/AudioEngine";
import "../gallery/ui/gallery.css";

const KEY_MAP = [
  {name: "forward", keys: ["ArrowUp", "KeyW"]},
  {name: "backward", keys: ["ArrowDown", "KeyS"]},
  {name: "left", keys: ["KeyA"]},
  {name: "right", keys: ["KeyD"]},
  {name: "turnLeft", keys: ["ArrowLeft", "KeyQ"]},
  {name: "turnRight", keys: ["ArrowRight", "KeyE"]},
  {name: "run", keys: ["ShiftLeft", "ShiftRight"]},
  {name: "crouch", keys: ["KeyX"]},
];

const DPR = {high: [1, 2], balanced: [1, 1.5], low: 1};
// Radians of view turn per pixel: for a captured mouse, and for a drag (touch, or
// a mouse that hasn't been captured).
const LOCKED_LOOK = 0.0022;
const DRAG_LOOK = {yaw: 0.005, pitch: 0.004};
// a captured mouse sometimes reports one huge jump (e.g. as the capture starts); drop those
const LOOK_SPIKE = 400;

// The mouse is only worth capturing while the visitor is walking around with nothing open.
const wantsMouseLook = (state) => state.phase === "explore" && state.mode === "explore" &&
  !state.detailId && !state.mapOpen && !state.panel;

// Keyboard shortcuts that aren't movement (movement is read by KeyboardControls).
const handleShortcut = (event) => {
  const state = getGalleryState();
  if (state.phase === "gate") {
    if (event.code === "Enter") startIntro();
    return;
  }
  if (state.phase === "intro") {
    if (["Escape", "Enter", "Space"].includes(event.code)) skipIntro();
    return;
  }
  if (state.detailId) {
    if (event.code === "Escape") state.set({detailId: null});
    return;
  }
  if (event.code === "Escape") {
    if (state.mapOpen || state.panel) state.set({mapOpen: false, panel: null});
    else if (state.mode !== "explore") state.set({mode: "explore"});
    return;
  }
  if (state.mode === "graffiti") {
    if (event.code === "KeyF") state.set({mode: "explore"});
    return;
  }
  if (event.code === "Space" && state.mode === "explore") {
    event.preventDefault();
    runtime.jumpRequested = true;
    return;
  }
  switch (event.code) {
    case "KeyF":
      requestInteract();
      break;
    case "Enter":
      if (state.focusedId) openDetail(state.focusedId);
      break;
    case "KeyM":
      state.set({mapOpen: !state.mapOpen, panel: null});
      break;
    case "KeyV":
      state.set({cameraMode: state.cameraMode === "first" ? "third" : "first"});
      break;
    case "KeyP":
      state.set({mode: state.mode === "photo" ? "explore" : "photo", panel: null, mapOpen: false});
      break;
    case "KeyC":
      state.togglePanel("outfit");
      break;
    case "KeyT":
      state.togglePanel("theme");
      break;
    case "Slash":
      state.togglePanel("help");
      break;
    default:
  }
};

const themeVariables = (theme) => ({
  "--g-accent": theme.accent,
  "--g-on-accent": theme.dark ? "#16130f" : "#ffffff",
  "--g-bg": theme.background,
  "--g-bg-deep": theme.dark ? "#0d0c0b" : "#efede9",
  "--g-stage": theme.dark ? "#171513" : "#e3e0da",
});

const GalleryPage = () => {
  const themeId = useGalleryStore((state) => state.theme);
  const mode = useGalleryStore((state) => state.mode);
  const photoFilter = useGalleryStore((state) => state.photo.filter);
  const quality = useGalleryStore((state) => state.resolvedQuality());
  const theme = THEMES[themeId];
  const drag = React.useRef(null);
  const surface = React.useRef(null);
  const dragged = React.useRef(false);

  React.useEffect(() => {
    getGalleryState().loadExhibition();
  }, []);

  // Music belongs to the gallery only: stop it on the way out. Coming back after the
  // entrance has already been passed starts it again (the click that got us here counts
  // as the user gesture browsers require for audio).
  React.useEffect(() => {
    if (getGalleryState().phase !== "gate") audio.start();
    return () => audio.stop();
  }, []);

  // development-only handle for poking at the scene from the console or browser tests
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "development") return undefined;
    window.__igallery = {runtime, getGalleryState, audio};
    return () => {
      delete window.__igallery;
    };
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event) => {
      runtime.keysDown.add(event.code);
      markActive();
      if (!event.repeat) handleShortcut(event);
    };
    const onKeyUp = (event) => {
      runtime.keysDown.delete(event.code);
      markActive();
    };
    const onBlur = () => runtime.keysDown.clear();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // keep the audio in step with the settings and the room
  React.useEffect(() => {
    const sync = (state) => {
      audio.setRoom(state.room);
      audio.setMusicOn(state.musicOn);
      audio.setVolume(state.volume);
      audio.setRain(state.weather === "rain" && state.room === "main");
    };
    sync(getGalleryState());
    return useGalleryStore.subscribe(sync);
  }, []);

  // Mouse look: a click on the scene captures the mouse, which then turns the view
  // directly until Esc (or anything that needs the cursor) lets it go.
  React.useEffect(() => {
    const isLocked = () => Boolean(surface.current) && document.pointerLockElement === surface.current;
    const onLockChange = () => {
      getGalleryState().set({pointerLocked: isLocked(), hoveredId: null});
      document.body.style.cursor = "";
      markActive();
    };
    const onMouseMove = (event) => {
      if (!isLocked()) return;
      const {movementX = 0, movementY = 0} = event;
      if (Math.abs(movementX) > LOOK_SPIKE || Math.abs(movementY) > LOOK_SPIKE) return;
      runtime.look.dx += movementX * LOCKED_LOOK;
      runtime.look.dy += movementY * LOCKED_LOOK;
      markActive();
    };
    const unsubscribe = useGalleryStore.subscribe((state) => {
      if (isLocked() && !wantsMouseLook(state)) document.exitPointerLock();
    });
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("mousemove", onMouseMove);
    return () => {
      unsubscribe();
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("mousemove", onMouseMove);
      if (isLocked()) document.exitPointerLock();
      getGalleryState().set({pointerLocked: false});
    };
  }, []);

  const handleClick = (event) => {
    const state = getGalleryState();
    if (state.pointerLocked) {
      // with the mouse captured, a click acts on whatever the visitor is facing
      requestInteract();
      return;
    }
    // a painting under the cursor has already opened by now, which rules the capture out
    const element = surface.current;
    const pointerType = event.nativeEvent.pointerType;
    if (dragged.current || !wantsMouseLook({...state, panel: null}) || !element.requestPointerLock) return;
    if (pointerType && pointerType !== "mouse") return;
    state.set({panel: null});
    try {
      // refused for a moment right after Esc; dragging still looks around meanwhile
      const request = element.requestPointerLock();
      if (request && request.catch) request.catch(() => {});
    } catch (error) {
      // same
    }
  };

  // Dragging looks around too: on touch screens, and with a mouse that isn't captured.
  // Listening on window (instead of capturing the pointer) keeps the canvas's own
  // click events working for paintings and the graffiti wall.
  const handlePointerDown = (event) => {
    const state = getGalleryState();
    if (event.button !== 0 || state.mode === "graffiti" || state.pointerLocked) return;
    dragged.current = false;
    drag.current = {x: event.clientX, y: event.clientY, moved: false};
    const onMove = (moveEvent) => {
      const start = drag.current;
      if (!start) return;
      const dx = moveEvent.clientX - start.x;
      const dy = moveEvent.clientY - start.y;
      if (!start.moved && Math.hypot(dx, dy) < 3) return;
      start.moved = true;
      dragged.current = true;
      runtime.dragging = true;
      runtime.look.dx += dx * DRAG_LOOK.yaw;
      runtime.look.dy += dy * DRAG_LOOK.pitch;
      start.x = moveEvent.clientX;
      start.y = moveEvent.clientY;
      markActive();
    };
    const onUp = () => {
      drag.current = null;
      runtime.dragging = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleWheel = (event) => {
    if (getGalleryState().mode !== "photo") return;
    runtime.camera.photoDistance = Math.max(1.6, Math.min(9, runtime.camera.photoDistance * Math.exp(event.deltaY * 0.001)));
    markActive();
  };

  return (
    <div className="gallery" data-ui={theme.dark ? "dark" : "light"} style={themeVariables(theme)}>
      <KeyboardControls map={KEY_MAP}>
        <div
          className={`gallery__canvas${mode === "graffiti" ? " gallery__canvas--draw" : ""}`}
          style={{filter: mode === "photo" ? PHOTO_FILTERS[photoFilter].css : "none"}}
          ref={surface}
          onPointerDown={handlePointerDown}
          onClick={handleClick}
          onWheel={handleWheel}
        >
          <Canvas
            frameloop="demand"
            shadows="percentage"
            dpr={DPR[quality]}
            gl={{preserveDrawingBuffer: true, antialias: quality === "low", powerPreference: "high-performance"}}
            camera={{fov: 50, near: 0.1, far: 220, position: [3, 2.3, 21]}}
            onCreated={({gl}) => {
              runtime.gl = gl;
            }}
          >
            <GalleryScene />
          </Canvas>
        </div>
      </KeyboardControls>
      <Hud />
      <PhotoMode />
      <GraffitiToolbar />
      <GalleryMap />
      <ArtworkDetail />
      <IntroScreen />
      <TransitionOverlay />
    </div>
  );
};

export default GalleryPage;
