import { createApp } from "../server/_core/index.ts";

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
    return res.status(500).json({
      error: "API initialization failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
