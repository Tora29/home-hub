-- Migration: 0010_expense_payer_not_null
-- Expense テーブルの payerUserId を NOT NULL に変更（テーブル再作成）
-- 事前確認: SELECT count(*) FROM Expense WHERE payerUserId IS NULL; → 0 件を確認済み

PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_Expense` (
	`id` TEXT NOT NULL PRIMARY KEY,
	`userId` TEXT NOT NULL,
	`amount` INTEGER NOT NULL,
	`categoryId` TEXT NOT NULL,
	`payerUserId` TEXT NOT NULL,
	`status` TEXT NOT NULL DEFAULT 'unapproved',
	`createdAt` INTEGER NOT NULL,
	FOREIGN KEY (`categoryId`) REFERENCES `ExpenseCategory`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`payerUserId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE restrict
);--> statement-breakpoint
INSERT INTO `__new_Expense`(`id`, `userId`, `amount`, `categoryId`, `payerUserId`, `status`, `createdAt`)
SELECT `id`, `userId`, `amount`, `categoryId`, `payerUserId`, `status`, `createdAt`
FROM `Expense`;--> statement-breakpoint
DROP TABLE `Expense`;--> statement-breakpoint
ALTER TABLE `__new_Expense` RENAME TO `Expense`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
