import {createHash, randomBytes} from "node:crypto";
import type {Context, MiddlewareHandler} from "hono";
import {getCookie, setCookie, deleteCookie} from "hono/cookie";
import {query} from "./db";
import {verifyPassword} from "./password";

const COOKIE = "igallery_session";
const SESSION_DAYS = 14;
// Mutating admin requests must carry this header. Browsers won't add custom headers
// to cross-site form posts, so together with SameSite cookies this blocks CSRF.
export const CSRF_HEADER = "x-igallery";

export type User = {id: number; username: string};

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const cookieOptions = {
  httpOnly: true,
  sameSite: "Lax" as const,
  secure: Boolean(process.env.VERCEL),
  path: "/api",
};

export const login = async (c: Context, username: string, password: string): Promise<User | null> => {
  const [user] = await query("select id, username, password_hash from users where username = $1", [username]);
  // verify against a dummy hash when the user doesn't exist, so timing doesn't reveal usernames
  const valid = await verifyPassword(password, user?.password_hash || "scrypt$00$00");
  if (!user || !valid) return null;
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400 * 1000);
  await query("insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)", [hashToken(token), user.id, expires.toISOString()]);
  await query("delete from sessions where expires_at < now()");
  setCookie(c, COOKIE, token, {...cookieOptions, expires});
  return {id: user.id, username: user.username};
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
      "select u.id, u.username from sessions s join users u on u.id = s.user_id where s.token_hash = $1 and s.expires_at > now()",
      [hashToken(token)],
  );
  return row ? {id: row.id, username: row.username} : null;
};

export const requireAdmin: MiddlewareHandler<{Variables: {user: User}}> = async (c, next) => {
  if (c.req.method !== "GET" && c.req.header(CSRF_HEADER) !== "1") {
    return c.json({error: "缺少必要的請求標頭"}, 403);
  }
  const user = await currentUser(c);
  if (!user) return c.json({error: "請先登入"}, 401);
  c.set("user", user);
  await next();
};
