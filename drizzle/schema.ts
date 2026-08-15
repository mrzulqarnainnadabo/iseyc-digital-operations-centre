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
  docRole: mysqlEnum("docRole", ["member", "officer", "administrator", "presidential_council", "national_president"]).default("member").notNull(),
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

export const institutionalPrompts = mysqlTable(
  "institutional_prompts",
  {
    id: int("id").autoincrement().primaryKey(),
    promptKey: varchar("promptKey", { length: 100 }).notNull(),
    version: varchar("version", { length: 64 }).notNull(),
    content: longtext("content").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    updatedByUserId: int("updatedByUserId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("institutional_prompt_key_idx").on(table.promptKey), index("institutional_prompt_active_idx").on(table.isActive)],
);

export const commandBriefRuns = mysqlTable(
  "command_brief_runs",
  {
    id: int("id").autoincrement().primaryKey(),
    coverageStart: datetime("coverageStart").notNull(),
    coverageEnd: datetime("coverageEnd").notNull(),
    sourceSummary: longtext("sourceSummary").notNull(),
    draftBody: longtext("draftBody"),
    status: mysqlEnum("status", ["source_pending", "draft_ready", "under_review", "approved_for_internal_use", "withheld_for_review", "archived"]).default("source_pending").notNull(),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    generatedByUserId: int("generatedByUserId").notNull(),
    reviewedByUserId: int("reviewedByUserId"),
    reviewedAt: datetime("reviewedAt"),
    statusReason: text("statusReason"),
    promptVersion: varchar("promptVersion", { length: 64 }).default("ISEYC-PCB-DOC-1.0").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("command_brief_status_idx").on(table.status), index("command_brief_test_idx").on(table.isTestMode), index("command_brief_created_idx").on(table.createdAt)],
);

export const contentDrafts = mysqlTable(
  "content_drafts",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 512 }).notNull(),
    requestType: mysqlEnum("requestType", ["platform_draft", "response_suggestion", "outreach_research", "calendar_item", "internal_brief"]).notNull(),
    objective: text("objective").notNull(),
    intendedAudience: varchar("intendedAudience", { length: 255 }).notNull(),
    channelsJson: json("channelsJson").notNull(),
    sourceReference: text("sourceReference").notNull(),
    sourceMaterial: longtext("sourceMaterial").notNull(),
    sourceApprovalStatus: mysqlEnum("sourceApprovalStatus", ["approved_external", "approved_internal", "pending_confirmation", "restricted"]).default("pending_confirmation").notNull(),
    sensitivity: mysqlEnum("sensitivity", ["public", "internal", "confidential", "restricted"]).default("internal").notNull(),
    status: mysqlEnum("status", ["research_requested", "source_pending_approval", "draft_ready", "revision_requested", "approved_for_publication", "withheld_for_governance_review", "archived"]).default("source_pending_approval").notNull(),
    draftJson: json("draftJson"),
    contentOwnerUserId: int("contentOwnerUserId").notNull(),
    requiredReviewerUserId: int("requiredReviewerUserId"),
    targetDate: datetime("targetDate"),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    publicationPerformed: boolean("publicationPerformed").default(false).notNull(),
    promptVersion: varchar("promptVersion", { length: 64 }).default("ISEYC-MEDIA-DOC-1.0").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("content_draft_status_idx").on(table.status), index("content_draft_test_idx").on(table.isTestMode), index("content_draft_owner_idx").on(table.contentOwnerUserId)],
);

export const docAuditLog = mysqlTable(
  "doc_audit_log",
  {
    id: int("id").autoincrement().primaryKey(),
    moduleKey: varchar("moduleKey", { length: 100 }).notNull(),
    recordId: int("recordId").notNull(),
    actorUserId: int("actorUserId"),
    eventType: varchar("eventType", { length: 100 }).notNull(),
    detail: text("detail"),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("doc_audit_module_record_idx").on(table.moduleKey, table.recordId), index("doc_audit_created_idx").on(table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
