import path from "node:path";
import {promises as fs} from "node:fs";
import {randomUUID} from "node:crypto";
import {del} from "@vercel/blob";

// Images live in Vercel Blob when it is configured, otherwise (locally) they are
// written to .data/uploads and served by GET /api/files/:name.
//
// Blob stores connected to a project recently get BLOB_STORE_ID and authenticate
// with Vercel's OIDC token; older ones get BLOB_READ_WRITE_TOKEN. Both work.
export const blobAuth = process.env.BLOB_READ_WRITE_TOKEN ? "token" : process.env.BLOB_STORE_ID ? "oidc" : null;
export const storageKind = blobAuth ? "blob" : "local";

const LOCAL_DIR = path.resolve(".data/uploads");
const LOCAL_PREFIX = "/api/files/";
const EXTENSIONS: Record<string, string> = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"};

// Images we are willing to reference: our Blob store, local uploads, or the bundled samples.
export const isOwnImageUrl = (url: string) => {
  if (url.startsWith(LOCAL_PREFIX) || url.startsWith("/artworks/")) return !url.includes("..");
  try {
    const {protocol, hostname} = new URL(url);
    return protocol === "https:" && hostname.endsWith(".public.blob.vercel-storage.com");
  } catch (error) {
    return false;
  }
};

// Checks the file's leading bytes, so a renamed file can't pass as an image.
export const sniffImageType = (bytes: Uint8Array): string | null => {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
};

export const saveLocal = async (bytes: Uint8Array, type: string) => {
  await fs.mkdir(LOCAL_DIR, {recursive: true});
  const name = `${randomUUID()}.${EXTENSIONS[type]}`;
  await fs.writeFile(path.join(LOCAL_DIR, name), bytes);
  return `${LOCAL_PREFIX}${name}`;
};

export const readLocal = async (name: string) => {
  // names are always uuid.ext; anything else is refused
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(name)) return null;
  try {
    return {bytes: await fs.readFile(path.join(LOCAL_DIR, name)), type: `image/${name.endsWith("jpg") ? "jpeg" : name.split(".").pop()}`};
  } catch (error) {
    return null;
  }
};

// Removes an uploaded image. Bundled samples (/artworks/...) are left alone.
export const removeImage = async (url: string) => {
  if (url.startsWith(LOCAL_PREFIX)) {
    await fs.rm(path.join(LOCAL_DIR, path.basename(url)), {force: true});
  } else if (storageKind === "blob" && isOwnImageUrl(url) && !url.startsWith("/")) {
    await del(url);
  }
};
