CREATE TABLE `command_brief_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`coverageStart` datetime NOT NULL,
	`coverageEnd` datetime NOT NULL,
	`sourceSummary` longtext NOT NULL,
	`draftBody` longtext,
	`status` enum('source_pending','draft_ready','under_review','approved_for_internal_use','withheld_for_review','archived') NOT NULL DEFAULT 'source_pending',
	`isTestMode` boolean NOT NULL DEFAULT false,
	`generatedByUserId` int NOT NULL,
	`reviewedByUserId` int,
	`reviewedAt` datetime,
	`statusReason` text,
	`promptVersion` varchar(64) NOT NULL DEFAULT 'ISEYC-PCB-DOC-1.0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `command_brief_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(512) NOT NULL,
	`requestType` enum('platform_draft','response_suggestion','outreach_research','calendar_item','internal_brief') NOT NULL,
	`objective` text NOT NULL,
	`intendedAudience` varchar(255) NOT NULL,
	`channelsJson` json NOT NULL,
	`sourceReference` text NOT NULL,
	`sourceApprovalStatus` enum('approved_external','approved_internal','pending_confirmation','restricted') NOT NULL DEFAULT 'pending_confirmation',
	`sensitivity` enum('public','internal','confidential','restricted') NOT NULL DEFAULT 'internal',
	`status` enum('research_requested','source_pending_approval','draft_ready','revision_requested','approved_for_publication','withheld_for_governance_review','archived') NOT NULL DEFAULT 'source_pending_approval',
	`draftJson` json,
	`contentOwnerUserId` int NOT NULL,
	`requiredReviewerUserId` int,
	`targetDate` datetime,
	`isTestMode` boolean NOT NULL DEFAULT false,
	`publicationPerformed` boolean NOT NULL DEFAULT false,
	`promptVersion` varchar(64) NOT NULL DEFAULT 'ISEYC-MEDIA-DOC-1.0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_drafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `doc_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`moduleKey` varchar(100) NOT NULL,
	`recordId` int NOT NULL,
	`actorUserId` int,
	`eventType` varchar(100) NOT NULL,
	`detail` text,
	`isTestMode` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `doc_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `institutional_prompts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`promptKey` varchar(100) NOT NULL,
	`version` varchar(64) NOT NULL,
	`content` longtext NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `institutional_prompts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `docRole` enum('member','officer','administrator','presidential_council','national_president') DEFAULT 'member' NOT NULL;--> statement-breakpoint
CREATE INDEX `command_brief_status_idx` ON `command_brief_runs` (`status`);--> statement-breakpoint
CREATE INDEX `command_brief_test_idx` ON `command_brief_runs` (`isTestMode`);--> statement-breakpoint
CREATE INDEX `command_brief_created_idx` ON `command_brief_runs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `content_draft_status_idx` ON `content_drafts` (`status`);--> statement-breakpoint
CREATE INDEX `content_draft_test_idx` ON `content_drafts` (`isTestMode`);--> statement-breakpoint
CREATE INDEX `content_draft_owner_idx` ON `content_drafts` (`contentOwnerUserId`);--> statement-breakpoint
CREATE INDEX `doc_audit_module_record_idx` ON `doc_audit_log` (`moduleKey`,`recordId`);--> statement-breakpoint
CREATE INDEX `doc_audit_created_idx` ON `doc_audit_log` (`createdAt`);--> statement-breakpoint
CREATE INDEX `institutional_prompt_key_idx` ON `institutional_prompts` (`promptKey`);--> statement-breakpoint
CREATE INDEX `institutional_prompt_active_idx` ON `institutional_prompts` (`isActive`);