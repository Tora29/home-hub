-- 筋トレシードデータ（ローカル開発用）
-- 実行: wrangler d1 execute home-hub --local --file=drizzle/seeds/workout.sql
--
-- 前提: ユーザーが1人以上存在すること
-- ユーザー参照方針:
--   メイン: (SELECT id FROM "User" WHERE role = 'main' LIMIT 1)

-- ---- 種目 ----
INSERT OR REPLACE INTO "WorkoutExercise" ("id", "userId", "name", "createdAt") VALUES
  ('seed-ex-001', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'ベンチプレス',     strftime('%s', '2026-01-01')),
  ('seed-ex-002', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'スクワット',       strftime('%s', '2026-01-01')),
  ('seed-ex-003', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'デッドリフト',     strftime('%s', '2026-01-01')),
  ('seed-ex-004', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'ショルダープレス', strftime('%s', '2026-01-01')),
  ('seed-ex-005', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'ラットプルダウン', strftime('%s', '2026-01-01'));

-- ---- 記録（2026-04〜05 / ベンチプレス・重量増加の流れ） ----
INSERT OR REPLACE INTO "WorkoutRecord" ("id", "userId", "exerciseId", "date", "weight", "reps", "createdAt") VALUES
  ('seed-wr-001', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-001', '2026-04-01', 60.0, 10, strftime('%s', '2026-04-01')),
  ('seed-wr-002', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-001', '2026-04-01', 70.0,  8, strftime('%s', '2026-04-01')),
  ('seed-wr-003', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-001', '2026-04-01', 75.0,  5, strftime('%s', '2026-04-01')),
  ('seed-wr-004', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-001', '2026-04-08', 60.0, 10, strftime('%s', '2026-04-08')),
  ('seed-wr-005', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-001', '2026-04-08', 72.5,  8, strftime('%s', '2026-04-08')),
  ('seed-wr-006', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-001', '2026-04-08', 77.5,  5, strftime('%s', '2026-04-08')),
  ('seed-wr-007', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-001', '2026-04-15', 60.0, 10, strftime('%s', '2026-04-15')),
  ('seed-wr-008', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-001', '2026-04-15', 75.0,  8, strftime('%s', '2026-04-15')),
  ('seed-wr-009', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-001', '2026-04-15', 80.0,  5, strftime('%s', '2026-04-15')),
  ('seed-wr-010', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-001', '2026-05-01', 60.0, 10, strftime('%s', '2026-05-01')),
  ('seed-wr-011', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-001', '2026-05-01', 77.5,  8, strftime('%s', '2026-05-01')),
  ('seed-wr-012', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-001', '2026-05-01', 82.5,  5, strftime('%s', '2026-05-01')),
  ('seed-wr-013', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-001', '2026-05-15', 60.0, 10, strftime('%s', '2026-05-15')),
  ('seed-wr-014', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-001', '2026-05-15', 80.0,  8, strftime('%s', '2026-05-15')),
  ('seed-wr-015', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-001', '2026-05-15', 85.0,  5, strftime('%s', '2026-05-15')),
  -- 2026-06（当月・1ヶ月ビュー用）
  ('seed-wr-022', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-001', '2026-06-02', 60.0, 10, strftime('%s', '2026-06-02')),
  ('seed-wr-023', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-001', '2026-06-02', 82.5,  8, strftime('%s', '2026-06-02')),
  ('seed-wr-024', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-001', '2026-06-02', 87.5,  5, strftime('%s', '2026-06-02')),
  -- スクワット
  ('seed-wr-016', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-002', '2026-04-02', 80.0, 10, strftime('%s', '2026-04-02')),
  ('seed-wr-017', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-002', '2026-04-02', 100.0, 8, strftime('%s', '2026-04-02')),
  ('seed-wr-018', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-002', '2026-04-09', 80.0, 10, strftime('%s', '2026-04-09')),
  ('seed-wr-019', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-002', '2026-04-09', 105.0, 8, strftime('%s', '2026-04-09')),
  ('seed-wr-020', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-002', '2026-05-02', 80.0, 10, strftime('%s', '2026-05-02')),
  ('seed-wr-021', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), 'seed-ex-002', '2026-05-02', 110.0, 8, strftime('%s', '2026-05-02'));

-- ---- 体重記録（2026-04〜05） ----
INSERT OR REPLACE INTO "BodyWeightRecord" ("id", "userId", "date", "weight", "createdAt") VALUES
  ('seed-bw-001', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), '2026-04-01', 75.2, strftime('%s', '2026-04-01')),
  ('seed-bw-002', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), '2026-04-08', 74.8, strftime('%s', '2026-04-08')),
  ('seed-bw-003', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), '2026-04-15', 74.5, strftime('%s', '2026-04-15')),
  ('seed-bw-004', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), '2026-05-01', 74.1, strftime('%s', '2026-05-01')),
  ('seed-bw-005', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), '2026-05-15', 73.8, strftime('%s', '2026-05-15')),
  ('seed-bw-006', (SELECT id FROM "User" WHERE role = 'main' LIMIT 1), '2026-06-02', 73.5, strftime('%s', '2026-06-02'));
