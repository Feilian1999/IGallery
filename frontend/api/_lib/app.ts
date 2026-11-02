import {Hono} from "hono";
import type {AuthEnv} from "./auth";
import {publicRoutes} from "./routes/public";
import {authRoutes} from "./routes/auth";
import {meRoutes} from "./routes/me";
import {uploadRoutes} from "./routes/uploads";
import {adminRoutes} from "./routes/admin";

export const app = new Hono<AuthEnv>().basePath("/api");

app.onError((error, c) => {
  console.error(error);
  return c.json({error: "伺服器發生錯誤"}, 500);
});

app.route("/", publicRoutes);
app.route("/auth", authRoutes);
app.route("/me", meRoutes);
app.route("/uploads", uploadRoutes);
app.route("/admin", adminRoutes);

app.notFound((c) => c.json({error: "找不到這個 API"}, 404));
