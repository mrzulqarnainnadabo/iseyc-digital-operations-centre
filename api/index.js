// Vercel serverless entrypoint for the ISEYC Digital Operations Centre
// This wraps the Express app so it works on Vercel without calling .listen()

import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Dynamically load the built server after the build step
// The build produces dist/index.js from server/_core/index.ts
let handlerPromise = null;

async function getHandler() {
  if (!handlerPromise) {
    handlerPromise = (async () => {
      // Import the built server which now exports a handler when VERCEL is set
      const mod = await import("../dist/index.js");
      return mod.default || mod.handler || mod.app;
    })();
  }
  return handlerPromise;
}

export default async function handler(req, res) {
  try {
    const appHandler = await getHandler();
    if (typeof appHandler === "function") {
      return appHandler(req, res);
    }
    // If the module exports an Express app
    if (appHandler && typeof appHandler === "object" && appHandler.handle) {
      return appHandler.handle(req, res);
    }
    res.status(500).json({ error: "Server handler not found" });
  } catch (err) {
    console.error("[Vercel] Handler error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
      timestamp: new Date().toISOString(),
    });
  }
}
