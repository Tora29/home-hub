/**
 * @file ヘルパー: 表示整形
 * @module src/lib/utils/format.ts
 *
 * @description
 * 複数 feature で共有する表示整形関数。SSR（Workers）とブラウザで表示がずれないようロケールを明示する。
 */

/**
 * 金額（円・整数）を `¥1,000` 形式の文字列に整形する。
 */
export function formatAmount(amount: number): string {
	return `¥${amount.toLocaleString('ja-JP')}`;
}
