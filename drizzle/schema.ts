import {
  boolean,
  datetime,
  index,
  int,
  json,
  longtext,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isAuthorizedOfficer: boolean("isAuthorizedOfficer").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const meetingStatusValues = [
  "pending_consolidation",
  "processing",
  "draft_ready",
  "under_review",
  "approved",
  "needs_human_review",
  "blocked",
] as const;

export const meetingSubmissions = mysqlTable(
  "meeting_submissions",
  {
    id: int("id").autoincrement().primaryKey(),
    meetingTitle: varchar("meetingTitle", { length: 512 }).notNull(),
    meetingDate: varchar("meetingDate", { length: 64 }),
    conveningBody: varchar("conveningBody", { length: 255 }),
    sensitivity: mysqlEnum("sensitivity", ["public", "internal", "confidential", "restricted", "not_recorded"])
      .default("internal")
      .notNull(),
    sourceGroupKey: varchar("sourceGroupKey", { length: 160 }).notNull(),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    status: mysqlEnum("status", meetingStatusValues).default("pending_consolidation").notNull(),
    statusReason: text("statusReason"),
    submittedByUserId: int("submittedByUserId").notNull(),
    approvedByUserId: int("approvedByUserId"),
    approvedAt: datetime("approvedAt"),
    consolidationEligibleAt: datetime("consolidationEligibleAt").notNull(),
    processingAttemptedAt: datetime("processingAttemptedAt"),
    recordJson: json("recordJson"),
    authoritativePromptVersion: varchar("authoritativePromptVersion", { length: 64 })
      .default("ISEYC-MDT-1.0")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("meeting_submission_status_idx").on(table.status),
    index("meeting_submission_due_idx").on(table.consolidationEligibleAt),
    index("meeting_submission_group_idx").on(table.sourceGroupKey),
    index("meeting_submission_submitter_idx").on(table.submittedByUserId),
    index("meeting_submission_test_idx").on(table.isTestMode),
  ],
);

export const meetingFiles = mysqlTable(
  "meeting_files",
  {
    id: int("id").autoincrement().primaryKey(),
    submissionId: int("submissionId").notNull(),
    originalName: varchar("originalName", { length: 512 }).notNull(),
    documentType: mysqlEnum("documentType", ["agenda", "minutes", "notes", "transcript", "decision_log", "action_list", "other"])
      .default("other")
      .notNull(),
    mimeType: varchar("mimeType", { length: 255 }).notNull(),
    fileSizeBytes: int("fileSizeBytes").notNull(),
    storageKey: varchar("storageKey", { length: 1024 }).notNull(),
    storageUrl: varchar("storageUrl", { length: 1024 }).notNull(),
    extractedText: longtext("extractedText"),
    uploadedByUserId: int("uploadedByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("meeting_file_submission_idx").on(table.submissionId)],
);

export const meetingRecordReviews = mysqlTable(
  "meeting_record_reviews",
  {
    id: int("id").autoincrement().primaryKey(),
    submissionId: int("submissionId").notNull(),
    sectionKey: varchar("sectionKey", { length: 100 }).notNull(),
    decision: mysqlEnum("decision", ["approved", "revision_requested", "rejected"]).notNull(),
    reviewNote: text("reviewNote"),
    reviewerUserId: int("reviewerUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("meeting_review_submission_idx").on(table.submissionId)],
);

export const meetingActionItems = mysqlTable(
  "meeting_action_items",
  {
    id: int("id").autoincrement().primaryKey(),
    submissionId: int("submissionId").notNull(),
    actionDescription: text("actionDescription").notNull(),
    accountableOwner: varchar("accountableOwner", { length: 255 }).notNull(),
    supportingParties: text("supportingParties"),
    dueDate: varchar("dueDate", { length: 64 }),
    sourceStatus: varchar("sourceStatus", { length: 64 }).notNull(),
    dependency: text("dependency"),
    evidenceLocation: varchar("evidenceLocation", { length: 512 }),
    confirmationStatus: mysqlEnum("confirmationStatus", ["draft", "confirmed"]).default("draft").notNull(),
    confirmedByUserId: int("confirmedByUserId"),
    confirmedAt: datetime("confirmedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("meeting_action_submission_idx").on(table.submissionId)],
);

export const meetingAuditLog = mysqlTable(
  "meeting_audit_log",
  {
    id: int("id").autoincrement().primaryKey(),
    submissionId: int("submissionId").notNull(),
    actorUserId: int("actorUserId"),
    eventType: varchar("eventType", { length: 100 }).notNull(),
    detail: text("detail"),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("meeting_audit_submission_idx").on(table.submissionId)],
);

export const meetingAutomationSettings = mysqlTable("meeting_automation_settings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  consolidationMinutes: int("consolidationMinutes").default(12).notNull(),
  fallbackCronExpression: varchar("fallbackCronExpression", { length: 64 }).default("0 */15 * * * *").notNull(),
  fallbackCronTaskUid: varchar("fallbackCronTaskUid", { length: 65 }),
  fallbackEnabled: boolean("fallbackEnabled").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
