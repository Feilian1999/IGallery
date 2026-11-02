import * as path from "node:path";
import {mkdir} from "node:fs/promises";
import {neon} from "@neondatabase/serverless";
import {hashPassword} from "./password";

// One query function, two drivers:
//   DATABASE_URL set (Vercel + Neon)  -> Neon's HTTP driver
//   not set (local development)       -> PGlite, a real Postgres embedded in Node,
//                                         stored in .data/pglite
type Row = Record<string, any>;
type Query = (text: string, params?: unknown[]) => Promise<Row[]>;

// Schema changes, applied in order and recorded in schema_migrations. Never edit a
// shipped migration; add a new one. Every statement is safe to run twice, because two
// cold-starting instances can race to apply the same migration.
const MIGRATIONS: string[][] = [
  // 1. the original tables
  [
    `create table if not exists users (
      id serial primary key,
      username text unique not null,
      password_hash text not null,
      created_at timestamptz not null default now()
    )`,
    `create table if not exists sessions (
      token_hash text primary key,
      user_id integer not null references users(id) on delete cascade,
      expires_at timestamptz not null
    )`,
    `create table if not exists artworks (
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
    )`,
    `create table if not exists placements (
      slot text primary key,
      artwork_id text not null references artworks(id) on delete cascade
    )`,
  ],
  // 2. member accounts, guests, review workflow, AI disclosure and likes
  [
    `alter table users add column if not exists role text not null default 'member'`,
    `alter table users add column if not exists display_name text not null default ''`,
    `alter table users add column if not exists bio text not null default ''`,
    // the only account before this migration was the bootstrap admin
    `update users set role = 'admin' where id = (select min(id) from users) and not exists (select 1 from users where role = 'admin')`,
    `update users set display_name = username where display_name = ''`,
    `alter table artworks add column if not exists owner_id integer references users(id) on delete cascade`,
    `update artworks set owner_id = (select min(id) from users where role = 'admin') where owner_id is null`,
    `alter table artworks add column if not exists ai_usage text not null default 'unspecified'`,
    `alter table artworks add column if not exists review_note text not null default ''`,
    `alter table artworks drop constraint if exists artworks_status_check`,
    `alter table artworks add constraint artworks_status_check check (status in ('draft', 'pending', 'published', 'rejected'))`,
    `alter table artworks drop constraint if exists artworks_ai_usage_check`,
    `alter table artworks add constraint artworks_ai_usage_check check (ai_usage in ('unspecified', 'none', 'assisted', 'generated'))`,
    `alter table users drop constraint if exists users_role_check`,
    `alter table users add constraint users_role_check check (role in ('admin', 'member', 'guest'))`,
    `create table if not exists likes (
      user_id integer not null references users(id) on delete cascade,
      artwork_id text not null references artworks(id) on delete cascade,
      created_at timestamptz not null default now(),
      primary key (user_id, artwork_id)
    )`,
    `create index if not exists likes_artwork_idx on likes (artwork_id)`,
    `create index if not exists artworks_owner_idx on artworks (owner_id)`,
  ],
  // 3. in-app notifications
  [
    `create table if not exists notifications (
      id serial primary key,
      user_id integer not null references users(id) on delete cascade,
      type text not null,
      artwork_id text references artworks(id) on delete cascade,
      actor_id integer references users(id) on delete set null,
      message text not null default '',
      read_at timestamptz,
      created_at timestamptz not null default now()
    )`,
    `create index if not exists notifications_user_idx on notifications (user_id, created_at desc)`,
    // liking, unliking and liking again notifies the owner only once
    `create unique index if not exists notifications_like_once on notifications (user_id, artwork_id, actor_id) where type = 'like'`,
  ],
  // 4. public artist pages: favorites privacy and commission details
  [
    `alter table users add column if not exists likes_public boolean not null default true`,
    `alter table users add column if not exists commission_open boolean not null default false`,
    `alter table users add column if not exists commission_info text not null default ''`,
    `alter table users add column if not exists commission_contact text not null default ''`,
    `alter table users add column if not exists commission_plans jsonb not null default '[]'`,
  ],
  // 5. artists: only approved artists publish; members apply to become one
  [
    `alter table users drop constraint if exists users_role_check`,
    `alter table users add constraint users_role_check check (role in ('admin', 'artist', 'member', 'guest'))`,
    // members who already have work keep publishing, as artists
    `update users set role = 'artist' where role = 'member' and exists (select 1 from artworks a where a.owner_id = users.id)`,
    `create table if not exists artist_applications (
      id serial primary key,
      user_id integer not null references users(id) on delete cascade,
      message text not null,
      links text not null default '',
      status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
      review_note text not null default '',
      reviewer_id integer references users(id) on delete set null,
      created_at timestamptz not null default now(),
      reviewed_at timestamptz
    )`,
    `create index if not exists artist_applications_user_idx on artist_applications (user_id, created_at desc)`,
    // one open application per member
    `create unique index if not exists artist_applications_one_pending on artist_applications (user_id) where status = 'pending'`,
  ],
];

// Neon's Vercel integration names it DATABASE_URL; some setups use POSTGRES_URL.
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

export const databaseKind = connectionString ? "neon" : "pglite";

const createDriver = async (): Promise<Query> => {
  if (connectionString) {
    const sql = neon(connectionString);
    return (text, params = []) => sql.query(text, params) as Promise<Row[]>;
  }
  if (process.env.VERCEL) throw new Error("DATABASE_URL is not set; connect the Neon database to this Vercel project");
  const {PGlite} = await import("@electric-sql/pglite");
  const dataDir = path.resolve(".data/pglite");
  await mkdir(path.dirname(dataDir), {recursive: true});
  const db = new PGlite(dataDir);
  return async (text, params = []) => (await db.query<Row>(text, params)).rows;
};

const migrate = async (query: Query) => {
  await query("create table if not exists schema_migrations (version integer primary key, applied_at timestamptz not null default now())");
  const [{current}] = await query("select coalesce(max(version), 0)::int as current from schema_migrations");
  for (let version = current + 1; version <= MIGRATIONS.length; version++) {
    for (const statement of MIGRATIONS[version - 1]) await query(statement);
    await query("insert into schema_migrations (version) values ($1) on conflict do nothing", [version]);
    console.log(`[igallery] applied database migration ${version}`);
  }
};

// The admin account comes from ADMIN_USERNAME / ADMIN_PASSWORD: created if missing,
// and always kept an admin. Locally, without those, a development-only admin is created.
const ensureAdmin = async (query: Query) => {
  let username = process.env.ADMIN_USERNAME;
  let password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    if (process.env.VERCEL) return;
    username = "admin";
    password = "igallery-dev";
  }
  const [existing] = await query("select id from users where username = $1", [username]);
  if (existing) {
    await query("update users set role = 'admin' where id = $1 and role <> 'admin'", [existing.id]);
    return;
  }
  const [{count}] = await query("select count(*)::int as count from users where role = 'admin'");
  // only bootstrap when there is no admin yet; afterwards admins are managed in the app
  if (count > 0) return;
  await query(
      "insert into users (username, password_hash, role, display_name) values ($1, $2, 'admin', $1)",
      [username, await hashPassword(password)],
  );
  if (!process.env.ADMIN_USERNAME) console.warn(`[igallery] created local admin account ${username} / ${password}`);
};

let ready: Promise<Query> | null = null;

// Connects, migrates the schema, and bootstraps the admin, once per instance.
const init = async () => {
  const query = await createDriver();
  await migrate(query);
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
