/**
 * API-only Express app (no Vite / static client).
 * Used by Vercel serverless entry so the bundle never touches vite/rollup/lightningcss.
 */
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { cronAuth } from "./sdk";
import { isRegisteredFallbackTask, processDueSubmissions } from "../meeting/service";

export async function createApiApp() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

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
      const message =
        error instanceof Error ? error.message : "Unknown scheduled fallback error";
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

  return { app, server };
}
