-- Migration: 0014_workout_is_body_weight
-- WorkoutRecord に isBodyWeight カラム追加（自重種目フラグ）

ALTER TABLE `WorkoutRecord` ADD COLUMN `isBodyWeight` INTEGER NOT NULL DEFAULT 0;
