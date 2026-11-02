import {z} from "zod";
import limits from "../../src/shared/artworkLimits.json";
import slots from "../../src/shared/exhibitionSlots.json";
import {isOwnImageUrl} from "./storage";

// validation messages in Traditional Chinese
z.config(z.locales.zhTW());

// The same limits drive the admin form, so client and server always agree.
export {limits};

const imageUrl = z.string().max(500).refine(isOwnImageUrl, "圖片網址不屬於本站的儲存空間");

const hotspot = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  label: z.string().trim().min(1).max(limits.hotspotLabel),
  note: z.string().trim().max(limits.hotspotNote),
});

export const createArtwork = z.object({
  imageUrl,
  previewUrl: imageUrl,
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
  title: z.string().trim().max(limits.title).default(""),
});

export const updateArtwork = z.object({
  title: z.string().trim().max(limits.title),
  author: z.string().trim().max(limits.author),
  character: z.string().trim().max(limits.character),
  description: z.string().trim().max(limits.description),
  story: z.string().trim().max(limits.story),
  hotspots: z.array(hotspot).max(limits.hotspots),
  status: z.enum(["draft", "published"]),
}).partial();

export const reorder = z.object({ids: z.array(z.string()).max(1000)});

const slotIds = [...slots.main.map((slot) => slot.id), slots.feature.id];
export const exhibition = z.object({
  // slot id -> artwork id; slots left out are emptied
  placements: z.record(z.string(), z.string()).refine(
      (placements) => Object.keys(placements).every((slot) => slotIds.includes(slot)),
      "未知的展位",
  ),
});

export const loginBody = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
});
