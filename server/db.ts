import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { developmentalProfiles, InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
//
// `prepare: false` is required when DATABASE_URL points at Supabase's
// connection pooler (Supavisor/PgBouncer) in transaction mode (port 6543) —
// that mode doesn't support prepared statements. It's harmless against a
// direct connection (port 5432) too, so it's left on unconditionally.
function normalizeDatabaseUrl(raw: string): string {
  const url = raw.trim();
  // Supabase requires SSL; pooler works with prepare: false (set below).
  if (url.includes("sslmode=")) return url;
  return url.includes("?") ? `${url}&sslmode=require` : `${url}?sslmode=require`;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL);
      const client = postgres(connectionString, { prepare: false });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
