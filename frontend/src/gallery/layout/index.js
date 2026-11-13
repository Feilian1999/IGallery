import slots from "../../shared/exhibitionSlots.json";
import {viewingSpot} from "./geometry";
import * as mainHall from "./mainHall";
import * as annex from "./annex";
import * as festival from "./festival";
import * as parkour from "./parkour";

const entry = (artwork, placement) => ({artwork, placement, spot: viewingSpot(placement)});

// Static facts about each room; the artworks are filled in by buildRooms.
// Room names are translated at render time with common:rooms.<id>.
export const ROOM_INFO = {
  main: {id: "main", subtitle: "Main Hall", spawn: mainHall.SPAWN, bounds: mainHall.BOUNDS},
  parkour: {id: "parkour", subtitle: "Upstairs", spawn: parkour.SPAWN, bounds: parkour.BOUNDS},
  annex: {id: "annex", subtitle: "Floating Room", spawn: annex.SPAWN, bounds: annex.BOUNDS},
  festival: {id: "festival", subtitle: "Summer Festival", spawn: festival.SPAWN, bounds: festival.BOUNDS},
};

// Everything the player controller, camera and map need to know about each room,
// given the published artworks and the slot -> artwork id placements.
export const buildRooms = (artworks, placements) => {
  const byId = Object.fromEntries(artworks.map((artwork) => [artwork.id, artwork]));
  const mainArtworks = slots.main
      .filter((slot) => byId[placements[slot.id]])
      .map((slot) => entry(byId[placements[slot.id]], mainHall.SLOT_PLACEMENTS[slot.id]));
  // until an admin arranges the festival, it shows the published works in order
  const arranged = slots.festival.some((slot) => byId[placements[slot.id]]);
  const festivalArtworks = slots.festival
      .map((slot, i) => [slot, arranged ? byId[placements[slot.id]] : artworks[i]])
      .filter(([, artwork]) => artwork)
      .map(([slot, artwork]) => entry(artwork, festival.SLOT_PLACEMENTS[slot.id]));
  const ring = annex.ringPlacements(artworks.length);
  return {
    main: {
      ...ROOM_INFO.main,
      colliders: mainHall.COLLIDERS,
      interactables: mainHall.INTERACTABLES,
      artworks: mainArtworks,
      layout: mainHall,
    },
    parkour: {
      ...ROOM_INFO.parkour,
      colliders: parkour.COLLIDERS,
      interactables: parkour.INTERACTABLES,
      artworks: [],
      layout: parkour,
    },
    annex: {
      ...ROOM_INFO.annex,
      colliders: annex.COLLIDERS,
      interactables: annex.INTERACTABLES,
      artworks: ring.map((placement, i) => entry(artworks[i], placement)),
      layout: annex,
    },
    festival: {
      ...ROOM_INFO.festival,
      colliders: festival.COLLIDERS,
      interactables: festival.INTERACTABLES,
      artworks: festivalArtworks,
      layout: festival,
    },
  };
};
