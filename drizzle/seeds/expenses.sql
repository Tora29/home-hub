-- 支出シードデータ（ローカル開発用）
-- 実行: wrangler d1 execute home-hub --local --file=drizzle/seeds/expenses.sql

-- カテゴリ
INSERT INTO "ExpenseCategory" ("id", "userId", "name", "createdAt") VALUES
  ('seed-cat-001', (SELECT id FROM "User" LIMIT 1), '食費',     strftime('%s', '2026-01-01')),
  ('seed-cat-002', (SELECT id FROM "User" LIMIT 1), '家賃',     strftime('%s', '2026-01-01')),
  ('seed-cat-003', (SELECT id FROM "User" LIMIT 1), '光熱費',   strftime('%s', '2026-01-01')),
  ('seed-cat-004', (SELECT id FROM "User" LIMIT 1), '日用品',   strftime('%s', '2026-01-01')),
  ('seed-cat-005', (SELECT id FROM "User" LIMIT 1), '交通費',   strftime('%s', '2026-01-01'));

-- 支出（2月・3月分）
INSERT INTO "Expense" ("id", "userId", "amount", "categoryId", "approvedAt", "createdAt") VALUES
  -- 2月
  ('seed-exp-001', (SELECT id FROM "User" LIMIT 1),  85000, 'seed-cat-002', strftime('%s', '2026-02-01'), strftime('%s', '2026-02-01')),
  ('seed-exp-002', (SELECT id FROM "User" LIMIT 1),   8200, 'seed-cat-001', strftime('%s', '2026-02-05'), strftime('%s', '2026-02-05')),
  ('seed-exp-003', (SELECT id FROM "User" LIMIT 1),   6800, 'seed-cat-001', strftime('%s', '2026-02-12'), strftime('%s', '2026-02-12')),
  ('seed-exp-004', (SELECT id FROM "User" LIMIT 1),   4500, 'seed-cat-003', strftime('%s', '2026-02-15'), strftime('%s', '2026-02-15')),
  ('seed-exp-005', (SELECT id FROM "User" LIMIT 1),   3200, 'seed-cat-004', strftime('%s', '2026-02-18'), strftime('%s', '2026-02-18')),
  ('seed-exp-006', (SELECT id FROM "User" LIMIT 1),   7400, 'seed-cat-001', strftime('%s', '2026-02-25'), strftime('%s', '2026-02-25')),
  -- 3月（一部未承認）
  ('seed-exp-007', (SELECT id FROM "User" LIMIT 1),  85000, 'seed-cat-002', strftime('%s', '2026-03-01'), strftime('%s', '2026-03-01')),
  ('seed-exp-008', (SELECT id FROM "User" LIMIT 1),   9100, 'seed-cat-001', strftime('%s', '2026-03-05'), strftime('%s', '2026-03-05')),
  ('seed-exp-009', (SELECT id FROM "User" LIMIT 1),   1200, 'seed-cat-005', strftime('%s', '2026-03-08'), strftime('%s', '2026-03-08')),
  ('seed-exp-010', (SELECT id FROM "User" LIMIT 1),   5300, 'seed-cat-003',                         NULL, strftime('%s', '2026-03-10')),
  ('seed-exp-011', (SELECT id FROM "User" LIMIT 1),   4100, 'seed-cat-004',                         NULL, strftime('%s', '2026-03-15')),
  ('seed-exp-012', (SELECT id FROM "User" LIMIT 1),   8600, 'seed-cat-001',                         NULL, strftime('%s', '2026-03-20'));
