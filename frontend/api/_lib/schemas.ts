import {z} from "zod";
// namespace imports, so this compiles the same whether or not esModuleInterop is on
import * as limits from "../../src/shared/artworkLimits.json";
import * as slots from "../../src/shared/exhibitionSlots.json";
import {isOwnImageUrl} from "./storage";
import type {MessageKey} from "./i18n";

// Default validation messages in Traditional Chinese; http.ts passes the request's
// language to each parse, which takes precedence.
z.config(z.locales.zhTW());

// Custom messages are message keys, translated by http.ts once the language is known.
const message = (key: MessageKey) => key;

// The same limits drive the forms in the app, so client and server always agree.
export {limits};

export const AI_USAGES = ["none", "assisted", "generated"] as const;

const imageUrl = z.string().max(500).refine(isOwnImageUrl, message("validation.foreignImageUrl"));

const hotspot = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  label: z.string().trim().min(1).max(limits.hotspotLabel),
  note: z.string().trim().max(limits.hotspotNote),
});

// --- accounts -------------------------------------------------------------------

// usernames are stored lowercase so "Allen" and "allen" can't both exist
const username = z.string().trim().toLowerCase()
    .regex(/^[a-z0-9_-]{3,24}$/, message("validation.username"));
const password = z.string().min(8, message("validation.passwordTooShort")).max(200);
const displayName = z.string().trim().max(limits.displayName);

export const loginBody = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
});

export const registerBody = z.object({username, password, displayName: displayName.default("")});

const commissionPlan = z.object({
  title: z.string().trim().min(1, message("validation.planTitleRequired")).max(limits.planTitle),
  price: z.string().trim().max(limits.planPrice),
  description: z.string().trim().max(limits.planDescription),
});

export const profileBody = z.object({
  displayName: displayName.min(1, message("validation.displayNameRequired")),
  bio: z.string().trim().max(limits.bio),
  likesPublic: z.boolean(),
  commission: z.object({
    open: z.boolean(),
    info: z.string().trim().max(limits.commissionInfo),
    contact: z.string().trim().max(limits.commissionContact),
    plans: z.array(commissionPlan).max(limits.commissionPlans),
  }),
}).partial();

export const passwordBody = z.object({current: z.string().min(1).max(200), next: password});

// --- artworks ---------------------------------------------------------------------

export const createArtwork = z.object({
  imageUrl,
  previewUrl: imageUrl,
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
  title: z.string().trim().max(limits.title).default(""),
  author: z.string().trim().max(limits.author).default(""),
  character: z.string().trim().max(limits.character).optional(),
  description: z.string().trim().max(limits.description).optional(),
  story: z.string().trim().max(limits.story).optional(),
  hotspots: z.array(hotspot).max(limits.hotspots).optional(),
  aiUsage: z.enum(AI_USAGES, {message: message("validation.aiUsageRequired")}),
});

// what the owner can change; status changes go through submit / withdraw
export const updateArtwork = z.object({
  title: z.string().trim().max(limits.title),
  author: z.string().trim().max(limits.author),
  character: z.string().trim().max(limits.character),
  description: z.string().trim().max(limits.description),
  story: z.string().trim().max(limits.story),
  hotspots: z.array(hotspot).max(limits.hotspots),
  aiUsage: z.enum(AI_USAGES, {message: message("validation.aiUsageRequired")}),
}).partial();

// admins can also set the status directly
export const adminUpdateArtwork = updateArtwork.extend({
  status: z.enum(["draft", "pending", "published", "rejected"]),
}).partial();

export const rejectBody = z.object({reason: z.string().trim().min(1, message("validation.reasonRequired")).max(limits.reviewNote)});

export const reorder = z.object({ids: z.array(z.string()).max(1000)});

const slotIds = [...slots.main, ...slots.festival].map((slot) => slot.id).concat(slots.feature.id);
export const exhibition = z.object({
  // slot id -> artwork id; slots left out are emptied
  placements: z.record(z.string(), z.string()).refine(
      (placements) => Object.keys(placements).every((slot) => slotIds.includes(slot)),
      message("validation.unknownSlot"),
  ),
});

// no ids: mark everything read
export const markReadBody = z.object({ids: z.array(z.number().int()).max(200).optional()});

// --- users (admin) -----------------------------------------------------------------

export const roleBody = z.object({role: z.enum(["admin", "artist", "member"])});
export const artistApplicationBody = z.object({
  message: z.string().trim().min(1, message("validation.applicationMessageRequired")).max(limits.applicationMessage),
  links: z.string().trim().max(limits.applicationLinks).default(""),
});
export const resetPasswordBody = z.object({password});
