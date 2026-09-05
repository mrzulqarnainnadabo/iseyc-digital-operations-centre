/** Placeholder — overwritten by `npm run build` (esbuild vercel-api). */
export default async function handler(_req, res) {
  res.status(503).json({
    error: "ISEYC DOC API bundle missing",
    hint: "Build did not emit api/_handler.mjs",
  });
}
