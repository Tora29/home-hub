-- Migration: 0008_expense_approval_workflow
-- User テーブルに role・lineUserId を追加
-- Expense テーブルを再作成（payerId→payerUserId リネーム、status 追加、approvedAt/finalizedAt 削除）
-- ExpensePayer テーブルを削除

-- 1. User テーブルにカラム追加
ALTER TABLE User ADD COLUMN role TEXT;--> statement-breakpoint
ALTER TABLE User ADD COLUMN lineUserId TEXT;--> statement-breakpoint

-- 2. Expense テーブル再作成
--    - payerId → payerUserId（FK参照先を ExpensePayer → User に変更）
--    - status カラム追加（既存データは 'unapproved' または 'approved' にマップ）
--    - approvedAt・finalizedAt を削除
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_Expense` (
	`id` TEXT NOT NULL PRIMARY KEY,
	`userId` TEXT NOT NULL,
	`amount` INTEGER NOT NULL,
	`categoryId` TEXT NOT NULL,
	`payerUserId` TEXT,
	`status` TEXT NOT NULL DEFAULT 'unapproved',
	`createdAt` INTEGER NOT NULL,
	FOREIGN KEY (`categoryId`) REFERENCES `ExpenseCategory`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`payerUserId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE restrict
);--> statement-breakpoint
INSERT INTO `__new_Expense`(`id`, `userId`, `amount`, `categoryId`, `payerUserId`, `status`, `createdAt`)
SELECT `id`, `userId`, `amount`, `categoryId`, `payerId`,
	CASE WHEN `approvedAt` IS NOT NULL THEN 'approved' ELSE 'unapproved' END,
	`createdAt`
FROM `Expense`;--> statement-breakpoint
DROP TABLE `Expense`;--> statement-breakpoint
ALTER TABLE `__new_Expense` RENAME TO `Expense`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint

-- 3. ExpensePayer テーブル削除
DROP TABLE IF EXISTS `ExpensePayer`;
