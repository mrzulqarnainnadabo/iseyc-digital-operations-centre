-- ISEYC Digital Operations Centre
-- Migration 0002: Institutional Spine v1
-- Seats, Holders, Departments, Programmes, Publications, AI Desk Runs, Resolutions
-- AI is staff to the seat; never the seat-holder. Human approval required for publication and authoritative outcomes.

CREATE TYPE "public"."department_key" AS ENUM('education_capacity_building', 'health_wellbeing', 'digital_systems_technology', 'civic_affairs');
CREATE TYPE "public"."programme_status" AS ENUM('draft', 'active', 'paused', 'archived');
CREATE TYPE "public"."seat_layer" AS ENUM('board_of_trustees', 'advisory_council', 'presidential_council', 'department', 'shared_service');
CREATE TYPE "public"."seat_status" AS ENUM('active', 'vacant', 'suspended', 'retired');
CREATE TYPE "public"."seat_holder_status" AS ENUM('active', 'acting', 'ended', 'revoked');
CREATE TYPE "public"."publication_status" AS ENUM('draft', 'under_review', 'approved', 'published', 'returned', 'archived', 'withheld');
CREATE TYPE "public"."publication_visibility" AS ENUM('public', 'internal_only');
CREATE TYPE "public"."ai_desk_run_status" AS ENUM('queued', 'running', 'draft_ready', 'under_human_review', 'approved', 'returned', 'rejected', 'archived');
CREATE TYPE "public"."resolution_status" AS ENUM('draft', 'under_review', 'approved', 'returned', 'published_internal', 'archived');

CREATE TABLE IF NOT EXISTS "departments" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "departmentKey" "department_key" NOT NULL,
  "name" varchar(200) NOT NULL,
  "shortName" varchar(80) NOT NULL,
  "description" text,
  "isActive" boolean DEFAULT true NOT NULL,
  "sortOrder" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "departments_departmentKey_unique" UNIQUE("departmentKey"),
  CONSTRAINT "departments_name_unique" UNIQUE("name")
);

CREATE TABLE IF NOT EXISTS "programmes" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "departmentId" integer NOT NULL,
  "programmeKey" varchar(120) NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "status" "programme_status" DEFAULT 'draft' NOT NULL,
  "isBusinessInvestmentRelated" boolean DEFAULT false NOT NULL,
  "accountableSeatId" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "programmes_programmeKey_unique" UNIQUE("programmeKey")
);

CREATE TABLE IF NOT EXISTS "seats" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "seatKey" varchar(120) NOT NULL,
  "title" varchar(255) NOT NULL,
  "layer" "seat_layer" NOT NULL,
  "departmentId" integer,
  "description" text,
  "mapsToDocRole" "doc_role",
  "isSingleton" boolean DEFAULT true NOT NULL,
  "status" "seat_status" DEFAULT 'vacant' NOT NULL,
  "sortOrder" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "seats_seatKey_unique" UNIQUE("seatKey")
);

CREATE TABLE IF NOT EXISTS "seat_holders" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "seatId" integer NOT NULL,
  "userId" integer NOT NULL,
  "status" "seat_holder_status" DEFAULT 'active' NOT NULL,
  "appointedAt" timestamp DEFAULT now() NOT NULL,
  "endedAt" timestamp,
  "appointedByUserId" integer,
  "notes" text,
  "isTestMode" boolean DEFAULT false NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "publications" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "title" varchar(512) NOT NULL,
  "slug" varchar(255),
  "bodyMarkdown" text,
  "summary" text,
  "status" "publication_status" DEFAULT 'draft' NOT NULL,
  "visibility" "publication_visibility" DEFAULT 'internal_only' NOT NULL,
  "owningSeatId" integer,
  "departmentId" integer,
  "createdByUserId" integer NOT NULL,
  "reviewedByUserId" integer,
  "reviewedAt" timestamp,
  "publishedAt" timestamp,
  "publishedByUserId" integer,
  "statusReason" text,
  "sourceAiDeskRunId" integer,
  "sourceContentDraftId" integer,
  "isTestMode" boolean DEFAULT false NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "publications_slug_unique" UNIQUE("slug")
);

CREATE TABLE IF NOT EXISTS "ai_desk_runs" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "seatId" integer,
  "departmentId" integer,
  "promptRole" varchar(120) NOT NULL,
  "promptKey" varchar(100),
  "promptVersion" varchar(64),
  "inputSummary" text NOT NULL,
  "outputJson" jsonb,
  "outputText" text,
  "status" "ai_desk_run_status" DEFAULT 'queued' NOT NULL,
  "requiresHuman" boolean DEFAULT true NOT NULL,
  "outcome" text,
  "requestedByUserId" integer NOT NULL,
  "reviewedByUserId" integer,
  "reviewedAt" timestamp,
  "isTestMode" boolean DEFAULT false NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "resolutions" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "title" varchar(512) NOT NULL,
  "body" text NOT NULL,
  "status" "resolution_status" DEFAULT 'draft' NOT NULL,
  "originatingSeatId" integer,
  "meetingSubmissionId" integer,
  "decidedByUserId" integer,
  "decidedAt" timestamp,
  "createdByUserId" integer NOT NULL,
  "statusReason" text,
  "isTestMode" boolean DEFAULT false NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "institutional_audit_log" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "entityType" varchar(80) NOT NULL,
  "entityId" integer NOT NULL,
  "actorUserId" integer,
  "eventType" varchar(100) NOT NULL,
  "detail" text,
  "isTestMode" boolean DEFAULT false NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS "department_key_idx" ON "departments" USING btree ("departmentKey");
CREATE INDEX IF NOT EXISTS "department_sort_idx" ON "departments" USING btree ("sortOrder");
CREATE INDEX IF NOT EXISTS "programme_department_idx" ON "programmes" USING btree ("departmentId");
CREATE INDEX IF NOT EXISTS "programme_status_idx" ON "programmes" USING btree ("status");
CREATE INDEX IF NOT EXISTS "programme_key_idx" ON "programmes" USING btree ("programmeKey");
CREATE INDEX IF NOT EXISTS "seat_key_idx" ON "seats" USING btree ("seatKey");
CREATE INDEX IF NOT EXISTS "seat_layer_idx" ON "seats" USING btree ("layer");
CREATE INDEX IF NOT EXISTS "seat_department_idx" ON "seats" USING btree ("departmentId");
CREATE INDEX IF NOT EXISTS "seat_status_idx" ON "seats" USING btree ("status");
CREATE INDEX IF NOT EXISTS "seat_holder_seat_idx" ON "seat_holders" USING btree ("seatId");
CREATE INDEX IF NOT EXISTS "seat_holder_user_idx" ON "seat_holders" USING btree ("userId");
CREATE INDEX IF NOT EXISTS "seat_holder_status_idx" ON "seat_holders" USING btree ("status");
CREATE INDEX IF NOT EXISTS "seat_holder_test_idx" ON "seat_holders" USING btree ("isTestMode");
CREATE INDEX IF NOT EXISTS "publication_status_idx" ON "publications" USING btree ("status");
CREATE INDEX IF NOT EXISTS "publication_slug_idx" ON "publications" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "publication_visibility_idx" ON "publications" USING btree ("visibility");
CREATE INDEX IF NOT EXISTS "publication_department_idx" ON "publications" USING btree ("departmentId");
CREATE INDEX IF NOT EXISTS "publication_test_idx" ON "publications" USING btree ("isTestMode");
CREATE INDEX IF NOT EXISTS "ai_desk_run_status_idx" ON "ai_desk_runs" USING btree ("status");
CREATE INDEX IF NOT EXISTS "ai_desk_run_seat_idx" ON "ai_desk_runs" USING btree ("seatId");
CREATE INDEX IF NOT EXISTS "ai_desk_run_department_idx" ON "ai_desk_runs" USING btree ("departmentId");
CREATE INDEX IF NOT EXISTS "ai_desk_run_test_idx" ON "ai_desk_runs" USING btree ("isTestMode");
CREATE INDEX IF NOT EXISTS "ai_desk_run_created_idx" ON "ai_desk_runs" USING btree ("createdAt");
CREATE INDEX IF NOT EXISTS "resolution_status_idx" ON "resolutions" USING btree ("status");
CREATE INDEX IF NOT EXISTS "resolution_seat_idx" ON "resolutions" USING btree ("originatingSeatId");
CREATE INDEX IF NOT EXISTS "resolution_meeting_idx" ON "resolutions" USING btree ("meetingSubmissionId");
CREATE INDEX IF NOT EXISTS "resolution_test_idx" ON "resolutions" USING btree ("isTestMode");
CREATE INDEX IF NOT EXISTS "institutional_audit_entity_idx" ON "institutional_audit_log" USING btree ("entityType","entityId");
CREATE INDEX IF NOT EXISTS "institutional_audit_created_idx" ON "institutional_audit_log" USING btree ("createdAt");

-- Seed: four departments (target governance model)
INSERT INTO "departments" ("departmentKey", "name", "shortName", "description", "sortOrder")
VALUES
  ('education_capacity_building', 'Education & Capacity Building', 'Education', 'Includes former Business & Investment as programmes under capacity building. Not a separate department.', 1),
  ('health_wellbeing', 'Health & Well-being', 'Health', 'Health programmes and community well-being initiatives.', 2),
  ('digital_systems_technology', 'Digital Systems & Technology', 'Digital', 'Platforms, data, AI support infrastructure, and technical operations.', 3),
  ('civic_affairs', 'Civic Affairs', 'Civic', 'Non-partisan civic tools, Civic Mandate, public civic education. Links to published-only Civic Mandate and Civic Brain.', 4)
ON CONFLICT DO NOTHING;

-- Seed: core seats (Presidential Council + Department Heads + shared Communications)
INSERT INTO "seats" ("seatKey", "title", "layer", "departmentId", "description", "mapsToDocRole", "isSingleton", "status", "sortOrder")
VALUES
  ('national_president', 'National President', 'presidential_council', NULL, 'Head of the Presidential Council. Human seat only.', 'national_president', true, 'vacant', 10),
  ('chief_of_staff', 'Chief of Staff', 'presidential_council', NULL, 'Coordinates Presidential Council and shared services including Communications & Storytelling.', 'presidential_council', true, 'vacant', 20),
  ('secretary_general', 'Secretary General', 'presidential_council', NULL, 'Institutional records, resolutions, and formal correspondence. Human seat; AI is staff only.', 'presidential_council', true, 'vacant', 30),
  ('coo', 'Chief Operating Officer', 'presidential_council', NULL, 'Day-to-day operational coordination across departments.', 'presidential_council', true, 'vacant', 40),
  ('cfo', 'Chief Financial Officer', 'presidential_council', NULL, 'Financial oversight. No AI may move money.', 'presidential_council', true, 'vacant', 50),
  ('head_education', 'Head of Education & Capacity Building', 'department', (SELECT id FROM departments WHERE "departmentKey" = 'education_capacity_building'), 'Department head. Owns programmes including former Business & Investment capacity programmes.', 'administrator', true, 'vacant', 110),
  ('head_health', 'Head of Health & Well-being', 'department', (SELECT id FROM departments WHERE "departmentKey" = 'health_wellbeing'), 'Department head for health programmes.', 'administrator', true, 'vacant', 120),
  ('head_digital', 'Head of Digital Systems & Technology', 'department', (SELECT id FROM departments WHERE "departmentKey" = 'digital_systems_technology'), 'Department head for digital platforms and AI support infrastructure.', 'administrator', true, 'vacant', 130),
  ('head_civic', 'Head of Civic Affairs', 'department', (SELECT id FROM departments WHERE "departmentKey" = 'civic_affairs'), 'Department head. Steward of non-partisan civic tools (Mandate, Brain links). No campaign ranking.', 'administrator', true, 'vacant', 140),
  ('comms_shared', 'Communications & Storytelling (Shared Service)', 'shared_service', NULL, 'Shared service under Presidential Council / Chief of Staff. Not a fifth departmental silo.', 'officer', true, 'vacant', 200)
ON CONFLICT DO NOTHING;

-- Seed: example programmes under Education (Business & Investment home)
INSERT INTO "programmes" ("departmentId", "programmeKey", "name", "description", "status", "isBusinessInvestmentRelated")
SELECT id, 'biz-investment-capacity', 'Business & Investment Capacity', 'Former Business & Investment department content, now programmes under Education & Capacity Building.', 'active', true
FROM departments WHERE "departmentKey" = 'education_capacity_building'
ON CONFLICT DO NOTHING;

INSERT INTO "programmes" ("departmentId", "programmeKey", "name", "description", "status", "isBusinessInvestmentRelated")
SELECT id, 'youth-skills', 'Youth Skills & Livelihoods', 'Skills development and livelihood pathways.', 'active', false
FROM departments WHERE "departmentKey" = 'education_capacity_building'
ON CONFLICT DO NOTHING;
