CREATE TABLE `chamber_document_intelligence_drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`documentId` int NOT NULL,
	`promptVersion` varchar(64) NOT NULL,
	`draftJson` json,
	`status` enum('analysis_requested','draft_ready','under_review','approved_for_audio','withheld_for_review') NOT NULL DEFAULT 'analysis_requested',
	`sourceSetConfirmed` boolean NOT NULL DEFAULT false,
	`requestedByUserId` int NOT NULL,
	`reviewedByUserId` int,
	`reviewedAt` datetime,
	`statusReason` text,
	`isTestMode` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chamber_document_intelligence_drafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `chamber_intelligence_session_idx` ON `chamber_document_intelligence_drafts` (`sessionId`);--> statement-breakpoint
CREATE INDEX `chamber_intelligence_document_idx` ON `chamber_document_intelligence_drafts` (`documentId`);--> statement-breakpoint
CREATE INDEX `chamber_intelligence_status_idx` ON `chamber_document_intelligence_drafts` (`status`);--> statement-breakpoint
CREATE INDEX `chamber_intelligence_test_idx` ON `chamber_document_intelligence_drafts` (`isTestMode`);