-- Migration: 0015_calendar_event
-- CalendarEvent テーブル追加

CREATE TABLE `CalendarEvent` (
	`id` TEXT NOT NULL PRIMARY KEY,
	`title` TEXT NOT NULL,
	`description` TEXT,
	`date` TEXT NOT NULL,
	`createdByUserId` TEXT NOT NULL,
	`createdAt` INTEGER NOT NULL,
	`updatedAt` INTEGER NOT NULL,
	FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE restrict
);
