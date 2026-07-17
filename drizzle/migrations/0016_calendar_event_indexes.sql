-- Migration: 0016_calendar_event_indexes
-- CalendarEvent テーブルへのインデックス追加（date 範囲検索・createdByUserId JOIN 対策）

CREATE INDEX `idx_calendar_event_date` ON `CalendarEvent`(`date`);--> statement-breakpoint
CREATE INDEX `idx_calendar_event_createdByUserId` ON `CalendarEvent`(`createdByUserId`);
