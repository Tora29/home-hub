-- Migration: 0017_drop_recipe_calendar
-- レシピ・カレンダー機能の廃止に伴い Recipe / CalendarEvent テーブルを削除（インデックスはテーブルと同時に削除される）

DROP TABLE IF EXISTS `CalendarEvent`;--> statement-breakpoint
DROP TABLE IF EXISTS `Recipe`;
