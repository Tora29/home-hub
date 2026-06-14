-- Migration: 0013_workout_exercise_category
-- WorkoutExerciseCategory テーブル追加・WorkoutExercise に categoryId 追加

CREATE TABLE `WorkoutExerciseCategory` (
	`id` TEXT NOT NULL PRIMARY KEY,
	`userId` TEXT NOT NULL,
	`name` TEXT NOT NULL,
	`createdAt` INTEGER NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `idx_workout_exercise_category_userId` ON `WorkoutExerciseCategory` (`userId`);--> statement-breakpoint
ALTER TABLE `WorkoutExercise` ADD COLUMN `categoryId` TEXT REFERENCES `WorkoutExerciseCategory`(`id`) ON UPDATE no action ON DELETE set null;--> statement-breakpoint
CREATE INDEX `idx_workout_exercise_categoryId` ON `WorkoutExercise` (`categoryId`);
