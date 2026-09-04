/**
 * Vercel serverless entry for /api/*
 * Uses the Express app built into dist/ by `npm run build`.
 */
import { createApp } from "../dist/index.js";

let appPromise;

async function getApp() {
  if (!appPromise) {
    appPromise = createApp({ serveClient: false }).then(({ app }) => app);
  }
  return appPromise;
}

export default async function handler(req, res) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (error) {
    console.error("[ISEYC] API init failed", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "API initialization failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
