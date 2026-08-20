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

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const docRoleEnum = pgEnum("doc_role", ["member", "officer", "administrator", "presidential_council", "national_president"]);

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  authUserId: varchar("authUserId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  docRole: docRoleEnum("docRole").default("member").notNull(),
  isAuthorizedOfficer: boolean("isAuthorizedOfficer").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
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
export const meetingSubmissionStatusEnum = pgEnum("meeting_submission_status", meetingStatusValues);
export const meetingSubmissionSensitivityEnum = pgEnum("meeting_submission_sensitivity", ["public", "internal", "confidential", "restricted", "not_recorded"]);

export const meetingSubmissions = pgTable(
  "meeting_submissions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    meetingTitle: varchar("meetingTitle", { length: 512 }).notNull(),
    meetingDate: varchar("meetingDate", { length: 64 }),
    conveningBody: varchar("conveningBody", { length: 255 }),
    sensitivity: meetingSubmissionSensitivityEnum("sensitivity").default("internal").notNull(),
    sourceGroupKey: varchar("sourceGroupKey", { length: 160 }).notNull(),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    status: meetingSubmissionStatusEnum("status").default("pending_consolidation").notNull(),
    statusReason: text("statusReason"),
    submittedByUserId: integer("submittedByUserId").notNull(),
    approvedByUserId: integer("approvedByUserId"),
    approvedAt: timestamp("approvedAt"),
    consolidationEligibleAt: timestamp("consolidationEligibleAt").notNull(),
    processingAttemptedAt: timestamp("processingAttemptedAt"),
    recordJson: jsonb("recordJson"),
    authoritativePromptVersion: varchar("authoritativePromptVersion", { length: 64 })
      .default("ISEYC-MDT-1.0")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    index("meeting_submission_status_idx").on(table.status),
    index("meeting_submission_due_idx").on(table.consolidationEligibleAt),
    index("meeting_submission_group_idx").on(table.sourceGroupKey),
    index("meeting_submission_submitter_idx").on(table.submittedByUserId),
    index("meeting_submission_test_idx").on(table.isTestMode),
  ],
);

export const meetingFileDocumentTypeEnum = pgEnum("meeting_file_document_type", ["agenda", "minutes", "notes", "transcript", "decision_log", "action_list", "other"]);

export const meetingFiles = pgTable(
  "meeting_files",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    submissionId: integer("submissionId").notNull(),
    originalName: varchar("originalName", { length: 512 }).notNull(),
    documentType: meetingFileDocumentTypeEnum("documentType").default("other").notNull(),
    mimeType: varchar("mimeType", { length: 255 }).notNull(),
    fileSizeBytes: integer("fileSizeBytes").notNull(),
    storageKey: varchar("storageKey", { length: 1024 }).notNull(),
    storageUrl: varchar("storageUrl", { length: 1024 }).notNull(),
    extractedText: text("extractedText"),
    uploadedByUserId: integer("uploadedByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("meeting_file_submission_idx").on(table.submissionId)],
);

export const meetingRecordReviewDecisionEnum = pgEnum("meeting_record_review_decision", ["approved", "revision_requested", "rejected"]);

export const meetingRecordReviews = pgTable(
  "meeting_record_reviews",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    submissionId: integer("submissionId").notNull(),
    sectionKey: varchar("sectionKey", { length: 100 }).notNull(),
    decision: meetingRecordReviewDecisionEnum("decision").notNull(),
    reviewNote: text("reviewNote"),
    reviewerUserId: integer("reviewerUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("meeting_review_submission_idx").on(table.submissionId)],
);

export const meetingActionItemConfirmationStatusEnum = pgEnum("meeting_action_item_confirmation_status", ["draft", "confirmed"]);

export const meetingActionItems = pgTable(
  "meeting_action_items",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    submissionId: integer("submissionId").notNull(),
    actionDescription: text("actionDescription").notNull(),
    accountableOwner: varchar("accountableOwner", { length: 255 }).notNull(),
    supportingParties: text("supportingParties"),
    dueDate: varchar("dueDate", { length: 64 }),
    sourceStatus: varchar("sourceStatus", { length: 64 }).notNull(),
    dependency: text("dependency"),
    evidenceLocation: varchar("evidenceLocation", { length: 512 }),
    confirmationStatus: meetingActionItemConfirmationStatusEnum("confirmationStatus").default("draft").notNull(),
    confirmedByUserId: integer("confirmedByUserId"),
    confirmedAt: timestamp("confirmedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("meeting_action_submission_idx").on(table.submissionId)],
);

export const meetingAuditLog = pgTable(
  "meeting_audit_log",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    submissionId: integer("submissionId").notNull(),
    actorUserId: integer("actorUserId"),
    eventType: varchar("eventType", { length: 100 }).notNull(),
    detail: text("detail"),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("meeting_audit_submission_idx").on(table.submissionId)],
);

export const meetingAutomationSettings = pgTable("meeting_automation_settings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  consolidationMinutes: integer("consolidationMinutes").default(12).notNull(),
  fallbackCronExpression: varchar("fallbackCronExpression", { length: 64 }).default("0 */15 * * * *").notNull(),
  fallbackCronTaskUid: varchar("fallbackCronTaskUid", { length: 65 }),
  fallbackEnabled: boolean("fallbackEnabled").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const institutionalPrompts = pgTable(
  "institutional_prompts",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    promptKey: varchar("promptKey", { length: 100 }).notNull(),
    version: varchar("version", { length: 64 }).notNull(),
    content: text("content").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    updatedByUserId: integer("updatedByUserId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("institutional_prompt_key_idx").on(table.promptKey), index("institutional_prompt_active_idx").on(table.isActive)],
);

export const commandBriefRunStatusEnum = pgEnum("command_brief_run_status", ["source_pending", "draft_ready", "under_review", "approved_for_internal_use", "withheld_for_review", "archived"]);

export const commandBriefRuns = pgTable(
  "command_brief_runs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    coverageStart: timestamp("coverageStart").notNull(),
    coverageEnd: timestamp("coverageEnd").notNull(),
    sourceSummary: text("sourceSummary").notNull(),
    draftBody: text("draftBody"),
    status: commandBriefRunStatusEnum("status").default("source_pending").notNull(),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    generatedByUserId: integer("generatedByUserId").notNull(),
    reviewedByUserId: integer("reviewedByUserId"),
    reviewedAt: timestamp("reviewedAt"),
    statusReason: text("statusReason"),
    promptVersion: varchar("promptVersion", { length: 64 }).default("ISEYC-PCB-DOC-1.0").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("command_brief_status_idx").on(table.status), index("command_brief_test_idx").on(table.isTestMode), index("command_brief_created_idx").on(table.createdAt)],
);

export const contentDraftRequestTypeEnum = pgEnum("content_draft_request_type", ["platform_draft", "response_suggestion", "outreach_research", "calendar_item", "internal_brief"]);
export const contentDraftSourceApprovalStatusEnum = pgEnum("content_draft_source_approval_status", ["approved_external", "approved_internal", "pending_confirmation", "restricted"]);
export const contentDraftSensitivityEnum = pgEnum("content_draft_sensitivity", ["public", "internal", "confidential", "restricted"]);
export const contentDraftStatusEnum = pgEnum("content_draft_status", ["research_requested", "source_pending_approval", "draft_ready", "revision_requested", "approved_for_publication", "withheld_for_governance_review", "archived"]);

export const contentDrafts = pgTable(
  "content_drafts",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    title: varchar("title", { length: 512 }).notNull(),
    requestType: contentDraftRequestTypeEnum("requestType").notNull(),
    objective: text("objective").notNull(),
    intendedAudience: varchar("intendedAudience", { length: 255 }).notNull(),
    channelsJson: jsonb("channelsJson").notNull(),
    sourceReference: text("sourceReference").notNull(),
    sourceMaterial: text("sourceMaterial").notNull(),
    sourceApprovalStatus: contentDraftSourceApprovalStatusEnum("sourceApprovalStatus").default("pending_confirmation").notNull(),
    sensitivity: contentDraftSensitivityEnum("sensitivity").default("internal").notNull(),
    status: contentDraftStatusEnum("status").default("source_pending_approval").notNull(),
    draftJson: jsonb("draftJson"),
    contentOwnerUserId: integer("contentOwnerUserId").notNull(),
    requiredReviewerUserId: integer("requiredReviewerUserId"),
    targetDate: timestamp("targetDate"),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    publicationPerformed: boolean("publicationPerformed").default(false).notNull(),
    promptVersion: varchar("promptVersion", { length: 64 }).default("ISEYC-MEDIA-DOC-1.0").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("content_draft_status_idx").on(table.status), index("content_draft_test_idx").on(table.isTestMode), index("content_draft_owner_idx").on(table.contentOwnerUserId)],
);

export const docAuditLog = pgTable(
  "doc_audit_log",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    moduleKey: varchar("moduleKey", { length: 100 }).notNull(),
    recordId: integer("recordId").notNull(),
    actorUserId: integer("actorUserId"),
    eventType: varchar("eventType", { length: 100 }).notNull(),
    detail: text("detail"),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("doc_audit_module_record_idx").on(table.moduleKey, table.recordId), index("doc_audit_created_idx").on(table.createdAt)],
);

export const visibilityLevelEnum = pgEnum("visibility_level", ["private", "mentor_guided", "institutional_limited"]);
export const developmentalProfileConsentStatusEnum = pgEnum("developmental_profile_consent_status", ["not_requested", "active", "withdrawn"]);
export const developmentalProfileMentoringPreferenceEnum = pgEnum("developmental_profile_mentoring_preference", ["not_selected", "open_to_mentoring", "seeking_mentor", "mentoring_others", "not_now"]);
export const developmentalProfileStatusEnum = pgEnum("developmental_profile_status", ["not_started", "active", "paused"]);

export const developmentalProfiles = pgTable(
  "developmental_profiles",
  {
    userId: integer("userId").primaryKey(),
    consentStatus: developmentalProfileConsentStatusEnum("consentStatus").default("not_requested").notNull(),
    consentedAt: timestamp("consentedAt"),
    consentVersion: varchar("consentVersion", { length: 64 }),
    visibilityLevel: visibilityLevelEnum("visibilityLevel").default("private").notNull(),
    developmentDirection: jsonb("developmentDirection"),
    developmentGoals: text("developmentGoals"),
    mentoringPreference: developmentalProfileMentoringPreferenceEnum("mentoringPreference").default("not_selected").notNull(),
    mentorUserId: integer("mentorUserId"),
    profileStatus: developmentalProfileStatusEnum("profileStatus").default("not_started").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("developmental_profile_consent_idx").on(table.consentStatus), index("developmental_profile_mentor_idx").on(table.mentorUserId)],
);

export const communityTiers = pgTable(
  "community_tiers",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tierKey: varchar("tierKey", { length: 80 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull().unique(),
    hierarchyOrder: integer("hierarchyOrder").notNull(),
    description: text("description"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("community_tier_order_idx").on(table.hierarchyOrder)],
);

export const responsibilityPillars = pgTable(
  "responsibility_pillars",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    pillarKey: varchar("pillarKey", { length: 100 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull().unique(),
    responsibilityOrder: integer("responsibilityOrder").notNull(),
    description: text("description"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("responsibility_pillar_order_idx").on(table.responsibilityOrder)],
);

export const communityUnitStatusEnum = pgEnum("community_unit_status", ["draft", "active", "paused", "archived"]);

export const communityUnits = pgTable(
  "community_units",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tierId: integer("tierId").notNull(),
    parentUnitId: integer("parentUnitId"),
    name: varchar("name", { length: 255 }).notNull(),
    locality: varchar("locality", { length: 255 }),
    accountableLeadUserId: integer("accountableLeadUserId"),
    status: communityUnitStatusEnum("status").default("draft").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("community_unit_tier_idx").on(table.tierId), index("community_unit_parent_idx").on(table.parentUnitId), index("community_unit_status_idx").on(table.status)],
);

export const memberCommunityAffiliationStatusEnum = pgEnum("member_community_affiliation_status", ["self_declared", "confirmed", "inactive"]);

export const memberCommunityAffiliations = pgTable(
  "member_community_affiliations",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("userId").notNull(),
    communityUnitId: integer("communityUnitId"),
    tierId: integer("tierId").notNull(),
    affiliationStatus: memberCommunityAffiliationStatusEnum("affiliationStatus").default("self_declared").notNull(),
    confirmedByUserId: integer("confirmedByUserId"),
    confirmedAt: timestamp("confirmedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("member_affiliation_user_idx").on(table.userId), index("member_affiliation_tier_idx").on(table.tierId), index("member_affiliation_unit_idx").on(table.communityUnitId)],
);

export const memberPillarFocusStatusEnum = pgEnum("member_pillar_focus_status", ["interested", "contributing", "mentored", "inactive"]);

export const memberPillarFocuses = pgTable(
  "member_pillar_focuses",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("userId").notNull(),
    pillarId: integer("pillarId").notNull(),
    focusStatus: memberPillarFocusStatusEnum("focusStatus").default("interested").notNull(),
    visibilityLevel: visibilityLevelEnum("visibilityLevel").default("private").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("member_pillar_user_idx").on(table.userId), index("member_pillar_pillar_idx").on(table.pillarId)],
);

export const developmentParticipationTypeEnum = pgEnum("development_participation_type", ["meeting_contribution", "community_contribution", "development_reflection", "department_activity"]);

export const developmentParticipationRecords = pgTable(
  "development_participation_records",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("userId").notNull(),
    participationType: developmentParticipationTypeEnum("participationType").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    detail: text("detail"),
    sourceRecordId: integer("sourceRecordId"),
    confirmedByUserId: integer("confirmedByUserId"),
    confirmedAt: timestamp("confirmedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("development_participation_user_idx").on(table.userId), index("development_participation_confirmed_idx").on(table.confirmedAt)],
);

export const mentorshipRelationshipStatusEnum = pgEnum("mentorship_relationship_status", ["requested", "active", "paused", "completed", "declined"]);

export const mentorshipRelationships = pgTable(
  "mentorship_relationships",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    menteeUserId: integer("menteeUserId").notNull(),
    mentorUserId: integer("mentorUserId"),
    status: mentorshipRelationshipStatusEnum("status").default("requested").notNull(),
    agreedFocus: text("agreedFocus"),
    approvedByUserId: integer("approvedByUserId"),
    approvedAt: timestamp("approvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("mentorship_mentee_idx").on(table.menteeUserId), index("mentorship_mentor_idx").on(table.mentorUserId), index("mentorship_status_idx").on(table.status)],
);

export const mentorshipCheckIns = pgTable(
  "mentorship_check_ins",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    relationshipId: integer("relationshipId").notNull(),
    checkInDate: timestamp("checkInDate").notNull(),
    memberReflection: text("memberReflection"),
    mentorGuidance: text("mentorGuidance"),
    nextStep: text("nextStep"),
    recordedByUserId: integer("recordedByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("mentorship_checkin_relationship_idx").on(table.relationshipId), index("mentorship_checkin_date_idx").on(table.checkInDate)],
);

export const developmentGrowthPlanStatusEnum = pgEnum("development_growth_plan_status", ["draft", "active", "completed", "paused"]);

export const developmentGrowthPlans = pgTable(
  "development_growth_plans",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("userId").notNull(),
    focusPeriod: varchar("focusPeriod", { length: 120 }).notNull(),
    goalStatement: text("goalStatement").notNull(),
    nextAction: text("nextAction"),
    memberReflection: text("memberReflection"),
    status: developmentGrowthPlanStatusEnum("status").default("draft").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("growth_plan_user_idx").on(table.userId), index("growth_plan_status_idx").on(table.status)],
);

export const chamberSessionStatusValues = ["draft", "scheduled", "open", "closed", "cancelled", "archived"] as const;
export const chamberSessionStatusEnum = pgEnum("chamber_session_status", chamberSessionStatusValues);
export const chamberSessionTypeEnum = pgEnum("chamber_session_type", ["internal_meeting", "visitor_session", "seminar"]);
export const chamberSessionSensitivityEnum = pgEnum("chamber_session_sensitivity", ["public", "internal", "confidential", "restricted"]);
export const chamberSessionTrackerLinkStatusEnum = pgEnum("chamber_session_tracker_link_status", ["not_linked", "draft_requested", "linked"]);

export const chamberSessions = pgTable(
  "chamber_sessions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    title: varchar("title", { length: 512 }).notNull(),
    description: text("description"),
    sessionType: chamberSessionTypeEnum("sessionType").notNull(),
    conveningBody: varchar("conveningBody", { length: 255 }),
    chairUserId: integer("chairUserId").notNull(),
    sensitivity: chamberSessionSensitivityEnum("sensitivity").default("internal").notNull(),
    agendaJson: jsonb("agendaJson"),
    scheduledStartAt: timestamp("scheduledStartAt"),
    scheduledEndAt: timestamp("scheduledEndAt"),
    status: chamberSessionStatusEnum("status").default("draft").notNull(),
    linkedMeetingSubmissionId: integer("linkedMeetingSubmissionId"),
    trackerLinkStatus: chamberSessionTrackerLinkStatusEnum("trackerLinkStatus").default("not_linked").notNull(),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    createdByUserId: integer("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("chamber_session_status_idx").on(table.status), index("chamber_session_chair_idx").on(table.chairUserId), index("chamber_session_test_idx").on(table.isTestMode), index("chamber_session_start_idx").on(table.scheduledStartAt)],
);

export const chamberParticipantTypeEnum = pgEnum("chamber_participant_type", ["internal", "authorised_visitor"]);
export const chamberParticipantSessionRoleEnum = pgEnum("chamber_participant_session_role", ["chair", "presenter", "participant", "observer"]);
export const chamberParticipantAdmissionStatusEnum = pgEnum("chamber_participant_admission_status", ["invited", "admitted", "declined", "removed"]);

export const chamberParticipants = pgTable(
  "chamber_participants",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sessionId: integer("sessionId").notNull(),
    userId: integer("userId"),
    invitedEmail: varchar("invitedEmail", { length: 320 }),
    displayName: varchar("displayName", { length: 255 }).notNull(),
    officialPosition: varchar("officialPosition", { length: 255 }).notNull(),
    participantType: chamberParticipantTypeEnum("participantType").default("internal").notNull(),
    sessionRole: chamberParticipantSessionRoleEnum("sessionRole").default("participant").notNull(),
    admissionStatus: chamberParticipantAdmissionStatusEnum("admissionStatus").default("invited").notNull(),
    admittedByUserId: integer("admittedByUserId"),
    admittedAt: timestamp("admittedAt"),
    joinedAt: timestamp("joinedAt"),
    leftAt: timestamp("leftAt"),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    addedByUserId: integer("addedByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [index("chamber_participant_session_idx").on(table.sessionId), index("chamber_participant_user_idx").on(table.userId), index("chamber_participant_admission_idx").on(table.admissionStatus), index("chamber_participant_test_idx").on(table.isTestMode)],
);

export const chamberDocumentIntelligenceStatusEnum = pgEnum("chamber_document_intelligence_status", ["source_ready", "analysis_requested", "analysis_draft_ready", "withheld_for_review"]);

export const chamberDocuments = pgTable(
  "chamber_documents",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sessionId: integer("sessionId").notNull(),
    originalName: varchar("originalName", { length: 512 }).notNull(),
    mimeType: varchar("mimeType", { length: 255 }).notNull(),
    fileSizeBytes: integer("fileSizeBytes").notNull(),
    storageKey: varchar("storageKey", { length: 1024 }).notNull(),
    storageUrl: varchar("storageUrl", { length: 1024 }).notNull(),
    extractedText: text("extractedText"),
    intelligenceStatus: chamberDocumentIntelligenceStatusEnum("intelligenceStatus").default("source_ready").notNull(),
    uploadedByUserId: integer("uploadedByUserId").notNull(),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("chamber_document_session_idx").on(table.sessionId), index("chamber_document_status_idx").on(table.intelligenceStatus), index("chamber_document_test_idx").on(table.isTestMode)],
);

export const chamberDocumentIntelligenceDraftStatusEnum = pgEnum("chamber_document_intelligence_draft_status", ["analysis_requested", "draft_ready", "under_review", "approved_for_audio", "withheld_for_review"]);

export const chamberDocumentIntelligenceDrafts = pgTable(
  "chamber_document_intelligence_drafts",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sessionId: integer("sessionId").notNull(),
    documentId: integer("documentId").notNull(),
    promptVersion: varchar("promptVersion", { length: 64 }).notNull(),
    draftJson: jsonb("draftJson"),
    status: chamberDocumentIntelligenceDraftStatusEnum("status").default("analysis_requested").notNull(),
    sourceSetConfirmed: boolean("sourceSetConfirmed").default(false).notNull(),
    requestedByUserId: integer("requestedByUserId").notNull(),
    reviewedByUserId: integer("reviewedByUserId"),
    reviewedAt: timestamp("reviewedAt"),
    statusReason: text("statusReason"),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => [
    index("chamber_intelligence_session_idx").on(table.sessionId),
    index("chamber_intelligence_document_idx").on(table.documentId),
    index("chamber_intelligence_status_idx").on(table.status),
    index("chamber_intelligence_test_idx").on(table.isTestMode),
  ],
);

export const chamberAuditLog = pgTable(
  "chamber_audit_log",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    sessionId: integer("sessionId").notNull(),
    actorUserId: integer("actorUserId"),
    eventType: varchar("eventType", { length: 100 }).notNull(),
    detail: text("detail"),
    isTestMode: boolean("isTestMode").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("chamber_audit_session_idx").on(table.sessionId), index("chamber_audit_created_idx").on(table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
