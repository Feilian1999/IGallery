// Vercel Function entry: every /api/* request is rewritten here (see vercel.json)
// and handled by the Hono app with Web-standard Request / Response.
import {app} from "./_lib/app";

export default {
  fetch: (request: Request) => app.fetch(request),
};
