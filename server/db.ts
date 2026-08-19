import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { developmentalProfiles, InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.authUserId) {
    throw new Error("User authUserId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      authUserId: user.authUserId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.authUserId === ENV.ownerAuthUserId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (user.isAuthorizedOfficer !== undefined) {
      values.isAuthorizedOfficer = user.isAuthorizedOfficer;
      updateSet.isAuthorizedOfficer = user.isAuthorizedOfficer;
    } else if (user.authUserId === ENV.ownerAuthUserId) {
      values.isAuthorizedOfficer = true;
      updateSet.isAuthorizedOfficer = true;
    }

    if (user.docRole !== undefined) {
      values.docRole = user.docRole;
      updateSet.docRole = user.docRole;
    } else if (user.authUserId === ENV.ownerAuthUserId) {
      values.docRole = "national_president";
      updateSet.docRole = "national_president";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });

    const persisted = await db.select({ id: users.id }).from(users).where(eq(users.authUserId, user.authUserId)).limit(1);
    if (persisted[0]) {
      await db.insert(developmentalProfiles).values({ userId: persisted[0].id }).onDuplicateKeyUpdate({
        set: { userId: persisted[0].id },
      });
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByAuthUserId(authUserId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.authUserId, authUserId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.
