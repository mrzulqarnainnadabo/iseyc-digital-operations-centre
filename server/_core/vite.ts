import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export function resolveStaticDistPath(
  cwd: string = process.cwd(),
  explicitDist?: string,
  existsFn: (p: string) => boolean = fs.existsSync
): string {
  if (explicitDist) {
    const candidatePublic = path.resolve(explicitDist, "public");
    if (existsFn(path.resolve(candidatePublic, "index.html"))) {
      return candidatePublic;
    }
    if (existsFn(path.resolve(explicitDist, "index.html"))) {
      return explicitDist;
    }
  }

  const candidatePublic = path.resolve(cwd, "dist", "public");
  if (existsFn(path.resolve(candidatePublic, "index.html"))) {
    return candidatePublic;
  }

  return path.resolve(cwd, "dist");
}

export async function sendStaticIndex(
  res: any,
  distPath: string,
  readFileFn: (p: string) => Promise<Buffer> = fs.promises.readFile as any
): Promise<void> {
  const indexPath = path.resolve(distPath, "index.html");
  const buffer = await readFileFn(indexPath);

  const responseObj = res.status ? res.status(200) : res;
  const target = responseObj && typeof responseObj.set === "function" ? responseObj : res;

  target
    .set({
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": buffer.byteLength,
      "Cache-Control": "no-store, max-age=0",
    })
    .end(buffer);
}

export async function sendStaticFile(
  res: any,
  filePath: string,
  readFileFn: (p: string) => Promise<Buffer> = fs.promises.readFile as any
): Promise<void> {
  const buffer = await readFileFn(filePath);
  const ext = path.extname(filePath).toLowerCase();

  let contentType = "application/octet-stream";
  if (ext === ".js" || ext === ".mjs") contentType = "application/javascript; charset=utf-8";
  else if (ext === ".css") contentType = "text/css; charset=utf-8";
  else if (ext === ".html") contentType = "text/html; charset=utf-8";
  else if (ext === ".json") contentType = "application/json; charset=utf-8";
  else if (ext === ".svg") contentType = "image/svg+xml";

  const responseObj = res.status ? res.status(200) : res;
  const target = responseObj && typeof responseObj.set === "function" ? responseObj : res;

  target
    .set({
      "Content-Type": contentType,
      "Content-Length": buffer.byteLength,
      "Cache-Control": "public, max-age=31536000, immutable",
    })
    .end(buffer);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = resolveStaticDistPath();
  const indexPath = path.resolve(distPath, "index.html");

  console.log(`[Static] distPath=${distPath} indexExists=${fs.existsSync(indexPath)}`);

  if (!fs.existsSync(indexPath)) {
    throw new Error(`Could not find the built client index at ${indexPath}`);
  }

  // Standard, reliable static file serving for assets
  app.use(
    express.static(distPath, {
      maxAge: "1y",
      immutable: true,
      index: false,
    })
  );

  // SPA fallback – any non-file route returns index.html using sendStaticIndex
  app.get("*", async (_req, res, next) => {
    try {
      await sendStaticIndex(res, distPath);
    } catch (err) {
      next(err);
    }
  });
}
