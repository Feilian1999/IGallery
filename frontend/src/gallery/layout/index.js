import slots from "../../shared/exhibitionSlots.json";
import {viewingSpot} from "./geometry";
import * as mainHall from "./mainHall";
import * as annex from "./annex";

const entry = (artwork, placement) => ({artwork, placement, spot: viewingSpot(placement)});

// Static facts about each room; the artworks are filled in by buildRooms.
export const ROOM_INFO = {
  main: {id: "main", name: "主展廳", subtitle: "Main Hall", spawn: mainHall.SPAWN, bounds: mainHall.BOUNDS},
  annex: {id: "annex", name: "懸浮展廳", subtitle: "Floating Room", spawn: annex.SPAWN, bounds: annex.BOUNDS},
};

// Everything the player controller, camera and map need to know about each room,
// given the published artworks and the slot -> artwork id placements.
export const buildRooms = (artworks, placements) => {
  const byId = Object.fromEntries(artworks.map((artwork) => [artwork.id, artwork]));
  const mainArtworks = slots.main
      .filter((slot) => byId[placements[slot.id]])
      .map((slot) => entry(byId[placements[slot.id]], mainHall.SLOT_PLACEMENTS[slot.id]));
  const ring = annex.ringPlacements(artworks.length);
  return {
    main: {
      ...ROOM_INFO.main,
      colliders: mainHall.COLLIDERS,
      interactables: mainHall.INTERACTABLES,
      artworks: mainArtworks,
      layout: mainHall,
    },
    annex: {
      ...ROOM_INFO.annex,
      colliders: annex.colliders(ring),
      interactables: annex.INTERACTABLES,
      artworks: ring.map((placement, i) => entry(artworks[i], placement)),
      layout: annex,
    },
  };
};
