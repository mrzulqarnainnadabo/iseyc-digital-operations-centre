CREATE TABLE `chamber_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`actorUserId` int,
	`eventType` varchar(100) NOT NULL,
	`detail` text,
	`isTestMode` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chamber_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chamber_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`originalName` varchar(512) NOT NULL,
	`mimeType` varchar(255) NOT NULL,
	`fileSizeBytes` int NOT NULL,
	`storageKey` varchar(1024) NOT NULL,
	`storageUrl` varchar(1024) NOT NULL,
	`extractedText` longtext,
	`intelligenceStatus` enum('source_ready','analysis_requested','analysis_draft_ready','withheld_for_review') NOT NULL DEFAULT 'source_ready',
	`uploadedByUserId` int NOT NULL,
	`isTestMode` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chamber_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chamber_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`userId` int,
	`invitedEmail` varchar(320),
	`displayName` varchar(255) NOT NULL,
	`officialPosition` varchar(255) NOT NULL,
	`participantType` enum('internal','authorised_visitor') NOT NULL DEFAULT 'internal',
	`sessionRole` enum('chair','presenter','participant','observer') NOT NULL DEFAULT 'participant',
	`admissionStatus` enum('invited','admitted','declined','removed') NOT NULL DEFAULT 'invited',
	`admittedByUserId` int,
	`admittedAt` datetime,
	`joinedAt` datetime,
	`leftAt` datetime,
	`isTestMode` boolean NOT NULL DEFAULT false,
	`addedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chamber_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chamber_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(512) NOT NULL,
	`description` text,
	`sessionType` enum('internal_meeting','visitor_session','seminar') NOT NULL,
	`conveningBody` varchar(255),
	`chairUserId` int NOT NULL,
	`sensitivity` enum('public','internal','confidential','restricted') NOT NULL DEFAULT 'internal',
	`agendaJson` json,
	`scheduledStartAt` datetime,
	`scheduledEndAt` datetime,
	`status` enum('draft','scheduled','open','closed','cancelled','archived') NOT NULL DEFAULT 'draft',
	`linkedMeetingSubmissionId` int,
	`trackerLinkStatus` enum('not_linked','draft_requested','linked') NOT NULL DEFAULT 'not_linked',
	`isTestMode` boolean NOT NULL DEFAULT false,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chamber_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `chamber_audit_session_idx` ON `chamber_audit_log` (`sessionId`);--> statement-breakpoint
CREATE INDEX `chamber_audit_created_idx` ON `chamber_audit_log` (`createdAt`);--> statement-breakpoint
CREATE INDEX `chamber_document_session_idx` ON `chamber_documents` (`sessionId`);--> statement-breakpoint
CREATE INDEX `chamber_document_status_idx` ON `chamber_documents` (`intelligenceStatus`);--> statement-breakpoint
CREATE INDEX `chamber_document_test_idx` ON `chamber_documents` (`isTestMode`);--> statement-breakpoint
CREATE INDEX `chamber_participant_session_idx` ON `chamber_participants` (`sessionId`);--> statement-breakpoint
CREATE INDEX `chamber_participant_user_idx` ON `chamber_participants` (`userId`);--> statement-breakpoint
CREATE INDEX `chamber_participant_admission_idx` ON `chamber_participants` (`admissionStatus`);--> statement-breakpoint
CREATE INDEX `chamber_participant_test_idx` ON `chamber_participants` (`isTestMode`);--> statement-breakpoint
CREATE INDEX `chamber_session_status_idx` ON `chamber_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `chamber_session_chair_idx` ON `chamber_sessions` (`chairUserId`);--> statement-breakpoint
CREATE INDEX `chamber_session_test_idx` ON `chamber_sessions` (`isTestMode`);--> statement-breakpoint
CREATE INDEX `chamber_session_start_idx` ON `chamber_sessions` (`scheduledStartAt`);