// Vercel Function entry: every /api/* request is rewritten here (see vercel.json)
// and handled by the Hono app, using Web-standard Request / Response.
import {app} from "./_lib/app";

const handle = (request: Request) => app.fetch(request);

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
