// Runs the same Hono app as the Vercel Function, on http://localhost:3001.
// The React dev server proxies /api to it (see "proxy" in package.json).
import {serve} from "@hono/node-server";
import {app} from "../api/_lib/app";
import {seedIfEmpty} from "./seed";

const PORT = Number(process.env.API_PORT || 3001);

seedIfEmpty().then(() => {
  serve({fetch: app.fetch, port: PORT}, () => console.log(`[igallery] API ready on http://localhost:${PORT}/api`));
});
