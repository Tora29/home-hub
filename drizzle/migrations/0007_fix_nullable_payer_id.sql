-- Fix: payerId を nullable に変更し、migration 0006 由来の payerId = '' を NULL に修正
-- migration 0006 では既存 Expense 行に payerId = '' をセットしたが、
-- ExpensePayer に id = '' のレコードは存在しないため外部キー整合性が壊れていた。
-- NULL に変換することでダッシュボードの overall と byPayer の集計不一致を解消する。
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_Expense` (
	`id` TEXT NOT NULL PRIMARY KEY,
	`userId` TEXT NOT NULL,
	`amount` INTEGER NOT NULL,
	`categoryId` TEXT NOT NULL,
	`payerId` TEXT,
	`approvedAt` INTEGER,
	`finalizedAt` INTEGER,
	`createdAt` INTEGER NOT NULL,
	FOREIGN KEY (`categoryId`) REFERENCES `ExpenseCategory`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`payerId`) REFERENCES `ExpensePayer`(`id`) ON UPDATE no action ON DELETE restrict
);--> statement-breakpoint
INSERT INTO `__new_Expense`(`id`, `userId`, `amount`, `categoryId`, `payerId`, `approvedAt`, `finalizedAt`, `createdAt`)
SELECT `id`, `userId`, `amount`, `categoryId`, NULLIF(`payerId`, ''), `approvedAt`, `finalizedAt`, `createdAt` FROM `Expense`;--> statement-breakpoint
DROP TABLE `Expense`;--> statement-breakpoint
ALTER TABLE `__new_Expense` RENAME TO `Expense`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
