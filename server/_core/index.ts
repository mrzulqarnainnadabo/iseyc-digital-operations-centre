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

  // Debug: log every request so Render Application logs always show activity
  app.use((req, _res, next) => {
    const hasAuth =
      typeof req.headers.authorization === "string" &&
      req.headers.authorization.startsWith("Bearer ");
    console.log(
      `[Req] ${req.method} ${req.path} authHeader=${hasAuth ? "yes" : "no"}`
    );
    next();
  });

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

  const port = parseInt(process.env.PORT || "3000", 10);

  // Startup diagnostics (no secrets printed)
  console.log("[Env] NODE_ENV=", process.env.NODE_ENV ?? "(unset)");
  console.log("[Env] SUPABASE_URL set=", Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL));
  console.log("[Env] SUPABASE_ANON_KEY set=", Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY));
  console.log("[Env] DATABASE_URL set=", Boolean(process.env.DATABASE_URL));
  console.log("[Env] SUPABASE_JWT_SECRET set=", Boolean(process.env.SUPABASE_JWT_SECRET));

  if (process.env.VERCEL) {
    console.log("[ISEYC] Vercel serverless mode – exporting handler only");
    return app;
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`[ISEYC] Server running on port ${port}`);
  });

  return app;
}

export default async function handler(req: any, res: any) {
  const app = await start();
  return app(req, res);
}

if (!process.env.VERCEL) {
  start().catch((err) => {
    console.error("[ISEYC] Failed to start server:", err);
    process.exit(1);
  });
}
