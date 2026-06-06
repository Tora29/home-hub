-- ExpenseCategory を全アカウント共通化する
-- 同名カテゴリが複数ある場合は最初に作成されたもの（MIN rowid）を代表として統合する

-- Step 1: Expense.categoryId を同名グループの代表ID に統一
UPDATE Expense
SET categoryId = (
  SELECT id FROM ExpenseCategory
  WHERE name = (SELECT name FROM ExpenseCategory WHERE id = Expense.categoryId)
  ORDER BY rowid ASC
  LIMIT 1
);

-- Step 2: 代表ID以外の重複カテゴリを削除
DELETE FROM ExpenseCategory
WHERE rowid NOT IN (
  SELECT MIN(rowid) FROM ExpenseCategory GROUP BY name
);

-- Step 3: userId カラムを削除
ALTER TABLE ExpenseCategory DROP COLUMN userId;
