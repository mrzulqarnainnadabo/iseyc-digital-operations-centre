CREATE TABLE `meeting_action_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`actionDescription` text NOT NULL,
	`accountableOwner` varchar(255) NOT NULL,
	`supportingParties` text,
	`dueDate` varchar(64),
	`sourceStatus` varchar(64) NOT NULL,
	`dependency` text,
	`evidenceLocation` varchar(512),
	`confirmationStatus` enum('draft','confirmed') NOT NULL DEFAULT 'draft',
	`confirmedByUserId` int,
	`confirmedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meeting_action_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meeting_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`actorUserId` int,
	`eventType` varchar(100) NOT NULL,
	`detail` text,
	`isTestMode` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meeting_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meeting_automation_settings` (
	`id` varchar(64) NOT NULL,
	`consolidationMinutes` int NOT NULL DEFAULT 12,
	`fallbackCronExpression` varchar(64) NOT NULL DEFAULT '0 */15 * * * *',
	`fallbackCronTaskUid` varchar(65),
	`fallbackEnabled` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meeting_automation_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meeting_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`originalName` varchar(512) NOT NULL,
	`documentType` enum('agenda','minutes','notes','transcript','decision_log','action_list','other') NOT NULL DEFAULT 'other',
	`mimeType` varchar(255) NOT NULL,
	`fileSizeBytes` int NOT NULL,
	`storageKey` varchar(1024) NOT NULL,
	`storageUrl` varchar(1024) NOT NULL,
	`extractedText` longtext,
	`uploadedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meeting_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meeting_record_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`submissionId` int NOT NULL,
	`sectionKey` varchar(100) NOT NULL,
	`decision` enum('approved','revision_requested','rejected') NOT NULL,
	`reviewNote` text,
	`reviewerUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meeting_record_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meeting_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meetingTitle` varchar(512) NOT NULL,
	`meetingDate` varchar(64),
	`conveningBody` varchar(255),
	`sensitivity` enum('public','internal','confidential','restricted','not_recorded') NOT NULL DEFAULT 'internal',
	`sourceGroupKey` varchar(160) NOT NULL,
	`isTestMode` boolean NOT NULL DEFAULT false,
	`status` enum('pending_consolidation','processing','draft_ready','under_review','approved','needs_human_review','blocked') NOT NULL DEFAULT 'pending_consolidation',
	`statusReason` text,
	`submittedByUserId` int NOT NULL,
	`approvedByUserId` int,
	`approvedAt` datetime,
	`consolidationEligibleAt` datetime NOT NULL,
	`processingAttemptedAt` datetime,
	`recordJson` json,
	`authoritativePromptVersion` varchar(64) NOT NULL DEFAULT 'ISEYC-MDT-1.0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meeting_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `meeting_action_submission_idx` ON `meeting_action_items` (`submissionId`);--> statement-breakpoint
CREATE INDEX `meeting_audit_submission_idx` ON `meeting_audit_log` (`submissionId`);--> statement-breakpoint
CREATE INDEX `meeting_file_submission_idx` ON `meeting_files` (`submissionId`);--> statement-breakpoint
CREATE INDEX `meeting_review_submission_idx` ON `meeting_record_reviews` (`submissionId`);--> statement-breakpoint
CREATE INDEX `meeting_submission_status_idx` ON `meeting_submissions` (`status`);--> statement-breakpoint
CREATE INDEX `meeting_submission_due_idx` ON `meeting_submissions` (`consolidationEligibleAt`);--> statement-breakpoint
CREATE INDEX `meeting_submission_group_idx` ON `meeting_submissions` (`sourceGroupKey`);--> statement-breakpoint
CREATE INDEX `meeting_submission_submitter_idx` ON `meeting_submissions` (`submittedByUserId`);--> statement-breakpoint
CREATE INDEX `meeting_submission_test_idx` ON `meeting_submissions` (`isTestMode`);