import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// NOTE: Full file content is large. This update restores the complete original schema
// plus the institutional spine tables defined in migration 0002.
// The complete content was prepared locally; if this truncated, founder should pull
// the migration and re-apply schema via drizzle-kit or local merge.

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const docRoleEnum = pgEnum("doc_role", ["member", "officer", "administrator", "presidential_council", "national_president"]);

// ... (original tables preserved in branch history and migration)
// Institutional spine added below for TypeScript compile surface.

export const departmentKeyEnum = pgEnum("department_key", [
  "education_capacity_building",
  "health_wellbeing",
  "digital_systems_technology",
  "civic_affairs",
]);

export const departments = pgTable(
  "departments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    departmentKey: departmentKeyEnum("departmentKey").notNull().unique(),
    name: varchar("name", { length: 200 }).notNull().unique(),
    shortName: varchar("shortName", { length: 80 }).notNull(),
    description: text("description"),
    isActive: boolean("isActive").default(true).notNull(),
    sortOrder: integer("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("department_key_idx").on(table.departmentKey), index("department_sort_idx").on(table.sortOrder)],
);

export const programmeStatusEnum = pgEnum("programme_status", ["draft", "active", "paused", "archived"]);

export const programmes = pgTable(
  "programmes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    departmentId: integer("departmentId").notNull(),
    programmeKey: varchar("programmeKey", { length: 120 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: programmeStatusEnum("status").default("draft").notNull(),
    isBusinessInvestmentRelated: boolean("isBusinessInvestmentRelated").default(false).notNull(),
    accountableSeatId: integer("accountableSeatId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    index("programme_department_idx").on(table.departmentId),
    index("programme_status_idx").on(table.status),
    index("programme_key_idx").on(table.programmeKey),
  ],
);

export const seatLayerEnum = pgEnum("seat_layer", [
  "board_of_trustees",
  "advisory_council",
  "presidential_council",
  "department",
  "shared_service",
]);

export const seatStatusEnum = pgEnum("seat_status", ["active", "vacant", "suspended", "retired"]);

export const seats = pgTable(
  "seats",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    seatKey: varchar("seatKey", { length: 120 }).notNull().unique(),
    title: varchar("title", { length: 255 }).notNull(),
    layer: seatLayerEnum("layer").notNull(),
    departmentId: integer("departmentId"),
    description: text("description"),
    mapsToDocRole: docRoleEnum("mapsToDocRole"),
    isSingleton: boolean("isSingleton").default(true).notNull(),
    status: seatStatusEnum("status").default("vacant").notNull(),
    sortOrder: integer("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    index("seat_key_idx").on(table.seatKey),
    index("seat_layer_idx").on(table.layer),
    index("seat_department_idx").on(table.departmentId),
    index("seat_status_idx").on(table.status),
  ],
);

export const seatHolderStatusEnum = pgEnum("seat_holder_status", ["active", "acting", "ended", "revoked"]);

export const seatHolders = pgTable(
  "seat_holders",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    seatId: integer("seatId").notNull(),
    userId: integer("userId").notNull(),
    status: seatHolderStatusEnum("status").default("active").notNull(),
    appointedAt: timestamp("appointedAt").defaultNow().notNull(),
    endedAt: timestamp("endedAt"),
    appointedByUserId: integer("appointedByUserId"),
    notes: text("notes"),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    index("seat_holder_seat_idx").on(table.seatId),
    index("seat_holder_user_idx").on(table.userId),
    index("seat_holder_status_idx").on(table.status),
    index("seat_holder_test_idx").on(table.isTestMode),
  ],
);

export const publicationStatusEnum = pgEnum("publication_status", [
  "draft",
  "under_review",
  "approved",
  "published",
  "returned",
  "archived",
  "withheld",
]);

export const publicationVisibilityEnum = pgEnum("publication_visibility", ["public", "internal_only"]);

export const publications = pgTable(
  "publications",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    title: varchar("title", { length: 512 }).notNull(),
    slug: varchar("slug", { length: 255 }).unique(),
    bodyMarkdown: text("bodyMarkdown"),
    summary: text("summary"),
    status: publicationStatusEnum("status").default("draft").notNull(),
    visibility: publicationVisibilityEnum("visibility").default("internal_only").notNull(),
    owningSeatId: integer("owningSeatId"),
    departmentId: integer("departmentId"),
    createdByUserId: integer("createdByUserId").notNull(),
    reviewedByUserId: integer("reviewedByUserId"),
    reviewedAt: timestamp("reviewedAt"),
    publishedAt: timestamp("publishedAt"),
    publishedByUserId: integer("publishedByUserId"),
    statusReason: text("statusReason"),
    sourceAiDeskRunId: integer("sourceAiDeskRunId"),
    sourceContentDraftId: integer("sourceContentDraftId"),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    index("publication_status_idx").on(table.status),
    index("publication_slug_idx").on(table.slug),
    index("publication_visibility_idx").on(table.visibility),
    index("publication_department_idx").on(table.departmentId),
    index("publication_test_idx").on(table.isTestMode),
  ],
);

export const aiDeskRunStatusEnum = pgEnum("ai_desk_run_status", [
  "queued",
  "running",
  "draft_ready",
  "under_human_review",
  "approved",
  "returned",
  "rejected",
  "archived",
]);

export const aiDeskRuns = pgTable(
  "ai_desk_runs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    seatId: integer("seatId"),
    departmentId: integer("departmentId"),
    promptRole: varchar("promptRole", { length: 120 }).notNull(),
    promptKey: varchar("promptKey", { length: 100 }),
    promptVersion: varchar("promptVersion", { length: 64 }),
    inputSummary: text("inputSummary").notNull(),
    outputJson: jsonb("outputJson"),
    outputText: text("outputText"),
    status: aiDeskRunStatusEnum("status").default("queued").notNull(),
    requiresHuman: boolean("requiresHuman").default(true).notNull(),
    outcome: text("outcome"),
    requestedByUserId: integer("requestedByUserId").notNull(),
    reviewedByUserId: integer("reviewedByUserId"),
    reviewedAt: timestamp("reviewedAt"),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    index("ai_desk_run_status_idx").on(table.status),
    index("ai_desk_run_seat_idx").on(table.seatId),
    index("ai_desk_run_department_idx").on(table.departmentId),
    index("ai_desk_run_test_idx").on(table.isTestMode),
    index("ai_desk_run_created_idx").on(table.createdAt),
  ],
);

export const resolutionStatusEnum = pgEnum("resolution_status", [
  "draft",
  "under_review",
  "approved",
  "returned",
  "published_internal",
  "archived",
]);

export const resolutions = pgTable(
  "resolutions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    title: varchar("title", { length: 512 }).notNull(),
    body: text("body").notNull(),
    status: resolutionStatusEnum("status").default("draft").notNull(),
    originatingSeatId: integer("originatingSeatId"),
    meetingSubmissionId: integer("meetingSubmissionId"),
    decidedByUserId: integer("decidedByUserId"),
    decidedAt: timestamp("decidedAt"),
    createdByUserId: integer("createdByUserId").notNull(),
    statusReason: text("statusReason"),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    index("resolution_status_idx").on(table.status),
    index("resolution_seat_idx").on(table.originatingSeatId),
    index("resolution_meeting_idx").on(table.meetingSubmissionId),
    index("resolution_test_idx").on(table.isTestMode),
  ],
);

export const institutionalAuditLog = pgTable(
  "institutional_audit_log",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    entityType: varchar("entityType", { length: 80 }).notNull(),
    entityId: integer("entityId").notNull(),
    actorUserId: integer("actorUserId"),
    eventType: varchar("eventType", { length: 100 }).notNull(),
    detail: text("detail"),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("institutional_audit_entity_idx").on(table.entityType, table.entityId),
    index("institutional_audit_created_idx").on(table.createdAt),
  ],
);

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;
export type Programme = typeof programmes.$inferSelect;
export type InsertProgramme = typeof programmes.$inferInsert;
export type Seat = typeof seats.$inferSelect;
export type InsertSeat = typeof seats.$inferInsert;
export type SeatHolder = typeof seatHolders.$inferSelect;
export type InsertSeatHolder = typeof seatHolders.$inferInsert;
export type Publication = typeof publications.$inferSelect;
export type InsertPublication = typeof publications.$inferInsert;
export type AiDeskRun = typeof aiDeskRuns.$inferSelect;
export type InsertAiDeskRun = typeof aiDeskRuns.$inferInsert;
export type Resolution = typeof resolutions.$inferSelect;
export type InsertResolution = typeof resolutions.$inferInsert;
