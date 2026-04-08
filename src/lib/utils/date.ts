/**
 * @file ヘルパー: 日付ユーティリティ
 * @module src/lib/utils/date.ts
 *
 * @description
 * 画面で使用する日付ユーティリティ関数。
 */

/**
 * baseMonth（YYYY-MM 形式）を起点に過去 count ヶ月分の月オプションを生成する。
 * baseMonth を省略した場合はローカル時刻の当月を使用する。
 * 月境界の不整合を防ぐため、クライアント側ではサーバーが返した currentMonth を渡すことを推奨する。
 */
export function generateMonthOptions(
	baseMonthOrCount?: string | number,
	count = 13
): { value: string; label: string }[] {
	const options: { value: string; label: string }[] = [];
	let baseYear: number;
	let baseMonthNum: number;
	let actualCount: number;

	if (typeof baseMonthOrCount === 'number') {
		actualCount = baseMonthOrCount;
		const now = new Date();
		baseYear = now.getFullYear();
		baseMonthNum = now.getMonth();
	} else if (baseMonthOrCount) {
		actualCount = count;
		const [y, m] = baseMonthOrCount.split('-').map(Number);
		baseYear = y;
		baseMonthNum = m - 1; // 0-indexed
	} else {
		actualCount = count;
		const now = new Date();
		baseYear = now.getFullYear();
		baseMonthNum = now.getMonth();
	}
	for (let i = 0; i < actualCount; i++) {
		const d = new Date(baseYear, baseMonthNum - i, 1);
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, '0');
		options.push({ value: `${year}-${month}`, label: `${year}年${month}月` });
	}
	return options;
}
