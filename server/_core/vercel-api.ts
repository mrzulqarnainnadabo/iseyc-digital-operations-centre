/**
 * Vercel-only entry: API routes only (SPA is served as static from dist/public).
 * ISEYC Digital Operations Centre — not Autoverse.
 */
import { createApp } from "./index";

let appPromise: Promise<import("express").Express> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = createApp({ serveClient: false }).then(({ app }) => app);
  }
  return appPromise;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error) {
    console.error("[ISEYC DOC] vercel-api failed", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "ISEYC DOC API failed to start",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
