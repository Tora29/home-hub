/**
 * @file ヘルパー: 日付ユーティリティ
 * @module src/lib/utils/date.ts
 *
 * @description
 * 画面で使用する日付ユーティリティ関数。
 */

/**
 * 日付を YYYY-MM 形式に整形する。
 */
export function formatYearMonth(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * ローカル時刻の当月を YYYY-MM 形式で返す。
 */
export function getCurrentMonth(): string {
	return formatYearMonth(new Date());
}

/**
 * baseMonth（YYYY-MM 形式）を起点に過去 count ヶ月分の月オプションを生成する。
 * baseMonth を省略した場合はローカル時刻の当月を使用する。
 * 月境界の不整合を防ぐため、クライアント側ではサーバーが返した currentMonth を渡すことを推奨する。
 */
export function generateMonthOptions(
	baseMonth?: string,
	count = 13
): { value: string; label: string }[] {
	const options: { value: string; label: string }[] = [];
	let baseYear: number;
	let baseMonthNum: number;

	if (baseMonth) {
		const [y, m] = baseMonth.split('-').map(Number);
		baseYear = y;
		baseMonthNum = m - 1; // 0-indexed
	} else {
		const now = new Date();
		baseYear = now.getFullYear();
		baseMonthNum = now.getMonth();
	}
	for (let i = 0; i < count; i++) {
		const d = new Date(baseYear, baseMonthNum - i, 1);
		const month = String(d.getMonth() + 1).padStart(2, '0');
		options.push({ value: formatYearMonth(d), label: `${d.getFullYear()}年${month}月` });
	}
	return options;
}
