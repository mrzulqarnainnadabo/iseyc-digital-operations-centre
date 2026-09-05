/**
 * ISEYC Digital Operations Centre — Vercel serverless entry
 * Serves API (/api/trpc, …) AND the built SPA from dist/public.
 * Repo: iseyc-digital-operations-centre (NOT Autoverse)
 */
import { createApp } from "../dist/index.js";

let appPromise;

async function getApp() {
  if (!appPromise) {
    // serveClient: true → Express serves dist/public (SPA)
    appPromise = createApp({ serveClient: true }).then(({ app }) => app);
  }
  return appPromise;
}

export default async function handler(req, res) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error) {
    console.error("[ISEYC DOC] API/static init failed", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "ISEYC Digital Operations Centre failed to start",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
