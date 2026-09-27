-- Migration: 0019_user_fk
-- Expense.userId / WorkoutRecord.userId に User への FK（ON DELETE cascade）を追加（SQLite のためテーブル再作成）。
-- D1 は foreign_keys=OFF が効かないため defer_foreign_keys で検証をトランザクション末尾へ遅延する
-- （孤児 userId があれば FOREIGN KEY constraint failed で全体ロールバック）。
-- User.lineUserId は tables.ts から宣言のみ削除。旧コードが列を参照している間に DROP しないよう、
-- 物理削除は次リリースの custom migration で行う（drizzle が生成した DROP COLUMN はここから除外）。
PRAGMA defer_foreign_keys = on;--> statement-breakpoint
CREATE TABLE `__new_Expense` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`amount` integer NOT NULL,
	`categoryId` text NOT NULL,
	`payerUserId` text NOT NULL,
	`status` text DEFAULT 'unapproved' NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `ExpenseCategory`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`payerUserId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_Expense`("id", "userId", "amount", "categoryId", "payerUserId", "status", "createdAt") SELECT "id", "userId", "amount", "categoryId", "payerUserId", "status", "createdAt" FROM `Expense`;--> statement-breakpoint
DROP TABLE `Expense`;--> statement-breakpoint
ALTER TABLE `__new_Expense` RENAME TO `Expense`;--> statement-breakpoint
CREATE INDEX `Expense_createdAt_idx` ON `Expense` (`createdAt`);--> statement-breakpoint
CREATE INDEX `Expense_status_userId_idx` ON `Expense` (`status`,`userId`);--> statement-breakpoint
CREATE INDEX `Expense_categoryId_idx` ON `Expense` (`categoryId`);--> statement-breakpoint
CREATE TABLE `__new_WorkoutRecord` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`exerciseId` text NOT NULL,
	`date` text NOT NULL,
	`weight` real NOT NULL,
	`reps` integer NOT NULL,
	`isBodyWeight` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exerciseId`) REFERENCES `WorkoutExercise`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_WorkoutRecord`("id", "userId", "exerciseId", "date", "weight", "reps", "isBodyWeight", "createdAt") SELECT "id", "userId", "exerciseId", "date", "weight", "reps", "isBodyWeight", "createdAt" FROM `WorkoutRecord`;--> statement-breakpoint
DROP TABLE `WorkoutRecord`;--> statement-breakpoint
ALTER TABLE `__new_WorkoutRecord` RENAME TO `WorkoutRecord`;--> statement-breakpoint
CREATE INDEX `idx_workout_record_userId` ON `WorkoutRecord` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_workout_record_exerciseId` ON `WorkoutRecord` (`exerciseId`);--> statement-breakpoint
CREATE INDEX `idx_workout_record_date` ON `WorkoutRecord` (`date`);
