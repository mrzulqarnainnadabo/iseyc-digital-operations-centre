/**
 * Vercel serverless entry.
 * Imports the pre-built Express app from dist/ (created by `npm run build`).
 * Do NOT import TypeScript from server/ here — Vercel cannot execute .ts at runtime.
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
    console.error("[ISEYC] Failed to initialize API handler", error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: "API initialization failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
