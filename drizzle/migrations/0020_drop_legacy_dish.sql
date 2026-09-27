-- Migration: 0020_drop_legacy_dish
-- 旧献立機能の残骸テーブル（0001_init で作成・drizzle 管理外・コード参照なし）を削除する。
-- 子テーブル DishTag を先に削除。Tag_name_key はテーブルと一緒に消える。
DROP TABLE IF EXISTS `DishTag`;--> statement-breakpoint
DROP TABLE IF EXISTS `Dish`;--> statement-breakpoint
DROP TABLE IF EXISTS `Tag`;
