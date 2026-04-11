-- 支出シードデータ（ローカル開発用）
-- 実行: wrangler d1 execute home-hub --local --file=drizzle/seeds/expenses.sql
-- カテゴリは INSERT OR IGNORE（FK 参照済みの既存行を REPLACE で消さないため）
-- 支出は INSERT OR REPLACE で冪等
--
-- ユーザー構成:
--   primary (createdAt 昇順 1番目): 自分
--   spouse  (createdAt 昇順 2番目): パートナー

-- ユーザー role 設定（シード実行時に必ず primary/spouse を付与する）
UPDATE "User" SET "role" = CASE
  WHEN "id" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1)          THEN 'primary'
  WHEN "id" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1 OFFSET 1) THEN 'spouse'
  ELSE NULL
END;

-- カテゴリ（primary ユーザーが作成）
INSERT OR IGNORE INTO "ExpenseCategory" ("id", "userId", "name", "createdAt") VALUES
  ('seed-cat-001', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1), '食費',   strftime('%s', '2026-01-01')),
  ('seed-cat-002', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1), '家賃',   strftime('%s', '2026-01-01')),
  ('seed-cat-003', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1), '光熱費', strftime('%s', '2026-01-01')),
  ('seed-cat-004', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1), '日用品', strftime('%s', '2026-01-01')),
  ('seed-cat-005', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1), '交通費', strftime('%s', '2026-01-01'));

-- 支出（2月：全件承認済み）
--   userId: 登録者、payerUserId: 支払者（primary / spouse を交互に）
INSERT OR REPLACE INTO "Expense" ("id", "userId", "amount", "categoryId", "payerUserId", "status", "createdAt") VALUES
  ('seed-exp-001', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),  85000, 'seed-cat-002', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),            'approved', strftime('%s', '2026-02-01')),
  ('seed-exp-002', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),   8200, 'seed-cat-001', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),            'approved', strftime('%s', '2026-02-05')),
  ('seed-exp-003', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),   6800, 'seed-cat-001', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1 OFFSET 1),   'approved', strftime('%s', '2026-02-12')),
  ('seed-exp-004', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),   4500, 'seed-cat-003', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),            'approved', strftime('%s', '2026-02-15')),
  ('seed-exp-005', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),   3200, 'seed-cat-004', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1 OFFSET 1),   'approved', strftime('%s', '2026-02-18')),
  ('seed-exp-006', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),   7400, 'seed-cat-001', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),            'approved', strftime('%s', '2026-02-25'));

-- 支出（3月：approved / checked / unapproved の混在）
--   seed-exp-007/008: approved（承認済み）
--   seed-exp-009:     checked（確認済み）
--   seed-exp-010〜012: unapproved（未承認）
INSERT OR REPLACE INTO "Expense" ("id", "userId", "amount", "categoryId", "payerUserId", "status", "createdAt") VALUES
  ('seed-exp-007', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),  85000, 'seed-cat-002', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),            'approved',   strftime('%s', '2026-03-01')),
  ('seed-exp-008', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),   9100, 'seed-cat-001', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1 OFFSET 1),   'approved',   strftime('%s', '2026-03-05')),
  ('seed-exp-009', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),   1200, 'seed-cat-005', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),            'checked',    strftime('%s', '2026-03-08')),
  ('seed-exp-010', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),   5300, 'seed-cat-003', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1 OFFSET 1),   'unapproved', strftime('%s', '2026-03-10')),
  ('seed-exp-011', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),   4100, 'seed-cat-004', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),            'unapproved', strftime('%s', '2026-03-15')),
  ('seed-exp-012', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),   8600, 'seed-cat-001', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1 OFFSET 1),   'unapproved', strftime('%s', '2026-03-20'));

-- 支出（4月当月：checked / unapproved の混在）
--   checked が 1 件あるので「承認依頼する」ボタンが表示される
INSERT OR REPLACE INTO "Expense" ("id", "userId", "amount", "categoryId", "payerUserId", "status", "createdAt") VALUES
  ('seed-exp-013', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),   6200, 'seed-cat-001', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),            'checked',    strftime('%s', '2026-04-03')),
  ('seed-exp-014', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1),   2800, 'seed-cat-004', (SELECT id FROM "User" ORDER BY createdAt ASC LIMIT 1 OFFSET 1),   'unapproved', strftime('%s', '2026-04-07'));
