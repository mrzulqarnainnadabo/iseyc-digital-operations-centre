import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { cronAuth } from "./sdk";
import { isRegisteredFallbackTask, processDueSubmissions } from "../meeting/service";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

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

// Create the app once
let appInstance: express.Express | null = null;

async function getApp() {
  if (!appInstance) {
    const { app, server } = await createApp();
    appInstance = app;

    // Only listen when NOT on Vercel
    if (!process.env.VERCEL) {
      const preferredPort = parseInt(process.env.PORT || "3000");
      const port = await findAvailablePort(preferredPort);
      if (port !== preferredPort) {
        console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
      }
      server.listen(port, () => {
        console.log(`Server running on http://localhost:${port}/`);
      });
    } else {
      console.log("[ISEYC] Vercel serverless mode – no listen()");
    }
  }
  return appInstance;
}

// Vercel serverless handler
export default async function handler(req: any, res: any) {
  const app = await getApp();
  return app(req, res);
}

// For local `node dist/index.js`
if (!process.env.VERCEL) {
  getApp().catch(err => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}
