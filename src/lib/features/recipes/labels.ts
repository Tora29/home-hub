/**
 * @file ヘルパー: レシピ表示ラベル
 * @module src/lib/features/recipes/labels.ts
 * @feature recipes
 *
 * @description
 * 難易度・評価のラベル変換、日付表示フォーマットを共通化する。
 * RecipeCard.svelte・routes/recipes/[id]/+page.svelte から参照される。
 */

export const DIFFICULTY_LABEL: Record<string, string> = {
	easy: '簡単',
	medium: '普通',
	hard: '難しい'
};

export const RATING_LABEL: Record<string, string> = {
	excellent: '非常に美味しい',
	good: '美味しい',
	average: '普通',
	poor: '微妙'
};

/**
 * 最終調理日を表示用にフォーマットする。未調理・不正な日付は「未調理」を返す。
 * @param style 月の表記形式（'short': 1月 / 'long': 1月）
 */
export function formatDate(date: Date | null | string, style: 'short' | 'long' = 'short'): string {
	if (!date) return '未調理';
	const d = new Date(date);
	return isNaN(d.getTime())
		? '未調理'
		: d.toLocaleDateString('ja-JP', { year: 'numeric', month: style, day: 'numeric' });
}
