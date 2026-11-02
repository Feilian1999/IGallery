import {createHash, randomBytes} from "node:crypto";
import type {Context, MiddlewareHandler} from "hono";
import {getCookie, setCookie, deleteCookie} from "hono/cookie";
import {query} from "./db";
import {hashPassword, verifyPassword} from "./password";

const COOKIE = "igallery_session";
const SESSION_DAYS = 14;
const GUEST_DAYS = 7;
// Mutating requests from the app must carry this header. Browsers won't add custom
// headers to cross-site form posts, so together with SameSite cookies this blocks CSRF.
export const CSRF_HEADER = "x-igallery";

export type Role = "admin" | "member" | "guest";
export type CommissionPlan = {title: string; price: string; description: string};
export type User = {
  id: number; username: string; displayName: string; bio: string; role: Role; createdAt: string;
  likesPublic: boolean;
  commission: {open: boolean; info: string; contact: string; plans: CommissionPlan[]};
};
export type AuthEnv = {Variables: {user: User}};

export const USER_COLUMNS = `u.id, u.username, u.display_name, u.bio, u.role, u.created_at, u.likes_public,
  u.commission_open, u.commission_info, u.commission_contact, u.commission_plans`;

export const toUser = (row: Record<string, any>): User => ({
  id: row.id,
  username: row.username,
  displayName: row.display_name || row.username,
  bio: row.bio,
  role: row.role,
  createdAt: new Date(row.created_at).toISOString(),
  likesPublic: row.likes_public,
  commission: {
    open: row.commission_open,
    info: row.commission_info,
    contact: row.commission_contact,
    plans: typeof row.commission_plans === "string" ? JSON.parse(row.commission_plans) : row.commission_plans,
  },
});

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const cookieOptions = {
  httpOnly: true,
  sameSite: "Lax" as const,
  secure: Boolean(process.env.VERCEL),
  path: "/api",
};

const startSession = async (c: Context, userId: number, days: number) => {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + days * 86400 * 1000);
  await query("insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)", [hashToken(token), userId, expires.toISOString()]);
  setCookie(c, COOKIE, token, {...cookieOptions, expires});
};

const cleanUp = async () => {
  await query("delete from sessions where expires_at < now()");
  // guest accounts are disposable; drop the ones nobody has used for a week
  await query(
      `delete from users u where u.role = 'guest' and u.created_at < now() - interval '${GUEST_DAYS} days'
       and not exists (select 1 from sessions s where s.user_id = u.id)`,
  );
};

export const login = async (c: Context, username: string, password: string): Promise<User | null> => {
  const [row] = await query(`select ${USER_COLUMNS}, u.password_hash from users u where lower(u.username) = lower($1) and u.role <> 'guest'`, [username]);
  // verify against a dummy hash when the user doesn't exist, so timing doesn't reveal usernames
  const valid = await verifyPassword(password, row?.password_hash || "scrypt$00$00");
  if (!row || !valid) return null;
  await startSession(c, row.id, SESSION_DAYS);
  await cleanUp();
  return toUser(row);
};

export const register = async (c: Context, input: {username: string; password: string; displayName: string}) => {
  const [row] = await query(
      `insert into users (username, password_hash, display_name, role) values ($1, $2, $3, 'member')
       on conflict (username) do nothing returning ${USER_COLUMNS.replace(/u\./g, "")}`,
      [input.username, await hashPassword(input.password), input.displayName || input.username],
  );
  if (!row) return null;
  await startSession(c, row.id, SESSION_DAYS);
  return toUser(row);
};

export const isUsernameTaken = async (username: string) =>
  (await query("select 1 from users where lower(username) = lower($1)", [username])).length > 0;

// A disposable account for looking around; it can browse but not upload or like.
export const loginAsGuest = async (c: Context) => {
  const suffix = randomBytes(3).toString("hex");
  const [row] = await query(
      `insert into users (username, password_hash, display_name, role) values ($1, '!', $2, 'guest')
       returning ${USER_COLUMNS.replace(/u\./g, "")}`,
      [`guest-${suffix}`, `訪客 ${suffix.toUpperCase()}`],
  );
  await startSession(c, row.id, GUEST_DAYS);
  await cleanUp();
  return toUser(row);
};

// Turns a guest into a member, keeping the same account.
export const upgradeGuest = async (userId: number, input: {username: string; password: string; displayName: string}) => {
  const [row] = await query(
      `update users set username = $2, password_hash = $3, display_name = $4, role = 'member'
       where id = $1 and role = 'guest' and not exists (select 1 from users where lower(username) = lower($2))
       returning ${USER_COLUMNS.replace(/u\./g, "")}`,
      [userId, input.username, await hashPassword(input.password), input.displayName || input.username],
  );
  return row ? toUser(row) : null;
};

export const changePassword = async (userId: number, current: string, next: string) => {
  const [row] = await query("select password_hash from users where id = $1 and role <> 'guest'", [userId]);
  if (!row || !(await verifyPassword(current, row.password_hash))) return false;
  await query("update users set password_hash = $2 where id = $1", [userId, await hashPassword(next)]);
  return true;
};

export const logout = async (c: Context) => {
  const token = getCookie(c, COOKIE);
  if (token) await query("delete from sessions where token_hash = $1", [hashToken(token)]);
  deleteCookie(c, COOKIE, cookieOptions);
};

export const currentUser = async (c: Context): Promise<User | null> => {
  const token = getCookie(c, COOKIE);
  if (!token) return null;
  const [row] = await query(
      `select ${USER_COLUMNS} from sessions s join users u on u.id = s.user_id where s.token_hash = $1 and s.expires_at > now()`,
      [hashToken(token)],
  );
  return row ? toUser(row) : null;
};

// Middleware: a signed-in user whose role is in `roles`. Changes also need the CSRF header.
const requireRole = (roles: Role[], message: string): MiddlewareHandler<AuthEnv> => async (c, next) => {
  if (c.req.method !== "GET" && c.req.header(CSRF_HEADER) !== "1") {
    return c.json({error: "缺少必要的請求標頭"}, 403);
  }
  const user = await currentUser(c);
  if (!user) return c.json({error: "請先登入"}, 401);
  if (!roles.includes(user.role)) return c.json({error: message}, 403);
  c.set("user", user);
  await next();
};

export const requireUser = requireRole(["admin", "member", "guest"], "請先登入");
export const requireMember = requireRole(["admin", "member"], "訪客無法使用這個功能，請先註冊成為會員");
export const requireAdmin = requireRole(["admin"], "只有管理者可以使用這個功能");
