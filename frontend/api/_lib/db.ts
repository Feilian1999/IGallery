import path from "node:path";
import {mkdir} from "node:fs/promises";
import {neon} from "@neondatabase/serverless";
import {hashPassword} from "./password";

// One query function, two drivers:
//   DATABASE_URL set (Vercel + Neon)  -> Neon's HTTP driver
//   not set (local development)       -> PGlite, a real Postgres embedded in Node,
//                                         stored in .data/pglite
type Row = Record<string, any>;
type Query = (text: string, params?: unknown[]) => Promise<Row[]>;

const SCHEMA = `
create table if not exists users (
  id serial primary key,
  username text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);
create table if not exists sessions (
  token_hash text primary key,
  user_id integer not null references users(id) on delete cascade,
  expires_at timestamptz not null
);
create table if not exists artworks (
  id text primary key,
  title text not null default '',
  author text not null default '',
  character_name text not null default '',
  description text not null default '',
  story text not null default '',
  image_url text not null,
  preview_url text not null,
  width integer not null,
  height integer not null,
  hotspots jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists placements (
  slot text primary key,
  artwork_id text not null references artworks(id) on delete cascade
);
`;

export const databaseKind = process.env.DATABASE_URL ? "neon" : "pglite";

const createDriver = async (): Promise<Query> => {
  if (process.env.DATABASE_URL) {
    const sql = neon(process.env.DATABASE_URL);
    return (text, params = []) => sql.query(text, params) as Promise<Row[]>;
  }
  if (process.env.VERCEL) throw new Error("DATABASE_URL is not set");
  const {PGlite} = await import("@electric-sql/pglite");
  const dataDir = path.resolve(".data/pglite");
  await mkdir(path.dirname(dataDir), {recursive: true});
  const db = new PGlite(dataDir);
  return async (text, params = []) => (await db.query<Row>(text, params)).rows;
};

// The first admin comes from ADMIN_USERNAME / ADMIN_PASSWORD. Locally, without
// those, a development-only account is created so the admin page works out of the box.
const ensureAdmin = async (query: Query) => {
  const [{count}] = await query("select count(*)::int as count from users");
  if (count > 0) return;
  let username = process.env.ADMIN_USERNAME;
  let password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    if (process.env.VERCEL) return;
    username = "admin";
    password = "igallery-dev";
    console.warn(`[igallery] no ADMIN_USERNAME / ADMIN_PASSWORD set, created local account ${username} / ${password}`);
  }
  await query("insert into users (username, password_hash) values ($1, $2)", [username, await hashPassword(password)]);
};

let ready: Promise<Query> | null = null;

// Connects, creates the tables if needed, and bootstraps the admin, once per instance.
const init = async () => {
  const query = await createDriver();
  // both drivers take one statement per parameterised query call
  for (const statement of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) await query(statement);
  await ensureAdmin(query);
  return query;
};

export const query: Query = async (text, params) => {
  if (!ready) {
    ready = init().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return (await ready)(text, params);
};
