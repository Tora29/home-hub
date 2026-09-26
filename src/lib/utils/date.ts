/**
 * @file ヘルパー: 日付ユーティリティ
 * @module src/lib/utils/date.ts
 *
 * @description
 * 日付・月の計算を日本時間（JST）固定で行う。実行環境のタイムゾーン
 * （本番 Workers = UTC / ローカル = JST）に依存しないよう、Date のローカル時刻 API は使わない。
 */

// 日本は夏時間がないため Asia/Tokyo = UTC+9 固定で扱う
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

const pad2 = (n: number) => String(n).padStart(2, '0');

/** UTC getter で JST の暦日を読めるよう +9 時間ずらした Date を返す。 */
function shiftToJst(d: Date): Date {
	return new Date(d.getTime() + JST_OFFSET_MS);
}

/**
 * 日時を JST の YYYY-MM 形式に整形する。
 */
export function formatYearMonth(d: Date): string {
	const jst = shiftToJst(d);
	return `${jst.getUTCFullYear()}-${pad2(jst.getUTCMonth() + 1)}`;
}

/**
 * JST の当月を YYYY-MM 形式で返す。
 */
export function getCurrentMonth(now: Date = new Date()): string {
	return formatYearMonth(now);
}

/**
 * JST の今日を YYYY-MM-DD 形式で返す。
 */
export function getTodayDate(now: Date = new Date()): string {
	const jst = shiftToJst(now);
	return `${jst.getUTCFullYear()}-${pad2(jst.getUTCMonth() + 1)}-${pad2(jst.getUTCDate())}`;
}

/**
 * 日時を JST の M/D 形式に整形する（一覧表示用）。
 */
export function formatMonthDay(d: Date): string {
	const jst = shiftToJst(d);
	return `${jst.getUTCMonth() + 1}/${jst.getUTCDate()}`;
}

/**
 * YYYY-MM に n か月加算した YYYY-MM を返す（n は負数可）。
 */
export function addMonths(month: string, n: number): string {
	const [y, m] = month.split('-').map(Number);
	const total = y * 12 + (m - 1) + n;
	return `${Math.floor(total / 12)}-${pad2((total % 12) + 1)}`;
}

/**
 * JST の月初〜翌月初（exclusive）を日時の範囲として返す。timestamp カラムの月フィルタに使う。
 */
export function getMonthRange(month: string): { start: Date; end: Date } {
	const toJstMonthStart = (ym: string) => {
		const [y, m] = ym.split('-').map(Number);
		return new Date(Date.UTC(y, m - 1, 1) - JST_OFFSET_MS);
	};
	return { start: toJstMonthStart(month), end: toJstMonthStart(addMonths(month, 1)) };
}

/**
 * baseMonth（YYYY-MM 形式）を起点に過去 count ヶ月分の月オプションを生成する。
 * baseMonth を省略した場合は JST の当月を使用する。
 * 月境界の不整合を防ぐため、クライアント側ではサーバーが返した currentMonth を渡すことを推奨する。
 */
export function generateMonthOptions(
	baseMonth: string = getCurrentMonth(),
	count = 13
): { value: string; label: string }[] {
	return Array.from({ length: count }, (_, i) => {
		const value = addMonths(baseMonth, -i);
		const [y, m] = value.split('-');
		return { value, label: `${y}年${m}月` };
	});
}
