/**
 * @file ヘルパー: 支出フォーマット
 * @module src/lib/features/expenses/format.ts
 * @feature expenses
 *
 * @description
 * 支出金額の表示整形を行う共通関数。ExpenseItem/ExpensesPage 双方で使用する。
 */

/**
 * 金額を `¥1,000` 形式の文字列に整形する。
 */
export function formatAmount(amount: number): string {
	return `¥${amount.toLocaleString('ja-JP')}`;
}
