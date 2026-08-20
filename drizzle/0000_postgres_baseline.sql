CREATE TYPE "public"."chamber_document_intelligence_draft_status" AS ENUM('analysis_requested', 'draft_ready', 'under_review', 'approved_for_audio', 'withheld_for_review');--> statement-breakpoint
CREATE TYPE "public"."chamber_document_intelligence_status" AS ENUM('source_ready', 'analysis_requested', 'analysis_draft_ready', 'withheld_for_review');--> statement-breakpoint
CREATE TYPE "public"."chamber_participant_admission_status" AS ENUM('invited', 'admitted', 'declined', 'removed');--> statement-breakpoint
CREATE TYPE "public"."chamber_participant_session_role" AS ENUM('chair', 'presenter', 'participant', 'observer');--> statement-breakpoint
CREATE TYPE "public"."chamber_participant_type" AS ENUM('internal', 'authorised_visitor');--> statement-breakpoint
CREATE TYPE "public"."chamber_session_sensitivity" AS ENUM('public', 'internal', 'confidential', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."chamber_session_status" AS ENUM('draft', 'scheduled', 'open', 'closed', 'cancelled', 'archived');--> statement-breakpoint
CREATE TYPE "public"."chamber_session_tracker_link_status" AS ENUM('not_linked', 'draft_requested', 'linked');--> statement-breakpoint
CREATE TYPE "public"."chamber_session_type" AS ENUM('internal_meeting', 'visitor_session', 'seminar');--> statement-breakpoint
CREATE TYPE "public"."command_brief_run_status" AS ENUM('source_pending', 'draft_ready', 'under_review', 'approved_for_internal_use', 'withheld_for_review', 'archived');--> statement-breakpoint
CREATE TYPE "public"."community_unit_status" AS ENUM('draft', 'active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."content_draft_request_type" AS ENUM('platform_draft', 'response_suggestion', 'outreach_research', 'calendar_item', 'internal_brief');--> statement-breakpoint
CREATE TYPE "public"."content_draft_sensitivity" AS ENUM('public', 'internal', 'confidential', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."content_draft_source_approval_status" AS ENUM('approved_external', 'approved_internal', 'pending_confirmation', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."content_draft_status" AS ENUM('research_requested', 'source_pending_approval', 'draft_ready', 'revision_requested', 'approved_for_publication', 'withheld_for_governance_review', 'archived');--> statement-breakpoint
CREATE TYPE "public"."development_growth_plan_status" AS ENUM('draft', 'active', 'completed', 'paused');--> statement-breakpoint
CREATE TYPE "public"."development_participation_type" AS ENUM('meeting_contribution', 'community_contribution', 'development_reflection', 'department_activity');--> statement-breakpoint
CREATE TYPE "public"."developmental_profile_consent_status" AS ENUM('not_requested', 'active', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."developmental_profile_mentoring_preference" AS ENUM('not_selected', 'open_to_mentoring', 'seeking_mentor', 'mentoring_others', 'not_now');--> statement-breakpoint
CREATE TYPE "public"."developmental_profile_status" AS ENUM('not_started', 'active', 'paused');--> statement-breakpoint
CREATE TYPE "public"."doc_role" AS ENUM('member', 'officer', 'administrator', 'presidential_council', 'national_president');--> statement-breakpoint
CREATE TYPE "public"."meeting_action_item_confirmation_status" AS ENUM('draft', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."meeting_file_document_type" AS ENUM('agenda', 'minutes', 'notes', 'transcript', 'decision_log', 'action_list', 'other');--> statement-breakpoint
CREATE TYPE "public"."meeting_record_review_decision" AS ENUM('approved', 'revision_requested', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."meeting_submission_sensitivity" AS ENUM('public', 'internal', 'confidential', 'restricted', 'not_recorded');--> statement-breakpoint
CREATE TYPE "public"."meeting_submission_status" AS ENUM('pending_consolidation', 'processing', 'draft_ready', 'under_review', 'approved', 'needs_human_review', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."member_community_affiliation_status" AS ENUM('self_declared', 'confirmed', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."member_pillar_focus_status" AS ENUM('interested', 'contributing', 'mentored', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."mentorship_relationship_status" AS ENUM('requested', 'active', 'paused', 'completed', 'declined');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."visibility_level" AS ENUM('private', 'mentor_guided', 'institutional_limited');--> statement-breakpoint
CREATE TABLE "chamber_audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chamber_audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sessionId" integer NOT NULL,
	"actorUserId" integer,
	"eventType" varchar(100) NOT NULL,
	"detail" text,
	"isTestMode" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chamber_document_intelligence_drafts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chamber_document_intelligence_drafts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sessionId" integer NOT NULL,
	"documentId" integer NOT NULL,
	"promptVersion" varchar(64) NOT NULL,
	"draftJson" jsonb,
	"status" "chamber_document_intelligence_draft_status" DEFAULT 'analysis_requested' NOT NULL,
	"sourceSetConfirmed" boolean DEFAULT false NOT NULL,
	"requestedByUserId" integer NOT NULL,
	"reviewedByUserId" integer,
	"reviewedAt" timestamp,
	"statusReason" text,
	"isTestMode" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chamber_documents" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chamber_documents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sessionId" integer NOT NULL,
	"originalName" varchar(512) NOT NULL,
	"mimeType" varchar(255) NOT NULL,
	"fileSizeBytes" integer NOT NULL,
	"storageKey" varchar(1024) NOT NULL,
	"storageUrl" varchar(1024) NOT NULL,
	"extractedText" text,
	"intelligenceStatus" "chamber_document_intelligence_status" DEFAULT 'source_ready' NOT NULL,
	"uploadedByUserId" integer NOT NULL,
	"isTestMode" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chamber_participants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chamber_participants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sessionId" integer NOT NULL,
	"userId" integer,
	"invitedEmail" varchar(320),
	"displayName" varchar(255) NOT NULL,
	"officialPosition" varchar(255) NOT NULL,
	"participantType" "chamber_participant_type" DEFAULT 'internal' NOT NULL,
	"sessionRole" "chamber_participant_session_role" DEFAULT 'participant' NOT NULL,
	"admissionStatus" "chamber_participant_admission_status" DEFAULT 'invited' NOT NULL,
	"admittedByUserId" integer,
	"admittedAt" timestamp,
	"joinedAt" timestamp,
	"leftAt" timestamp,
	"isTestMode" boolean DEFAULT false NOT NULL,
	"addedByUserId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chamber_sessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chamber_sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" varchar(512) NOT NULL,
	"description" text,
	"sessionType" "chamber_session_type" NOT NULL,
	"conveningBody" varchar(255),
	"chairUserId" integer NOT NULL,
	"sensitivity" "chamber_session_sensitivity" DEFAULT 'internal' NOT NULL,
	"agendaJson" jsonb,
	"scheduledStartAt" timestamp,
	"scheduledEndAt" timestamp,
	"status" "chamber_session_status" DEFAULT 'draft' NOT NULL,
	"linkedMeetingSubmissionId" integer,
	"trackerLinkStatus" "chamber_session_tracker_link_status" DEFAULT 'not_linked' NOT NULL,
	"isTestMode" boolean DEFAULT false NOT NULL,
	"createdByUserId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "command_brief_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "command_brief_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"coverageStart" timestamp NOT NULL,
	"coverageEnd" timestamp NOT NULL,
	"sourceSummary" text NOT NULL,
	"draftBody" text,
	"status" "command_brief_run_status" DEFAULT 'source_pending' NOT NULL,
	"isTestMode" boolean DEFAULT false NOT NULL,
	"generatedByUserId" integer NOT NULL,
	"reviewedByUserId" integer,
	"reviewedAt" timestamp,
	"statusReason" text,
	"promptVersion" varchar(64) DEFAULT 'ISEYC-PCB-DOC-1.0' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_tiers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "community_tiers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tierKey" varchar(80) NOT NULL,
	"name" varchar(160) NOT NULL,
	"hierarchyOrder" integer NOT NULL,
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_tiers_tierKey_unique" UNIQUE("tierKey"),
	CONSTRAINT "community_tiers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "community_units" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "community_units_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tierId" integer NOT NULL,
	"parentUnitId" integer,
	"name" varchar(255) NOT NULL,
	"locality" varchar(255),
	"accountableLeadUserId" integer,
	"status" "community_unit_status" DEFAULT 'draft' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_drafts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "content_drafts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" varchar(512) NOT NULL,
	"requestType" "content_draft_request_type" NOT NULL,
	"objective" text NOT NULL,
	"intendedAudience" varchar(255) NOT NULL,
	"channelsJson" jsonb NOT NULL,
	"sourceReference" text NOT NULL,
	"sourceMaterial" text NOT NULL,
	"sourceApprovalStatus" "content_draft_source_approval_status" DEFAULT 'pending_confirmation' NOT NULL,
	"sensitivity" "content_draft_sensitivity" DEFAULT 'internal' NOT NULL,
	"status" "content_draft_status" DEFAULT 'source_pending_approval' NOT NULL,
	"draftJson" jsonb,
	"contentOwnerUserId" integer NOT NULL,
	"requiredReviewerUserId" integer,
	"targetDate" timestamp,
	"isTestMode" boolean DEFAULT false NOT NULL,
	"publicationPerformed" boolean DEFAULT false NOT NULL,
	"promptVersion" varchar(64) DEFAULT 'ISEYC-MEDIA-DOC-1.0' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "development_growth_plans" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "development_growth_plans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"focusPeriod" varchar(120) NOT NULL,
	"goalStatement" text NOT NULL,
	"nextAction" text,
	"memberReflection" text,
	"status" "development_growth_plan_status" DEFAULT 'draft' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "development_participation_records" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "development_participation_records_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"participationType" "development_participation_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"detail" text,
	"sourceRecordId" integer,
	"confirmedByUserId" integer,
	"confirmedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "developmental_profiles" (
	"userId" integer PRIMARY KEY NOT NULL,
	"consentStatus" "developmental_profile_consent_status" DEFAULT 'not_requested' NOT NULL,
	"consentedAt" timestamp,
	"consentVersion" varchar(64),
	"visibilityLevel" "visibility_level" DEFAULT 'private' NOT NULL,
	"developmentDirection" jsonb,
	"developmentGoals" text,
	"mentoringPreference" "developmental_profile_mentoring_preference" DEFAULT 'not_selected' NOT NULL,
	"mentorUserId" integer,
	"profileStatus" "developmental_profile_status" DEFAULT 'not_started' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doc_audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "doc_audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"moduleKey" varchar(100) NOT NULL,
	"recordId" integer NOT NULL,
	"actorUserId" integer,
	"eventType" varchar(100) NOT NULL,
	"detail" text,
	"isTestMode" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutional_prompts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "institutional_prompts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"promptKey" varchar(100) NOT NULL,
	"version" varchar(64) NOT NULL,
	"content" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"updatedByUserId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_action_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "meeting_action_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"submissionId" integer NOT NULL,
	"actionDescription" text NOT NULL,
	"accountableOwner" varchar(255) NOT NULL,
	"supportingParties" text,
	"dueDate" varchar(64),
	"sourceStatus" varchar(64) NOT NULL,
	"dependency" text,
	"evidenceLocation" varchar(512),
	"confirmationStatus" "meeting_action_item_confirmation_status" DEFAULT 'draft' NOT NULL,
	"confirmedByUserId" integer,
	"confirmedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "meeting_audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"submissionId" integer NOT NULL,
	"actorUserId" integer,
	"eventType" varchar(100) NOT NULL,
	"detail" text,
	"isTestMode" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_automation_settings" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"consolidationMinutes" integer DEFAULT 12 NOT NULL,
	"fallbackCronExpression" varchar(64) DEFAULT '0 */15 * * * *' NOT NULL,
	"fallbackCronTaskUid" varchar(65),
	"fallbackEnabled" boolean DEFAULT false NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_files" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "meeting_files_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"submissionId" integer NOT NULL,
	"originalName" varchar(512) NOT NULL,
	"documentType" "meeting_file_document_type" DEFAULT 'other' NOT NULL,
	"mimeType" varchar(255) NOT NULL,
	"fileSizeBytes" integer NOT NULL,
	"storageKey" varchar(1024) NOT NULL,
	"storageUrl" varchar(1024) NOT NULL,
	"extractedText" text,
	"uploadedByUserId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_record_reviews" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "meeting_record_reviews_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"submissionId" integer NOT NULL,
	"sectionKey" varchar(100) NOT NULL,
	"decision" "meeting_record_review_decision" NOT NULL,
	"reviewNote" text,
	"reviewerUserId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_submissions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "meeting_submissions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"meetingTitle" varchar(512) NOT NULL,
	"meetingDate" varchar(64),
	"conveningBody" varchar(255),
	"sensitivity" "meeting_submission_sensitivity" DEFAULT 'internal' NOT NULL,
	"sourceGroupKey" varchar(160) NOT NULL,
	"isTestMode" boolean DEFAULT false NOT NULL,
	"status" "meeting_submission_status" DEFAULT 'pending_consolidation' NOT NULL,
	"statusReason" text,
	"submittedByUserId" integer NOT NULL,
	"approvedByUserId" integer,
	"approvedAt" timestamp,
	"consolidationEligibleAt" timestamp NOT NULL,
	"processingAttemptedAt" timestamp,
	"recordJson" jsonb,
	"authoritativePromptVersion" varchar(64) DEFAULT 'ISEYC-MDT-1.0' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_community_affiliations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "member_community_affiliations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"communityUnitId" integer,
	"tierId" integer NOT NULL,
	"affiliationStatus" "member_community_affiliation_status" DEFAULT 'self_declared' NOT NULL,
	"confirmedByUserId" integer,
	"confirmedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_pillar_focuses" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "member_pillar_focuses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"pillarId" integer NOT NULL,
	"focusStatus" "member_pillar_focus_status" DEFAULT 'interested' NOT NULL,
	"visibilityLevel" "visibility_level" DEFAULT 'private' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentorship_check_ins" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mentorship_check_ins_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"relationshipId" integer NOT NULL,
	"checkInDate" timestamp NOT NULL,
	"memberReflection" text,
	"mentorGuidance" text,
	"nextStep" text,
	"recordedByUserId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentorship_relationships" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mentorship_relationships_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"menteeUserId" integer NOT NULL,
	"mentorUserId" integer,
	"status" "mentorship_relationship_status" DEFAULT 'requested' NOT NULL,
	"agreedFocus" text,
	"approvedByUserId" integer,
	"approvedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "responsibility_pillars" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "responsibility_pillars_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"pillarKey" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"responsibilityOrder" integer NOT NULL,
	"description" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "responsibility_pillars_pillarKey_unique" UNIQUE("pillarKey"),
	CONSTRAINT "responsibility_pillars_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"authUserId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"docRole" "doc_role" DEFAULT 'member' NOT NULL,
	"isAuthorizedOfficer" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_authUserId_unique" UNIQUE("authUserId")
);
--> statement-breakpoint
CREATE INDEX "chamber_audit_session_idx" ON "chamber_audit_log" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "chamber_audit_created_idx" ON "chamber_audit_log" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "chamber_intelligence_session_idx" ON "chamber_document_intelligence_drafts" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "chamber_intelligence_document_idx" ON "chamber_document_intelligence_drafts" USING btree ("documentId");--> statement-breakpoint
CREATE INDEX "chamber_intelligence_status_idx" ON "chamber_document_intelligence_drafts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "chamber_intelligence_test_idx" ON "chamber_document_intelligence_drafts" USING btree ("isTestMode");--> statement-breakpoint
CREATE INDEX "chamber_document_session_idx" ON "chamber_documents" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "chamber_document_status_idx" ON "chamber_documents" USING btree ("intelligenceStatus");--> statement-breakpoint
CREATE INDEX "chamber_document_test_idx" ON "chamber_documents" USING btree ("isTestMode");--> statement-breakpoint
CREATE INDEX "chamber_participant_session_idx" ON "chamber_participants" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "chamber_participant_user_idx" ON "chamber_participants" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "chamber_participant_admission_idx" ON "chamber_participants" USING btree ("admissionStatus");--> statement-breakpoint
CREATE INDEX "chamber_participant_test_idx" ON "chamber_participants" USING btree ("isTestMode");--> statement-breakpoint
CREATE INDEX "chamber_session_status_idx" ON "chamber_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "chamber_session_chair_idx" ON "chamber_sessions" USING btree ("chairUserId");--> statement-breakpoint
CREATE INDEX "chamber_session_test_idx" ON "chamber_sessions" USING btree ("isTestMode");--> statement-breakpoint
CREATE INDEX "chamber_session_start_idx" ON "chamber_sessions" USING btree ("scheduledStartAt");--> statement-breakpoint
CREATE INDEX "command_brief_status_idx" ON "command_brief_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "command_brief_test_idx" ON "command_brief_runs" USING btree ("isTestMode");--> statement-breakpoint
CREATE INDEX "command_brief_created_idx" ON "command_brief_runs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "community_tier_order_idx" ON "community_tiers" USING btree ("hierarchyOrder");--> statement-breakpoint
CREATE INDEX "community_unit_tier_idx" ON "community_units" USING btree ("tierId");--> statement-breakpoint
CREATE INDEX "community_unit_parent_idx" ON "community_units" USING btree ("parentUnitId");--> statement-breakpoint
CREATE INDEX "community_unit_status_idx" ON "community_units" USING btree ("status");--> statement-breakpoint
CREATE INDEX "content_draft_status_idx" ON "content_drafts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "content_draft_test_idx" ON "content_drafts" USING btree ("isTestMode");--> statement-breakpoint
CREATE INDEX "content_draft_owner_idx" ON "content_drafts" USING btree ("contentOwnerUserId");--> statement-breakpoint
CREATE INDEX "growth_plan_user_idx" ON "development_growth_plans" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "growth_plan_status_idx" ON "development_growth_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "development_participation_user_idx" ON "development_participation_records" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "development_participation_confirmed_idx" ON "development_participation_records" USING btree ("confirmedAt");--> statement-breakpoint
CREATE INDEX "developmental_profile_consent_idx" ON "developmental_profiles" USING btree ("consentStatus");--> statement-breakpoint
CREATE INDEX "developmental_profile_mentor_idx" ON "developmental_profiles" USING btree ("mentorUserId");--> statement-breakpoint
CREATE INDEX "doc_audit_module_record_idx" ON "doc_audit_log" USING btree ("moduleKey","recordId");--> statement-breakpoint
CREATE INDEX "doc_audit_created_idx" ON "doc_audit_log" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "institutional_prompt_key_idx" ON "institutional_prompts" USING btree ("promptKey");--> statement-breakpoint
CREATE INDEX "institutional_prompt_active_idx" ON "institutional_prompts" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "meeting_action_submission_idx" ON "meeting_action_items" USING btree ("submissionId");--> statement-breakpoint
CREATE INDEX "meeting_audit_submission_idx" ON "meeting_audit_log" USING btree ("submissionId");--> statement-breakpoint
CREATE INDEX "meeting_file_submission_idx" ON "meeting_files" USING btree ("submissionId");--> statement-breakpoint
CREATE INDEX "meeting_review_submission_idx" ON "meeting_record_reviews" USING btree ("submissionId");--> statement-breakpoint
CREATE INDEX "meeting_submission_status_idx" ON "meeting_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "meeting_submission_due_idx" ON "meeting_submissions" USING btree ("consolidationEligibleAt");--> statement-breakpoint
CREATE INDEX "meeting_submission_group_idx" ON "meeting_submissions" USING btree ("sourceGroupKey");--> statement-breakpoint
CREATE INDEX "meeting_submission_submitter_idx" ON "meeting_submissions" USING btree ("submittedByUserId");--> statement-breakpoint
CREATE INDEX "meeting_submission_test_idx" ON "meeting_submissions" USING btree ("isTestMode");--> statement-breakpoint
CREATE INDEX "member_affiliation_user_idx" ON "member_community_affiliations" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "member_affiliation_tier_idx" ON "member_community_affiliations" USING btree ("tierId");--> statement-breakpoint
CREATE INDEX "member_affiliation_unit_idx" ON "member_community_affiliations" USING btree ("communityUnitId");--> statement-breakpoint
CREATE INDEX "member_pillar_user_idx" ON "member_pillar_focuses" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "member_pillar_pillar_idx" ON "member_pillar_focuses" USING btree ("pillarId");--> statement-breakpoint
CREATE INDEX "mentorship_checkin_relationship_idx" ON "mentorship_check_ins" USING btree ("relationshipId");--> statement-breakpoint
CREATE INDEX "mentorship_checkin_date_idx" ON "mentorship_check_ins" USING btree ("checkInDate");--> statement-breakpoint
CREATE INDEX "mentorship_mentee_idx" ON "mentorship_relationships" USING btree ("menteeUserId");--> statement-breakpoint
CREATE INDEX "mentorship_mentor_idx" ON "mentorship_relationships" USING btree ("mentorUserId");--> statement-breakpoint
CREATE INDEX "mentorship_status_idx" ON "mentorship_relationships" USING btree ("status");--> statement-breakpoint
CREATE INDEX "responsibility_pillar_order_idx" ON "responsibility_pillars" USING btree ("responsibilityOrder");