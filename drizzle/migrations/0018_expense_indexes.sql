-- Migration: 0018_expense_indexes
-- Expense へのインデックス追加（月フィルタ・承認フロー・カテゴリ参照件数）。CREATE INDEX のみ（非破壊）

CREATE INDEX `Expense_createdAt_idx` ON `Expense` (`createdAt`);--> statement-breakpoint
CREATE INDEX `Expense_status_userId_idx` ON `Expense` (`status`,`userId`);--> statement-breakpoint
CREATE INDEX `Expense_categoryId_idx` ON `Expense` (`categoryId`);
