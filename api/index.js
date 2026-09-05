/**
 * Vercel entry. Prefer built handler; fall back to dynamic import.
 */
import built from "./_handler.mjs";

export default async function handler(req, res) {
  return built(req, res);
}
