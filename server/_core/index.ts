import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { cronAuth } from "./sdk";
import { isRegisteredFallbackTask, processDueSubmissions } from "../meeting/service";

async function createApp() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);

  app.post("/api/scheduled/meeting-fallback", async (req, res) => {
    try {
      const cronUser = await cronAuth.authenticateCronRequest(req);
      if (!(await isRegisteredFallbackTask(cronUser.taskUid))) {
        return res.json({ ok: true, skipped: "orphan_or_unregistered_task" });
      }
      const outcomes = await processDueSubmissions();
      return res.json({ ok: true, processed: outcomes.length, outcomes });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown scheduled fallback error";
      return res.status(500).json({
        error: message,
        context: { path: "/api/scheduled/meeting-fallback" },
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  return { app, server };
}

async function start() {
  const { app, server } = await createApp();

  // Railway, Render, Fly, and local all set PORT
  const port = parseInt(process.env.PORT || "3000", 10);

  // On Vercel we skip listen (serverless)
  if (process.env.VERCEL) {
    console.log("[ISEYC] Vercel serverless mode – exporting handler only");
    return app;
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`[ISEYC] Server running on port ${port}`);
  });

  return app;
}

// Vercel serverless export
export default async function handler(req: any, res: any) {
  const app = await start();
  return app(req, res);
}

// Traditional hosts (Railway, Render, local)
if (!process.env.VERCEL) {
  start().catch((err) => {
    console.error("[ISEYC] Failed to start server:", err);
    process.exit(1);
  });
}
