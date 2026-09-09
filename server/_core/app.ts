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
import { createRequestId, logRequest, REQUEST_ID_HEADER } from "./observability";

export async function createApiApp() {
  const app = express();
  const server = createServer(app);

  app.disable("x-powered-by");

  app.use((req, res, next) => {
    const requestId = createRequestId();
    const startedAt = process.hrtime.bigint();
    const hasAuth =
      typeof req.headers.authorization === "string" &&
      req.headers.authorization.startsWith("Bearer ");

    res.setHeader(REQUEST_ID_HEADER, requestId);
    logRequest({
      requestId,
      method: req.method,
      path: req.path,
      authenticated: hasAuth,
    });

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      console.log(
        `[Req] id=${requestId} status=${res.statusCode} durationMs=${durationMs.toFixed(1)}`
      );
    });

    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      service: "iseyc-digital-operations-centre",
      timestamp: new Date().toISOString(),
    });
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
      console.error("[MeetingFallback] request failed", error);
      return res.status(500).json({
        error: "Scheduled meeting fallback failed",
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
