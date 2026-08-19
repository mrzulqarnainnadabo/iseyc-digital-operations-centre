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
  authUserId: varchar("authUserId", { length: 64 }).notNull().unique(),
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

export const developmentalProfiles = mysqlTable(
  "developmental_profiles",
  {
    userId: int("userId").primaryKey(),
    consentStatus: mysqlEnum("consentStatus", ["not_requested", "active", "withdrawn"]).default("not_requested").notNull(),
    consentedAt: datetime("consentedAt"),
    consentVersion: varchar("consentVersion", { length: 64 }),
    visibilityLevel: mysqlEnum("visibilityLevel", ["private", "mentor_guided", "institutional_limited"]).default("private").notNull(),
    developmentDirection: json("developmentDirection"),
    developmentGoals: text("developmentGoals"),
    mentoringPreference: mysqlEnum("mentoringPreference", ["not_selected", "open_to_mentoring", "seeking_mentor", "mentoring_others", "not_now"]).default("not_selected").notNull(),
    mentorUserId: int("mentorUserId"),
    profileStatus: mysqlEnum("profileStatus", ["not_started", "active", "paused"]).default("not_started").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("developmental_profile_consent_idx").on(table.consentStatus), index("developmental_profile_mentor_idx").on(table.mentorUserId)],
);

export const communityTiers = mysqlTable(
  "community_tiers",
  {
    id: int("id").autoincrement().primaryKey(),
    tierKey: varchar("tierKey", { length: 80 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull().unique(),
    hierarchyOrder: int("hierarchyOrder").notNull(),
    description: text("description"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("community_tier_order_idx").on(table.hierarchyOrder)],
);

export const responsibilityPillars = mysqlTable(
  "responsibility_pillars",
  {
    id: int("id").autoincrement().primaryKey(),
    pillarKey: varchar("pillarKey", { length: 100 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull().unique(),
    responsibilityOrder: int("responsibilityOrder").notNull(),
    description: text("description"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("responsibility_pillar_order_idx").on(table.responsibilityOrder)],
);

export const communityUnits = mysqlTable(
  "community_units",
  {
    id: int("id").autoincrement().primaryKey(),
    tierId: int("tierId").notNull(),
    parentUnitId: int("parentUnitId"),
    name: varchar("name", { length: 255 }).notNull(),
    locality: varchar("locality", { length: 255 }),
    accountableLeadUserId: int("accountableLeadUserId"),
    status: mysqlEnum("status", ["draft", "active", "paused", "archived"]).default("draft").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("community_unit_tier_idx").on(table.tierId), index("community_unit_parent_idx").on(table.parentUnitId), index("community_unit_status_idx").on(table.status)],
);

export const memberCommunityAffiliations = mysqlTable(
  "member_community_affiliations",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    communityUnitId: int("communityUnitId"),
    tierId: int("tierId").notNull(),
    affiliationStatus: mysqlEnum("affiliationStatus", ["self_declared", "confirmed", "inactive"]).default("self_declared").notNull(),
    confirmedByUserId: int("confirmedByUserId"),
    confirmedAt: datetime("confirmedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("member_affiliation_user_idx").on(table.userId), index("member_affiliation_tier_idx").on(table.tierId), index("member_affiliation_unit_idx").on(table.communityUnitId)],
);

export const memberPillarFocuses = mysqlTable(
  "member_pillar_focuses",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    pillarId: int("pillarId").notNull(),
    focusStatus: mysqlEnum("focusStatus", ["interested", "contributing", "mentored", "inactive"]).default("interested").notNull(),
    visibilityLevel: mysqlEnum("visibilityLevel", ["private", "mentor_guided", "institutional_limited"]).default("private").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("member_pillar_user_idx").on(table.userId), index("member_pillar_pillar_idx").on(table.pillarId)],
);

export const developmentParticipationRecords = mysqlTable(
  "development_participation_records",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    participationType: mysqlEnum("participationType", ["meeting_contribution", "community_contribution", "development_reflection", "department_activity"]).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    detail: text("detail"),
    sourceRecordId: int("sourceRecordId"),
    confirmedByUserId: int("confirmedByUserId"),
    confirmedAt: datetime("confirmedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("development_participation_user_idx").on(table.userId), index("development_participation_confirmed_idx").on(table.confirmedAt)],
);

export const mentorshipRelationships = mysqlTable(
  "mentorship_relationships",
  {
    id: int("id").autoincrement().primaryKey(),
    menteeUserId: int("menteeUserId").notNull(),
    mentorUserId: int("mentorUserId"),
    status: mysqlEnum("status", ["requested", "active", "paused", "completed", "declined"]).default("requested").notNull(),
    agreedFocus: text("agreedFocus"),
    approvedByUserId: int("approvedByUserId"),
    approvedAt: datetime("approvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("mentorship_mentee_idx").on(table.menteeUserId), index("mentorship_mentor_idx").on(table.mentorUserId), index("mentorship_status_idx").on(table.status)],
);

export const mentorshipCheckIns = mysqlTable(
  "mentorship_check_ins",
  {
    id: int("id").autoincrement().primaryKey(),
    relationshipId: int("relationshipId").notNull(),
    checkInDate: datetime("checkInDate").notNull(),
    memberReflection: text("memberReflection"),
    mentorGuidance: text("mentorGuidance"),
    nextStep: text("nextStep"),
    recordedByUserId: int("recordedByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("mentorship_checkin_relationship_idx").on(table.relationshipId), index("mentorship_checkin_date_idx").on(table.checkInDate)],
);

export const developmentGrowthPlans = mysqlTable(
  "development_growth_plans",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    focusPeriod: varchar("focusPeriod", { length: 120 }).notNull(),
    goalStatement: text("goalStatement").notNull(),
    nextAction: text("nextAction"),
    memberReflection: text("memberReflection"),
    status: mysqlEnum("status", ["draft", "active", "completed", "paused"]).default("draft").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("growth_plan_user_idx").on(table.userId), index("growth_plan_status_idx").on(table.status)],
);

export const chamberSessionStatusValues = ["draft", "scheduled", "open", "closed", "cancelled", "archived"] as const;

export const chamberSessions = mysqlTable(
  "chamber_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 512 }).notNull(),
    description: text("description"),
    sessionType: mysqlEnum("sessionType", ["internal_meeting", "visitor_session", "seminar"]).notNull(),
    conveningBody: varchar("conveningBody", { length: 255 }),
    chairUserId: int("chairUserId").notNull(),
    sensitivity: mysqlEnum("sensitivity", ["public", "internal", "confidential", "restricted"]).default("internal").notNull(),
    agendaJson: json("agendaJson"),
    scheduledStartAt: datetime("scheduledStartAt"),
    scheduledEndAt: datetime("scheduledEndAt"),
    status: mysqlEnum("status", chamberSessionStatusValues).default("draft").notNull(),
    linkedMeetingSubmissionId: int("linkedMeetingSubmissionId"),
    trackerLinkStatus: mysqlEnum("trackerLinkStatus", ["not_linked", "draft_requested", "linked"]).default("not_linked").notNull(),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("chamber_session_status_idx").on(table.status), index("chamber_session_chair_idx").on(table.chairUserId), index("chamber_session_test_idx").on(table.isTestMode), index("chamber_session_start_idx").on(table.scheduledStartAt)],
);

export const chamberParticipants = mysqlTable(
  "chamber_participants",
  {
    id: int("id").autoincrement().primaryKey(),
    sessionId: int("sessionId").notNull(),
    userId: int("userId"),
    invitedEmail: varchar("invitedEmail", { length: 320 }),
    displayName: varchar("displayName", { length: 255 }).notNull(),
    officialPosition: varchar("officialPosition", { length: 255 }).notNull(),
    participantType: mysqlEnum("participantType", ["internal", "authorised_visitor"]).default("internal").notNull(),
    sessionRole: mysqlEnum("sessionRole", ["chair", "presenter", "participant", "observer"]).default("participant").notNull(),
    admissionStatus: mysqlEnum("admissionStatus", ["invited", "admitted", "declined", "removed"]).default("invited").notNull(),
    admittedByUserId: int("admittedByUserId"),
    admittedAt: datetime("admittedAt"),
    joinedAt: datetime("joinedAt"),
    leftAt: datetime("leftAt"),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    addedByUserId: int("addedByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("chamber_participant_session_idx").on(table.sessionId), index("chamber_participant_user_idx").on(table.userId), index("chamber_participant_admission_idx").on(table.admissionStatus), index("chamber_participant_test_idx").on(table.isTestMode)],
);

export const chamberDocuments = mysqlTable(
  "chamber_documents",
  {
    id: int("id").autoincrement().primaryKey(),
    sessionId: int("sessionId").notNull(),
    originalName: varchar("originalName", { length: 512 }).notNull(),
    mimeType: varchar("mimeType", { length: 255 }).notNull(),
    fileSizeBytes: int("fileSizeBytes").notNull(),
    storageKey: varchar("storageKey", { length: 1024 }).notNull(),
    storageUrl: varchar("storageUrl", { length: 1024 }).notNull(),
    extractedText: longtext("extractedText"),
    intelligenceStatus: mysqlEnum("intelligenceStatus", ["source_ready", "analysis_requested", "analysis_draft_ready", "withheld_for_review"]).default("source_ready").notNull(),
    uploadedByUserId: int("uploadedByUserId").notNull(),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("chamber_document_session_idx").on(table.sessionId), index("chamber_document_status_idx").on(table.intelligenceStatus), index("chamber_document_test_idx").on(table.isTestMode)],
);

export const chamberDocumentIntelligenceDrafts = mysqlTable(
  "chamber_document_intelligence_drafts",
  {
    id: int("id").autoincrement().primaryKey(),
    sessionId: int("sessionId").notNull(),
    documentId: int("documentId").notNull(),
    promptVersion: varchar("promptVersion", { length: 64 }).notNull(),
    draftJson: json("draftJson"),
    status: mysqlEnum("status", ["analysis_requested", "draft_ready", "under_review", "approved_for_audio", "withheld_for_review"]).default("analysis_requested").notNull(),
    sourceSetConfirmed: boolean("sourceSetConfirmed").default(false).notNull(),
    requestedByUserId: int("requestedByUserId").notNull(),
    reviewedByUserId: int("reviewedByUserId"),
    reviewedAt: datetime("reviewedAt"),
    statusReason: text("statusReason"),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("chamber_intelligence_session_idx").on(table.sessionId),
    index("chamber_intelligence_document_idx").on(table.documentId),
    index("chamber_intelligence_status_idx").on(table.status),
    index("chamber_intelligence_test_idx").on(table.isTestMode),
  ],
);

export const chamberAuditLog = mysqlTable(
  "chamber_audit_log",
  {
    id: int("id").autoincrement().primaryKey(),
    sessionId: int("sessionId").notNull(),
    actorUserId: int("actorUserId"),
    eventType: varchar("eventType", { length: 100 }).notNull(),
    detail: text("detail"),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("chamber_audit_session_idx").on(table.sessionId), index("chamber_audit_created_idx").on(table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
