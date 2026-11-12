import {Hono} from "hono";
import * as schemas from "../schemas";
import {parse} from "../http";
import {
  login, logout, register, loginAsGuest, upgradeGuest, changePassword, currentUser, isUsernameTaken,
  requireUser, requireMember, type AuthEnv,
} from "../auth";
import {storageKind, blobAuth} from "../storage";
import {pendingCount} from "../artworks";
import {pendingApplicationCount} from "../applications";
import {unreadCount} from "../notifications";
import {fail} from "../i18n";

export const authRoutes = new Hono<AuthEnv>();

// slow down password guessing a little
const pause = () => new Promise((resolve) => setTimeout(resolve, 600));

authRoutes.post("/register", async (c) => {
  const body = await parse(c.req.raw, schemas.registerBody);
  if (!body.data) return c.json({error: body.error}, 400);
  if (await isUsernameTaken(body.data.username)) return fail(c, 409, "auth.usernameTaken");
  const user = await register(c, body.data);
  return user ? c.json({user}, 201) : fail(c, 409, "auth.usernameTaken");
});

authRoutes.post("/login", async (c) => {
  const body = await parse(c.req.raw, schemas.loginBody);
  if (!body.data) return c.json({error: body.error}, 400);
  const user = await login(c, body.data.username, body.data.password);
  if (!user) {
    await pause();
    return fail(c, 401, "auth.wrongCredentials");
  }
  return c.json({user});
});

authRoutes.post("/guest", async (c) => c.json({user: await loginAsGuest(c)}, 201));

authRoutes.post("/logout", async (c) => {
  await logout(c);
  return c.json({ok: true});
});

authRoutes.get("/me", async (c) => {
  const user = await currentUser(c);
  if (!user) return fail(c, 401, "auth.notSignedIn");
  return c.json({
    user,
    storage: storageKind,
    blobAuth,
    pendingReviews: user.role === "admin" ? await pendingCount() : 0,
    pendingApplications: user.role === "admin" ? await pendingApplicationCount() : 0,
    unreadNotifications: await unreadCount(user.id),
  });
});

// A guest becomes a member without losing their account.
authRoutes.post("/upgrade", requireUser, async (c) => {
  if (c.get("user").role !== "guest") return fail(c, 400, "auth.alreadyMember");
  const body = await parse(c.req.raw, schemas.registerBody);
  if (!body.data) return c.json({error: body.error}, 400);
  const user = await upgradeGuest(c.get("user").id, body.data);
  return user ? c.json({user}) : fail(c, 409, "auth.usernameTaken");
});

authRoutes.put("/password", requireMember, async (c) => {
  const body = await parse(c.req.raw, schemas.passwordBody);
  if (!body.data) return c.json({error: body.error}, 400);
  if (!(await changePassword(c.get("user").id, body.data.current, body.data.next))) {
    await pause();
    return fail(c, 400, "auth.wrongCurrentPassword");
  }
  return c.json({ok: true});
});
