PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_Expense` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`amount` integer NOT NULL,
	`categoryId` text NOT NULL,
	`approvedAt` integer,
	`finalizedAt` integer,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`categoryId`) REFERENCES `ExpenseCategory`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_Expense`("id", "userId", "amount", "categoryId", "approvedAt", "finalizedAt", "createdAt") SELECT "id", "userId", "amount", "categoryId", "approvedAt", "finalizedAt", "createdAt" FROM `Expense`;--> statement-breakpoint
DROP TABLE `Expense`;--> statement-breakpoint
ALTER TABLE `__new_Expense` RENAME TO `Expense`;--> statement-breakpoint
PRAGMA foreign_keys=ON;