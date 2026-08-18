CREATE TABLE `development_growth_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`focusPeriod` varchar(120) NOT NULL,
	`goalStatement` text NOT NULL,
	`nextAction` text,
	`memberReflection` text,
	`status` enum('draft','active','completed','paused') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `development_growth_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `development_participation_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`participationType` enum('meeting_contribution','community_contribution','development_reflection','department_activity') NOT NULL,
	`title` varchar(255) NOT NULL,
	`detail` text,
	`sourceRecordId` int,
	`confirmedByUserId` int,
	`confirmedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `development_participation_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mentorship_check_ins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`relationshipId` int NOT NULL,
	`checkInDate` datetime NOT NULL,
	`memberReflection` text,
	`mentorGuidance` text,
	`nextStep` text,
	`recordedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mentorship_check_ins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mentorship_relationships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menteeUserId` int NOT NULL,
	`mentorUserId` int,
	`status` enum('requested','active','paused','completed','declined') NOT NULL DEFAULT 'requested',
	`agreedFocus` text,
	`approvedByUserId` int,
	`approvedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mentorship_relationships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `growth_plan_user_idx` ON `development_growth_plans` (`userId`);--> statement-breakpoint
CREATE INDEX `growth_plan_status_idx` ON `development_growth_plans` (`status`);--> statement-breakpoint
CREATE INDEX `development_participation_user_idx` ON `development_participation_records` (`userId`);--> statement-breakpoint
CREATE INDEX `development_participation_confirmed_idx` ON `development_participation_records` (`confirmedAt`);--> statement-breakpoint
CREATE INDEX `mentorship_checkin_relationship_idx` ON `mentorship_check_ins` (`relationshipId`);--> statement-breakpoint
CREATE INDEX `mentorship_checkin_date_idx` ON `mentorship_check_ins` (`checkInDate`);--> statement-breakpoint
CREATE INDEX `mentorship_mentee_idx` ON `mentorship_relationships` (`menteeUserId`);--> statement-breakpoint
CREATE INDEX `mentorship_mentor_idx` ON `mentorship_relationships` (`mentorUserId`);--> statement-breakpoint
CREATE INDEX `mentorship_status_idx` ON `mentorship_relationships` (`status`);