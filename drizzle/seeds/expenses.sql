-- 支出シードデータ（ローカル開発用）
-- 実行: wrangler d1 execute home-hub --local --file=drizzle/seeds/expenses.sql
-- INSERT OR REPLACE / INSERT OR IGNORE で冪等（何度実行しても同じ結果）
--
-- 前提: ユーザーが1人以上存在すること（seed-user.sh 実行済みか既存ユーザーが登録済み）
-- 2ユーザー以上いる場合はパートナーの支出データも投入し、世帯合算のデモが可能
--
-- ユーザー参照方針:
--   メイン:    (SELECT id FROM "User" ORDER BY createdAt LIMIT 1)
--   パートナー: (SELECT id FROM "User" ORDER BY createdAt LIMIT 1 OFFSET 1)

-- ---- カテゴリ（全ユーザー共通） ----
INSERT OR REPLACE INTO "ExpenseCategory" ("id", "name", "createdAt") VALUES
  ('seed-cat-001', '食費',   strftime('%s', '2026-01-01')),
  ('seed-cat-002', '家賃',   strftime('%s', '2026-01-01')),
  ('seed-cat-003', '光熱費', strftime('%s', '2026-01-01')),
  ('seed-cat-004', '日用品', strftime('%s', '2026-01-01')),
  ('seed-cat-005', '交通費', strftime('%s', '2026-01-01'));

-- ---- 支出（2026-02: 全件 approved・過去の確定済みデータ） ----
INSERT OR REPLACE INTO "Expense" ("id", "userId", "amount", "categoryId", "payerUserId", "status", "createdAt") VALUES
  ('seed-exp-001', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),  85000, 'seed-cat-002', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'approved', strftime('%s', '2026-02-01')),
  ('seed-exp-002', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),   8200, 'seed-cat-001', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'approved', strftime('%s', '2026-02-05')),
  ('seed-exp-003', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),   6800, 'seed-cat-001', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'approved', strftime('%s', '2026-02-12')),
  ('seed-exp-004', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),   4500, 'seed-cat-003', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'approved', strftime('%s', '2026-02-15')),
  ('seed-exp-005', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),   3200, 'seed-cat-004', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'approved', strftime('%s', '2026-02-18')),
  ('seed-exp-006', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),   7400, 'seed-cat-001', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'approved', strftime('%s', '2026-02-25'));

-- ---- 支出（2026-03: approved / pending 混在・先々月データ） ----
INSERT OR REPLACE INTO "Expense" ("id", "userId", "amount", "categoryId", "payerUserId", "status", "createdAt") VALUES
  ('seed-exp-007', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),  85000, 'seed-cat-002', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'approved', strftime('%s', '2026-03-01')),
  ('seed-exp-008', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),   9100, 'seed-cat-001', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'approved', strftime('%s', '2026-03-05')),
  ('seed-exp-009', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),   1200, 'seed-cat-005', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'approved', strftime('%s', '2026-03-08')),
  ('seed-exp-010', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),   5300, 'seed-cat-003', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'pending',  strftime('%s', '2026-03-10')),
  ('seed-exp-011', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),   4100, 'seed-cat-004', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'pending',  strftime('%s', '2026-03-15')),
  ('seed-exp-012', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),   8600, 'seed-cat-001', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'checked',  strftime('%s', '2026-03-20'));

-- ---- 支出（2026-04: 過去データ） ----
INSERT OR REPLACE INTO "Expense" ("id", "userId", "amount", "categoryId", "payerUserId", "status", "createdAt") VALUES
  ('seed-exp-013', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),  85000, 'seed-cat-002', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'approved',   strftime('%s', '2026-04-01')),
  ('seed-exp-014', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),   7800, 'seed-cat-001', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'approved',   strftime('%s', '2026-04-03')),
  ('seed-exp-015', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),   5400, 'seed-cat-003', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'approved',   strftime('%s', '2026-04-05')),
  ('seed-exp-016', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),   3100, 'seed-cat-004', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'approved',   strftime('%s', '2026-04-08')),
  ('seed-exp-017', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),   2300, 'seed-cat-005', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'approved',   strftime('%s', '2026-04-10'));

-- ---- 支出（2026-05: 先月・approved/pending/checked 混在） ----
INSERT OR REPLACE INTO "Expense" ("id", "userId", "amount", "categoryId", "payerUserId", "status", "createdAt") VALUES
  ('seed-exp-018', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),  85000, 'seed-cat-002', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'approved',   strftime('%s', '2026-05-01')),
  ('seed-exp-019', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),  11200, 'seed-cat-001', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'approved',   strftime('%s', '2026-05-08')),
  ('seed-exp-020', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),   4800, 'seed-cat-003', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'pending',    strftime('%s', '2026-05-12')),
  ('seed-exp-021', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),   6200, 'seed-cat-001', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'checked',    strftime('%s', '2026-05-20')),
  ('seed-exp-022', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),   1900, 'seed-cat-005', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'unapproved', strftime('%s', '2026-05-25'));

-- ---- 支出（2026-06: 当月・メインユーザー） ----
INSERT OR REPLACE INTO "Expense" ("id", "userId", "amount", "categoryId", "payerUserId", "status", "createdAt") VALUES
  ('seed-exp-101', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),  85000, 'seed-cat-002', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'unapproved', strftime('%s', '2026-06-01')),
  ('seed-exp-102', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),   9500, 'seed-cat-001', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'unapproved', strftime('%s', '2026-06-02')),
  ('seed-exp-103', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),   5200, 'seed-cat-003', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'checked',    strftime('%s', '2026-06-03')),
  ('seed-exp-104', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1),   3800, 'seed-cat-004', (SELECT id FROM "User" ORDER BY createdAt LIMIT 1), 'unapproved', strftime('%s', '2026-06-03'));

-- ---- 支出（2026-06: 当月・パートナー、2人目が存在する場合のみ） ----
INSERT OR IGNORE INTO "Expense" ("id", "userId", "amount", "categoryId", "payerUserId", "status", "createdAt")
SELECT 'seed-exp-201', id, 12000, 'seed-cat-001', id, 'unapproved', strftime('%s', '2026-06-01') FROM "User" ORDER BY createdAt LIMIT 1 OFFSET 1;
INSERT OR IGNORE INTO "Expense" ("id", "userId", "amount", "categoryId", "payerUserId", "status", "createdAt")
SELECT 'seed-exp-202', id,  4500, 'seed-cat-005', id, 'checked',    strftime('%s', '2026-06-02') FROM "User" ORDER BY createdAt LIMIT 1 OFFSET 1;
INSERT OR IGNORE INTO "Expense" ("id", "userId", "amount", "categoryId", "payerUserId", "status", "createdAt")
SELECT 'seed-exp-203', id,  6800, 'seed-cat-001', id, 'unapproved', strftime('%s', '2026-06-03') FROM "User" ORDER BY createdAt LIMIT 1 OFFSET 1;
INSERT OR IGNORE INTO "Expense" ("id", "userId", "amount", "categoryId", "payerUserId", "status", "createdAt")
SELECT 'seed-exp-204', id,  2200, 'seed-cat-004', id, 'unapproved', strftime('%s', '2026-06-03') FROM "User" ORDER BY createdAt LIMIT 1 OFFSET 1;
