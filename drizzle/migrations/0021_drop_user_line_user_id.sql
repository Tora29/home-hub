-- Migration: 0021_drop_user_line_user_id
-- 未使用の User.lineUserId を物理削除する（2 リリース目）。
-- 1 リリース目（PR #66 / 0019）で tables.ts から宣言を外し、参照コードがデプロイ済みであることを前提とする。
-- 本番の値は全件 NULL（2026-09-27 確認）。通知先は環境変数 LINE_USER_ID_* で解決している。
ALTER TABLE `User` DROP COLUMN `lineUserId`;
