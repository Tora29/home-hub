-- CreateTable: ExpensePayer
CREATE TABLE `ExpensePayer` (
	`id` TEXT NOT NULL PRIMARY KEY,
	`userId` TEXT NOT NULL,
	`name` TEXT NOT NULL,
	`createdAt` INTEGER NOT NULL
);
--> statement-breakpoint
-- AlterTable: Expense に payerId カラムを追加（既存行は NULL で移行）
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
);
--> statement-breakpoint
INSERT INTO `__new_Expense`(`id`, `userId`, `amount`, `categoryId`, `payerId`, `approvedAt`, `finalizedAt`, `createdAt`)
SELECT `id`, `userId`, `amount`, `categoryId`, NULL, `approvedAt`, `finalizedAt`, `createdAt` FROM `Expense`;
--> statement-breakpoint
DROP TABLE `Expense`;--> statement-breakpoint
ALTER TABLE `__new_Expense` RENAME TO `Expense`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
