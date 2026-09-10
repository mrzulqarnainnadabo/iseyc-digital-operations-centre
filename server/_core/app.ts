import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { cronAuth } from "./sdk";
import { isRegisteredFallbackTask, processDueSubmissions } from "../meeting/service";
import { getDb } from "../db";

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

  app.get("/api/health", async (_req, res) => {
    let dbStatus: "ok" | "down" = "down";
    try {
      const db = await getDb();
      if (db) {
        dbStatus = "ok";
      }
    } catch {
      dbStatus = "down";
    }

    const isOk = dbStatus === "ok";
    return res.status(isOk ? 200 : 503).json({
      status: isOk ? "ok" : "degraded",
      service: "iseyc-digital-operations-centre",
      application: {
        api: "ok",
        database: dbStatus,
      },
      generatedAt: new Date().toISOString(),
    });
  });

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
