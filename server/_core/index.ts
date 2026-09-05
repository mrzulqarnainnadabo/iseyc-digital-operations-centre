import { createApiApp } from "./app";

export async function createApp(options: { serveClient?: boolean } = {}) {
  const { serveClient = true } = options;
  const { app, server } = await createApiApp();

  // Client serving only for full Node hosts (Railway/Render/local).
  // Vercel uses createApiApp via vercel-api.ts and never imports this path.
  if (serveClient) {
    if (process.env.NODE_ENV === "development") {
      const { setupVite } = await import("./vite");
      await setupVite(app, server);
    } else {
      const { serveStatic } = await import("./vite");
      serveStatic(app);
    }
  }

  return { app, server };
}

async function start() {
  const { app, server } = await createApp();

  const port = parseInt(process.env.PORT || "3000", 10);

  console.log("[Env] NODE_ENV=", process.env.NODE_ENV ?? "(unset)");
  console.log(
    "[Env] SUPABASE_URL set=",
    Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)
  );
  console.log(
    "[Env] SUPABASE_ANON_KEY set=",
    Boolean(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)
  );
  console.log("[Env] DATABASE_URL set=", Boolean(process.env.DATABASE_URL));
  console.log(
    "[Env] SUPABASE_JWT_SECRET set=",
    Boolean(process.env.SUPABASE_JWT_SECRET)
  );

  const dbUrl = (process.env.DATABASE_URL ?? "").trim();
  if (!dbUrl) {
    console.error("[Env] DATABASE_URL is empty");
  } else if (!/^postgres(ql)?:\/\//i.test(dbUrl)) {
    console.error(
      "[Env] DATABASE_URL is set but does not start with postgresql://"
    );
  } else {
    try {
      const u = new URL(dbUrl);
      console.log(
        `[Env] DATABASE_URL ok host=${u.hostname} port=${u.port || "(default)"} db=${u.pathname}`
      );
    } catch {
      console.error("[Env] DATABASE_URL is not a valid URL");
    }
  }

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
