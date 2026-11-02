import {create} from "zustand";
import {sampleExhibition, emptyExhibition, fetchExhibition, buildExhibition} from "./exhibition";

const STORAGE_KEY = "igallery:preferences";
// Only these keys survive a reload; everything else is session state.
const PERSISTED_KEYS = ["theme", "season", "weather", "outfit", "musicOn", "volume", "quality", "visited", "cameraMode"];

const loadPreferences = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
  } catch (error) {
    return {};
  }
};

const detectQuality = () => {
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (mobile || (navigator.hardwareConcurrency || 4) <= 4) return "balanced";
  return "high";
};

const preferences = loadPreferences();

export const useGalleryStore = create((set, get) => ({
  // gate: waiting for the visitor to press "enter"; intro: entrance sequence; explore: free roaming
  phase: "gate",
  room: "main",
  // explore | photo | graffiti
  mode: "explore",
  cameraMode: "third",
  focusedId: null,
  hoveredId: null,
  detailId: null,
  mapOpen: false,
  // null | "outfit" | "theme" | "settings" | "help"
  panel: null,
  // {key, label} shown at the bottom of the screen when an interaction is available
  prompt: null,
  // null | {kind: "fade" | "portal", label?}
  transition: null,

  theme: "night",
  season: "autumn",
  weather: "clear",
  outfit: {body: "orange", trim: "silver", accessory: "beret"},
  musicOn: true,
  volume: 0.6,
  quality: "auto",
  visited: [],

  graffiti: {color: "#ff5a5f", size: 18, eraser: false},
  graffitiClearToken: 0,

  photo: {filter: "none", depthOfField: true, frame: false},
  // artworks and rooms from the API. "loading" until it answers (the entrance waits for it);
  // "offline" when it couldn't be reached and the bundled samples are shown instead
  exhibition: emptyExhibition(),
  exhibitionStatus: "loading",
  ...preferences,

  resolvedQuality: () => {
    const {quality} = get();
    return quality === "auto" ? detectQuality() : quality;
  },
  set: (partial) => set(partial),
  togglePanel: (panel) => set((state) => ({panel: state.panel === panel ? null : panel})),
  markVisited: (id) => set((state) => (state.visited.includes(id) ? {} : {visited: [...state.visited, id]})),
  setOutfit: (partial) => set((state) => ({outfit: {...state.outfit, ...partial}})),
  setGraffiti: (partial) => set((state) => ({graffiti: {...state.graffiti, ...partial}})),
  setPhoto: (partial) => set((state) => ({photo: {...state.photo, ...partial}})),
  // e.g. after a like, so every view of the artwork shows the new count
  patchArtwork: (id, patch) => set((state) => {
    const {artworks, placements, source} = state.exhibition;
    const updated = artworks.map((artwork) => (artwork.id === id ? {...artwork, ...patch} : artwork));
    return {exhibition: buildExhibition({artworks: updated, placements}, source)};
  }),
  loadExhibition: async () => {
    // one retry covers a cold-starting API
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        set({exhibition: await fetchExhibition(), exhibitionStatus: "ready"});
        return;
      } catch (error) {
        if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 1500));
        else console.warn("[igallery] showing sample artworks, the API is unavailable:", error.message);
      }
    }
    // a failed refresh keeps an exhibition that already loaded
    if (get().exhibitionStatus !== "ready") set({exhibition: sampleExhibition(), exhibitionStatus: "offline"});
  },
}));

useGalleryStore.subscribe((state) => {
  const saved = {};
  PERSISTED_KEYS.forEach((key) => {
    saved[key] = state[key];
  });
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch (error) {
    // storage can be unavailable (private mode, quota); preferences just won't persist
  }
});

export const getGalleryState = useGalleryStore.getState;
