-- payers 廃止 + 承認ワークフロー刷新 + role 追加
--
-- 変更内容:
--   User: role カラム追加（nullable → 既存ユーザーは createdAt 順で primary/spouse を自動付与）
--   Expense: status カラム追加（unapproved/checked/pending/approved）
--            payerUserId カラム追加（User.id への FK。ExpensePayer.userId から backfill）
--            payerId / approvedAt / finalizedAt カラム削除
--   ExpensePayer: 既存データを backfill 後にテーブル削除
--
-- データ移行:
--   status: finalizedAt IS NOT NULL → 'approved'
--           approvedAt IS NOT NULL AND finalizedAt IS NULL → 'checked'
--           otherwise → 'unapproved'
--   payerUserId: Expense.payerId → ExpensePayer.id → ExpensePayer.userId で解決
--   User.role: createdAt 昇順で 1番目 = 'primary', 2番目 = 'spouse', それ以外 = NULL

PRAGMA foreign_keys=OFF;--> statement-breakpoint

-- 0. ExpensePayer が存在しない環境（0006 をスキップした新規 DB）向けの防御的作成
--    0006 適用済みの環境では IF NOT EXISTS により無視される
CREATE TABLE IF NOT EXISTS `ExpensePayer` (
	`id` TEXT NOT NULL PRIMARY KEY,
	`userId` TEXT NOT NULL,
	`name` TEXT NOT NULL,
	`createdAt` INTEGER NOT NULL
);--> statement-breakpoint

-- 1. User に role カラムを追加
ALTER TABLE `User` ADD COLUMN `role` text;--> statement-breakpoint

-- 2. 既存ユーザーに role を割り当て（createdAt 昇順: 1番目=primary, 2番目=spouse）
UPDATE `User` SET `role` = CASE
  WHEN `id` = (SELECT `id` FROM `User` ORDER BY `createdAt` ASC LIMIT 1) THEN 'primary'
  WHEN `id` = (SELECT `id` FROM `User` ORDER BY `createdAt` ASC LIMIT 1 OFFSET 1) THEN 'spouse'
  ELSE NULL
END;--> statement-breakpoint

-- 3. Expense テーブルを新スキーマで再作成
CREATE TABLE `__new_Expense` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`amount` integer NOT NULL,
	`categoryId` text NOT NULL,
	`payerUserId` text,
	`status` text NOT NULL DEFAULT 'unapproved',
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`categoryId`) REFERENCES `ExpenseCategory`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`payerUserId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE restrict
);--> statement-breakpoint

-- 4. 既存 Expense を新テーブルへコピー
--    payerUserId: Expense.payerId → ExpensePayer.userId で解決（BackFill）
--    status: finalizedAt/approvedAt から変換
INSERT INTO `__new_Expense`(`id`, `userId`, `amount`, `categoryId`, `payerUserId`, `status`, `createdAt`)
SELECT
	e.`id`,
	e.`userId`,
	e.`amount`,
	e.`categoryId`,
	ep.`userId` AS `payerUserId`,
	CASE
		WHEN e.`finalizedAt` IS NOT NULL THEN 'approved'
		WHEN e.`approvedAt` IS NOT NULL THEN 'checked'
		ELSE 'unapproved'
	END AS `status`,
	e.`createdAt`
FROM `Expense` e
LEFT JOIN `ExpensePayer` ep ON ep.`id` = e.`payerId`;--> statement-breakpoint

DROP TABLE `Expense`;--> statement-breakpoint
ALTER TABLE `__new_Expense` RENAME TO `Expense`;--> statement-breakpoint

-- 5. ExpensePayer テーブルを削除（backfill 完了後）
DROP TABLE IF EXISTS `ExpensePayer`;--> statement-breakpoint

PRAGMA foreign_keys=ON;
