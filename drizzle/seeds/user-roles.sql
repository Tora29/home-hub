-- ユーザーロール設定（ローカル開発用）
-- 実行: wrangler d1 execute home-hub --local --file=drizzle/seeds/user-roles.sql
--
-- createdAt 昇順で 1 人目を main、2 人目を partner に設定する。
-- Google OAuth / email 認証どちらで作成されたユーザーにも対応する。
-- INSERT OR REPLACE / UPDATE のため冪等（何度実行しても同じ結果）。

UPDATE "User" SET role = 'main'    WHERE id = (SELECT id FROM "User" ORDER BY createdAt LIMIT 1);
UPDATE "User" SET role = 'partner' WHERE id = (SELECT id FROM "User" ORDER BY createdAt LIMIT 1 OFFSET 1);
