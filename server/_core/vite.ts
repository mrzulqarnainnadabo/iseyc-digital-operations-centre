import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

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

      // always reload the index.html file from disk incase it changes
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
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // The transparent production proxy can acknowledge streamed static files while never
  // completing their body. Buffering the requested asset and setting Content-Length
  // explicitly keeps document, script, and stylesheet delivery deterministic.
  app.use("*", async (_req, res, next) => {
    try {
      const requestPath = decodeURIComponent(_req.path);
      const requestedFile = path.resolve(distPath, `.${requestPath}`);
      if (requestedFile.startsWith(`${distPath}${path.sep}`) && fs.existsSync(requestedFile) && fs.statSync(requestedFile).isFile()) {
        await sendStaticFile(res, requestedFile);
        return;
      }
      await sendStaticIndex(res, distPath);
    } catch (error) {
      next(error);
    }
  });
}

export async function sendStaticIndex(res: { status: (statusCode: number) => { set: (headers: Record<string, string | number>) => { end: (body: Buffer) => unknown } } }, distPath: string) {
  return sendStaticFile(res, path.resolve(distPath, "index.html"));
}

const staticMimeTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

export async function sendStaticFile(res: { status: (statusCode: number) => { set: (headers: Record<string, string | number>) => { end: (body: Buffer) => unknown } } }, filePath: string) {
  const body = await fs.promises.readFile(filePath);
  const contentType = staticMimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  return res.status(200).set({ "Content-Type": contentType, "Content-Length": body.byteLength }).end(body);
}
