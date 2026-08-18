CREATE TABLE `community_tiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tierKey` varchar(80) NOT NULL,
	`name` varchar(160) NOT NULL,
	`hierarchyOrder` int NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `community_tiers_id` PRIMARY KEY(`id`),
	CONSTRAINT `community_tiers_tierKey_unique` UNIQUE(`tierKey`),
	CONSTRAINT `community_tiers_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `community_units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tierId` int NOT NULL,
	`parentUnitId` int,
	`name` varchar(255) NOT NULL,
	`locality` varchar(255),
	`accountableLeadUserId` int,
	`status` enum('draft','active','paused','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `community_units_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `developmental_profiles` (
	`userId` int NOT NULL,
	`consentStatus` enum('not_requested','active','withdrawn') NOT NULL DEFAULT 'not_requested',
	`consentedAt` datetime,
	`consentVersion` varchar(64),
	`visibilityLevel` enum('private','mentor_guided','institutional_limited') NOT NULL DEFAULT 'private',
	`developmentDirection` json,
	`developmentGoals` text,
	`mentoringPreference` enum('not_selected','open_to_mentoring','seeking_mentor','mentoring_others','not_now') NOT NULL DEFAULT 'not_selected',
	`mentorUserId` int,
	`profileStatus` enum('not_started','active','paused') NOT NULL DEFAULT 'not_started',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `developmental_profiles_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
CREATE TABLE `member_community_affiliations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`communityUnitId` int,
	`tierId` int NOT NULL,
	`affiliationStatus` enum('self_declared','confirmed','inactive') NOT NULL DEFAULT 'self_declared',
	`confirmedByUserId` int,
	`confirmedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_community_affiliations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `member_pillar_focuses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pillarId` int NOT NULL,
	`focusStatus` enum('interested','contributing','mentored','inactive') NOT NULL DEFAULT 'interested',
	`visibilityLevel` enum('private','mentor_guided','institutional_limited') NOT NULL DEFAULT 'private',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `member_pillar_focuses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `responsibility_pillars` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pillarKey` varchar(100) NOT NULL,
	`name` varchar(200) NOT NULL,
	`responsibilityOrder` int NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `responsibility_pillars_id` PRIMARY KEY(`id`),
	CONSTRAINT `responsibility_pillars_pillarKey_unique` UNIQUE(`pillarKey`),
	CONSTRAINT `responsibility_pillars_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE INDEX `community_tier_order_idx` ON `community_tiers` (`hierarchyOrder`);--> statement-breakpoint
CREATE INDEX `community_unit_tier_idx` ON `community_units` (`tierId`);--> statement-breakpoint
CREATE INDEX `community_unit_parent_idx` ON `community_units` (`parentUnitId`);--> statement-breakpoint
CREATE INDEX `community_unit_status_idx` ON `community_units` (`status`);--> statement-breakpoint
CREATE INDEX `developmental_profile_consent_idx` ON `developmental_profiles` (`consentStatus`);--> statement-breakpoint
CREATE INDEX `developmental_profile_mentor_idx` ON `developmental_profiles` (`mentorUserId`);--> statement-breakpoint
CREATE INDEX `member_affiliation_user_idx` ON `member_community_affiliations` (`userId`);--> statement-breakpoint
CREATE INDEX `member_affiliation_tier_idx` ON `member_community_affiliations` (`tierId`);--> statement-breakpoint
CREATE INDEX `member_affiliation_unit_idx` ON `member_community_affiliations` (`communityUnitId`);--> statement-breakpoint
CREATE INDEX `member_pillar_user_idx` ON `member_pillar_focuses` (`userId`);--> statement-breakpoint
CREATE INDEX `member_pillar_pillar_idx` ON `member_pillar_focuses` (`pillarId`);--> statement-breakpoint
CREATE INDEX `responsibility_pillar_order_idx` ON `responsibility_pillars` (`responsibilityOrder`);