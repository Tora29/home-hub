-- Migration: 0011_workout
-- WorkoutExercise / WorkoutRecord / BodyWeightRecord テーブル追加

CREATE TABLE `WorkoutExercise` (
	`id` TEXT NOT NULL PRIMARY KEY,
	`userId` TEXT NOT NULL,
	`name` TEXT NOT NULL,
	`createdAt` INTEGER NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE TABLE `WorkoutRecord` (
	`id` TEXT NOT NULL PRIMARY KEY,
	`userId` TEXT NOT NULL,
	`exerciseId` TEXT NOT NULL,
	`date` TEXT NOT NULL,
	`weight` REAL NOT NULL,
	`reps` INTEGER NOT NULL,
	`createdAt` INTEGER NOT NULL,
	FOREIGN KEY (`exerciseId`) REFERENCES `WorkoutExercise`(`id`) ON UPDATE no action ON DELETE restrict
);--> statement-breakpoint
CREATE TABLE `BodyWeightRecord` (
	`id` TEXT NOT NULL PRIMARY KEY,
	`userId` TEXT NOT NULL,
	`date` TEXT NOT NULL,
	`weight` REAL NOT NULL,
	`createdAt` INTEGER NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `idx_workout_exercise_userId` ON `WorkoutExercise`(`userId`);--> statement-breakpoint
CREATE INDEX `idx_workout_record_userId` ON `WorkoutRecord`(`userId`);--> statement-breakpoint
CREATE INDEX `idx_workout_record_exerciseId` ON `WorkoutRecord`(`exerciseId`);--> statement-breakpoint
CREATE INDEX `idx_workout_record_date` ON `WorkoutRecord`(`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_body_weight_user_date` ON `BodyWeightRecord`(`userId`, `date`);--> statement-breakpoint
CREATE INDEX `idx_body_weight_userId` ON `BodyWeightRecord`(`userId`);
