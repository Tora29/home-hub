-- 支出シードデータ（ローカル開発用）
-- 実行: wrangler d1 execute home-hub --local --file=drizzle/seeds/expenses.sql
-- INSERT OR REPLACE で冪等（何度実行しても同じ結果）
--
-- 前提: seed-user.sh でテストユーザー（test@example.com）が作成済みであること
-- payerUserId には登録ユーザー自身の ID を使用（シングルユーザー環境）

-- カテゴリ
INSERT OR REPLACE INTO "ExpenseCategory" ("id", "userId", "name", "createdAt") VALUES
  ('seed-cat-001', (SELECT id FROM "User" LIMIT 1), '食費',   strftime('%s', '2026-01-01')),
  ('seed-cat-002', (SELECT id FROM "User" LIMIT 1), '家賃',   strftime('%s', '2026-01-01')),
  ('seed-cat-003', (SELECT id FROM "User" LIMIT 1), '光熱費', strftime('%s', '2026-01-01')),
  ('seed-cat-004', (SELECT id FROM "User" LIMIT 1), '日用品', strftime('%s', '2026-01-01')),
  ('seed-cat-005', (SELECT id FROM "User" LIMIT 1), '交通費', strftime('%s', '2026-01-01'));

-- 支出（2026-02: 全件 approved・過去の確定済みデータ）
INSERT OR REPLACE INTO "Expense" ("id", "userId", "amount", "categoryId", "payerUserId", "status", "createdAt") VALUES
  ('seed-exp-001', (SELECT id FROM "User" LIMIT 1),  85000, 'seed-cat-002', (SELECT id FROM "User" LIMIT 1), 'approved', strftime('%s', '2026-02-01')),
  ('seed-exp-002', (SELECT id FROM "User" LIMIT 1),   8200, 'seed-cat-001', (SELECT id FROM "User" LIMIT 1), 'approved', strftime('%s', '2026-02-05')),
  ('seed-exp-003', (SELECT id FROM "User" LIMIT 1),   6800, 'seed-cat-001', (SELECT id FROM "User" LIMIT 1), 'approved', strftime('%s', '2026-02-12')),
  ('seed-exp-004', (SELECT id FROM "User" LIMIT 1),   4500, 'seed-cat-003', (SELECT id FROM "User" LIMIT 1), 'approved', strftime('%s', '2026-02-15')),
  ('seed-exp-005', (SELECT id FROM "User" LIMIT 1),   3200, 'seed-cat-004', (SELECT id FROM "User" LIMIT 1), 'approved', strftime('%s', '2026-02-18')),
  ('seed-exp-006', (SELECT id FROM "User" LIMIT 1),   7400, 'seed-cat-001', (SELECT id FROM "User" LIMIT 1), 'approved', strftime('%s', '2026-02-25'));

-- 支出（2026-03: approved / pending 混在・先月の処理途中データ）
INSERT OR REPLACE INTO "Expense" ("id", "userId", "amount", "categoryId", "payerUserId", "status", "createdAt") VALUES
  ('seed-exp-007', (SELECT id FROM "User" LIMIT 1),  85000, 'seed-cat-002', (SELECT id FROM "User" LIMIT 1), 'approved', strftime('%s', '2026-03-01')),
  ('seed-exp-008', (SELECT id FROM "User" LIMIT 1),   9100, 'seed-cat-001', (SELECT id FROM "User" LIMIT 1), 'approved', strftime('%s', '2026-03-05')),
  ('seed-exp-009', (SELECT id FROM "User" LIMIT 1),   1200, 'seed-cat-005', (SELECT id FROM "User" LIMIT 1), 'approved', strftime('%s', '2026-03-08')),
  ('seed-exp-010', (SELECT id FROM "User" LIMIT 1),   5300, 'seed-cat-003', (SELECT id FROM "User" LIMIT 1), 'pending',  strftime('%s', '2026-03-10')),
  ('seed-exp-011', (SELECT id FROM "User" LIMIT 1),   4100, 'seed-cat-004', (SELECT id FROM "User" LIMIT 1), 'pending',  strftime('%s', '2026-03-15')),
  ('seed-exp-012', (SELECT id FROM "User" LIMIT 1),   8600, 'seed-cat-001', (SELECT id FROM "User" LIMIT 1), 'checked',  strftime('%s', '2026-03-20'));

-- 支出（2026-04: 当月・ワークフロー全ステータスのデモ）
INSERT OR REPLACE INTO "Expense" ("id", "userId", "amount", "categoryId", "payerUserId", "status", "createdAt") VALUES
  ('seed-exp-013', (SELECT id FROM "User" LIMIT 1),  85000, 'seed-cat-002', (SELECT id FROM "User" LIMIT 1), 'unapproved', strftime('%s', '2026-04-01')),
  ('seed-exp-014', (SELECT id FROM "User" LIMIT 1),   7800, 'seed-cat-001', (SELECT id FROM "User" LIMIT 1), 'unapproved', strftime('%s', '2026-04-03')),
  ('seed-exp-015', (SELECT id FROM "User" LIMIT 1),   5400, 'seed-cat-003',                             NULL, 'checked',   strftime('%s', '2026-04-05')),
  ('seed-exp-016', (SELECT id FROM "User" LIMIT 1),   3100, 'seed-cat-004', (SELECT id FROM "User" LIMIT 1), 'checked',   strftime('%s', '2026-04-08')),
  ('seed-exp-017', (SELECT id FROM "User" LIMIT 1),   2300, 'seed-cat-005',                             NULL, 'unapproved', strftime('%s', '2026-04-10'));
