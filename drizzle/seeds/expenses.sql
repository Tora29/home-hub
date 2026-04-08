-- 支出シードデータ（ローカル開発用）
-- 実行: wrangler d1 execute home-hub --local --file=drizzle/seeds/expenses.sql
-- INSERT OR REPLACE で冪等（何度実行しても同じ結果）

-- カテゴリ
INSERT OR REPLACE INTO "ExpenseCategory" ("id", "userId", "name", "createdAt") VALUES
  ('seed-cat-001', (SELECT id FROM "User" LIMIT 1), '食費',   strftime('%s', '2026-01-01')),
  ('seed-cat-002', (SELECT id FROM "User" LIMIT 1), '家賃',   strftime('%s', '2026-01-01')),
  ('seed-cat-003', (SELECT id FROM "User" LIMIT 1), '光熱費', strftime('%s', '2026-01-01')),
  ('seed-cat-004', (SELECT id FROM "User" LIMIT 1), '日用品', strftime('%s', '2026-01-01')),
  ('seed-cat-005', (SELECT id FROM "User" LIMIT 1), '交通費', strftime('%s', '2026-01-01'));

-- 支払者
INSERT OR REPLACE INTO "ExpensePayer" ("id", "userId", "name", "createdAt") VALUES
  ('seed-payer-001', (SELECT id FROM "User" LIMIT 1), '自分',   strftime('%s', '2026-01-01')),
  ('seed-payer-002', (SELECT id FROM "User" LIMIT 1), 'パートナー', strftime('%s', '2026-01-01'));

-- 支出（2月：全件確定済み）
INSERT OR REPLACE INTO "Expense" ("id", "userId", "amount", "categoryId", "payerId", "approvedAt", "finalizedAt", "createdAt") VALUES
  ('seed-exp-001', (SELECT id FROM "User" LIMIT 1),  85000, 'seed-cat-002', 'seed-payer-001', strftime('%s', '2026-02-01'), strftime('%s', '2026-02-28'), strftime('%s', '2026-02-01')),
  ('seed-exp-002', (SELECT id FROM "User" LIMIT 1),   8200, 'seed-cat-001', 'seed-payer-001', strftime('%s', '2026-02-05'), strftime('%s', '2026-02-28'), strftime('%s', '2026-02-05')),
  ('seed-exp-003', (SELECT id FROM "User" LIMIT 1),   6800, 'seed-cat-001', 'seed-payer-002', strftime('%s', '2026-02-12'), strftime('%s', '2026-02-28'), strftime('%s', '2026-02-12')),
  ('seed-exp-004', (SELECT id FROM "User" LIMIT 1),   4500, 'seed-cat-003', 'seed-payer-001', strftime('%s', '2026-02-15'), strftime('%s', '2026-02-28'), strftime('%s', '2026-02-15')),
  ('seed-exp-005', (SELECT id FROM "User" LIMIT 1),   3200, 'seed-cat-004', 'seed-payer-002', strftime('%s', '2026-02-18'), strftime('%s', '2026-02-28'), strftime('%s', '2026-02-18')),
  ('seed-exp-006', (SELECT id FROM "User" LIMIT 1),   7400, 'seed-cat-001', 'seed-payer-001', strftime('%s', '2026-02-25'), strftime('%s', '2026-02-28'), strftime('%s', '2026-02-25'));

-- 支出（3月：確定済み・確認済み・未承認の混在）
INSERT OR REPLACE INTO "Expense" ("id", "userId", "amount", "categoryId", "payerId", "approvedAt", "finalizedAt", "createdAt") VALUES
  ('seed-exp-007', (SELECT id FROM "User" LIMIT 1),  85000, 'seed-cat-002', 'seed-payer-001', strftime('%s', '2026-03-01'), strftime('%s', '2026-03-15'), strftime('%s', '2026-03-01')),
  ('seed-exp-008', (SELECT id FROM "User" LIMIT 1),   9100, 'seed-cat-001', 'seed-payer-002', strftime('%s', '2026-03-05'), strftime('%s', '2026-03-15'), strftime('%s', '2026-03-05')),
  ('seed-exp-009', (SELECT id FROM "User" LIMIT 1),   1200, 'seed-cat-005', 'seed-payer-001', strftime('%s', '2026-03-08'),                         NULL, strftime('%s', '2026-03-08')),
  ('seed-exp-010', (SELECT id FROM "User" LIMIT 1),   5300, 'seed-cat-003', 'seed-payer-002',                         NULL,                         NULL, strftime('%s', '2026-03-10')),
  ('seed-exp-011', (SELECT id FROM "User" LIMIT 1),   4100, 'seed-cat-004', 'seed-payer-001',                         NULL,                         NULL, strftime('%s', '2026-03-15')),
  ('seed-exp-012', (SELECT id FROM "User" LIMIT 1),   8600, 'seed-cat-001', 'seed-payer-002',                         NULL,                         NULL, strftime('%s', '2026-03-20'));
