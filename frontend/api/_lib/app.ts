import {Hono} from "hono";
import type {AuthEnv} from "./auth";
import {publicRoutes} from "./routes/public";
import {authRoutes} from "./routes/auth";
import {meRoutes} from "./routes/me";
import {uploadRoutes} from "./routes/uploads";
import {adminRoutes} from "./routes/admin";
import {userRoutes} from "./routes/users";
import {fail} from "./i18n";

export const app = new Hono<AuthEnv>().basePath("/api");

app.onError((error, c) => {
  console.error(error);
  return fail(c, 500, "server.error");
});

app.route("/", publicRoutes);
app.route("/auth", authRoutes);
app.route("/me", meRoutes);
app.route("/uploads", uploadRoutes);
app.route("/admin", adminRoutes);
app.route("/users", userRoutes);

app.notFound((c) => fail(c, 404, "api.notFound"));
