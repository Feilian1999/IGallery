import {scrypt, randomBytes, timingSafeEqual} from "node:crypto";

// scrypt from Node's standard library, stored as "scrypt$<salt>$<hash>" (hex).
const KEY_LENGTH = 64;

const derive = (password: string, salt: Uint8Array) => new Promise<Uint8Array>((resolve, reject) => {
  scrypt(password, salt, KEY_LENGTH, (error, key) => (error ? reject(error) : resolve(new Uint8Array(key))));
});

export const hashPassword = async (password: string) => {
  const salt = new Uint8Array(randomBytes(16));
  return `scrypt$${Buffer.from(salt).toString("hex")}$${Buffer.from(await derive(password, salt)).toString("hex")}`;
};

export const verifyPassword = async (password: string, stored: string) => {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = new Uint8Array(Buffer.from(hash, "hex"));
  const actual = await derive(password, new Uint8Array(Buffer.from(salt, "hex")));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};
