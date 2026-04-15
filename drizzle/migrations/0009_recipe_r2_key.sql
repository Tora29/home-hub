-- Recipe テーブルに R2 オブジェクトキーカラムを追加
-- imageUrl（ユーザー入力可能）ではなく信頼済みキーで R2 削除を行うため
ALTER TABLE "Recipe" ADD COLUMN "r2ImageKey" TEXT;
