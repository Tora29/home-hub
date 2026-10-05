/**
 * @file テスト: WorkoutPage
 * @module src/lib/features/workout/components/WorkoutPage.svelte.test.ts
 * @testType unit
 *
 * @target ./WorkoutPage.svelte
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { flushSync } from 'svelte';
import { goto, invalidateAll } from '$app/navigation';
import WorkoutPage from './WorkoutPage.svelte';
import type { ChartData, Exercise, WorkoutRecord } from '../types';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost/workout') }
}));

type FetchImpl = (url: string, init?: RequestInit) => Promise<Response>;

const mockFetch = vi.fn<typeof fetch>();

function chartResponse(name = 'ベンチプレス'): Response {
	const data: ChartData = {
		exercise: { id: 'ex-1', name },
		exercisePoints: [{ date: '2026-09-27', maxWeight: 60 }],
		bodyWeightPoints: []
	};
	return Response.json(data);
}

/** マウント時・操作後のグラフ／ボリューム取得を既定で成功させるルーティング */
const defaultFetch: FetchImpl = async (url, init) => {
	if (url.startsWith('/workout/volume')) return Response.json([]);
	if (url.startsWith('/workout/chart')) return chartResponse();
	if (init?.method === 'DELETE') return new Response(null, { status: 204 });
	return Response.json({}, { status: 201 });
};

/** 特定リクエストだけ差し替え、それ以外は defaultFetch に委譲する */
function routeFetch(
	override: (
		url: string,
		init?: RequestInit
	) => Promise<Response | undefined> | Promise<Response> | undefined
) {
	mockFetch.mockImplementation(async (input, init) => {
		const url = String(input);
		return (await override(url, init)) ?? defaultFetch(url, init);
	});
}

function callsTo(prefix: string, method = 'GET'): [string, RequestInit | undefined][] {
	return mockFetch.mock.calls
		.map(([input, init]) => [String(input), init] as [string, RequestInit | undefined])
		.filter(([url, init]) => url.startsWith(prefix) && (init?.method ?? 'GET') === method);
}

beforeEach(() => {
	mockFetch.mockReset();
	routeFetch(() => undefined);
	vi.stubGlobal('fetch', mockFetch);
	vi.mocked(goto).mockReset();
	vi.mocked(invalidateAll).mockReset();
	vi.mocked(invalidateAll).mockResolvedValue(undefined);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

const exercises: { items: Exercise[] } = {
	items: [
		{ id: 'ex-1', name: 'ベンチプレス', category: { id: 'wc-1', name: '胸' } },
		{ id: 'ex-2', name: 'スクワット', category: { id: 'wc-2', name: '脚' } },
		{ id: 'ex-3', name: '懸垂', category: null }
	]
};

function makeRecord(overrides: Partial<WorkoutRecord> = {}): WorkoutRecord {
	return {
		id: 'rec-1',
		userId: 'user-1',
		exerciseId: 'ex-1',
		exerciseName: 'ベンチプレス',
		date: '2026-09-27',
		weight: 60,
		reps: 8,
		isBodyWeight: false,
		createdAt: new Date('2026-09-27T00:00:00Z'),
		...overrides
	};
}

async function renderPage(
	overrides: Partial<{
		records: WorkoutRecord[];
		filterExerciseId: string | null;
		todayBodyWeight: number | null;
	}> = {}
) {
	const result = await render(WorkoutPage, {
		records: [],
		exercises,
		filterExerciseId: null,
		todayBodyWeight: null,
		today: '2026-09-27',
		...overrides
	});
	// マウント時のグラフ・ボリューム取得の完了を待つ
	await vi.waitFor(() => {
		expect(callsTo('/workout/chart')).toHaveLength(1);
		expect(callsTo('/workout/volume')).toHaveLength(1);
	});
	await expect.element(page.getByTestId('workout-chart-svg')).toBeVisible();
	return result;
}

function click(testId: string): void {
	(page.getByTestId(testId).element() as HTMLElement).click();
	flushSync();
}

function changeValue(testId: string, value: string, eventType: 'input' | 'change'): void {
	const el = page.getByTestId(testId).element() as HTMLInputElement | HTMLSelectElement;
	el.value = value;
	el.dispatchEvent(new Event(eventType, { bubbles: true }));
	flushSync();
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => (resolve = r));
	return { promise, resolve };
}

/** 遅れて届くレスポンス（json() 含む）の処理を待ってから DOM を確定させる */
async function settle(): Promise<void> {
	await new Promise((r) => setTimeout(r, 50));
	flushSync();
}

describe('WorkoutPage', () => {
	describe('初期表示', () => {
		test('マウント時に先頭種目の今月の重量推移と週間ボリュームを取得する', async () => {
			await renderPage();

			expect(callsTo('/workout/chart')[0][0]).toBe(
				`/workout/chart?${new URLSearchParams({ exerciseId: 'ex-1', period: '1m', month: '2026-09' })}`
			);
			expect(callsTo('/workout/volume')[0][0]).toBe(
				`/workout/volume?${new URLSearchParams({ period: '1m', month: '2026-09' })}`
			);
		});

		test('種目セレクトはカテゴリごとにグループ化され、カテゴリなしの種目は「その他」に表示される', async () => {
			await renderPage();

			const select = page
				.getByTestId('workout-form-exercise-select')
				.element() as HTMLSelectElement;
			const groups = Array.from(select.querySelectorAll('optgroup')).map((g) => ({
				label: g.label,
				options: Array.from(g.querySelectorAll('option')).map((o) => o.value)
			}));
			expect(groups).toEqual([
				{ label: '胸', options: ['ex-1'] },
				{ label: '脚', options: ['ex-2'] },
				{ label: 'その他', options: ['ex-3'] }
			]);
		});
	});

	describe('記録追加', () => {
		test('種目・重量・回数を入力して記録を追加できる', async () => {
			await renderPage();

			changeValue('workout-form-exercise-select', 'ex-2', 'change');
			changeValue('workout-form-weight-input', '100', 'input');
			changeValue('workout-form-reps-select', '5', 'change');
			click('workout-form-add-button');

			await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
			const [[url, init]] = callsTo('/workout', 'POST');
			expect(url).toBe('/workout');
			expect(JSON.parse(String(init?.body))).toEqual({
				exerciseId: 'ex-2',
				date: '2026-09-27',
				weight: 100,
				reps: 5,
				isBodyWeight: false
			});
			// 追加後にグラフ・ボリュームを再取得し、重量入力をクリアする
			await vi.waitFor(() => {
				expect(callsTo('/workout/chart')).toHaveLength(2);
				expect(callsTo('/workout/volume')).toHaveLength(2);
			});
			await expect.element(page.getByTestId('workout-form-weight-input')).toHaveValue(null);
		});

		test('自重にチェックした場合、重量0・自重フラグ付きで記録を追加できる', async () => {
			await renderPage();

			changeValue('workout-form-exercise-select', 'ex-3', 'change');
			click('workout-form-bodyweight-checkbox');
			click('workout-form-add-button');

			await vi.waitFor(() => expect(callsTo('/workout', 'POST')).toHaveLength(1));
			const [[, init]] = callsTo('/workout', 'POST');
			expect(JSON.parse(String(init?.body))).toMatchObject({
				exerciseId: 'ex-3',
				weight: 0,
				reps: 8,
				isBodyWeight: true
			});
		});

		test('種目が未選択の場合、「種目を選択してください」が表示され送信されない', async () => {
			await renderPage();

			changeValue('workout-form-weight-input', '60', 'input');
			click('workout-form-add-button');

			await expect.element(page.getByRole('alert')).toHaveTextContent('種目を選択してください');
			expect(callsTo('/workout', 'POST')).toHaveLength(0);
		});

		test('重量が未入力の場合、「重量は必須です」が表示され送信されない', async () => {
			await renderPage();

			changeValue('workout-form-exercise-select', 'ex-1', 'change');
			click('workout-form-add-button');

			await expect.element(page.getByRole('alert')).toHaveTextContent('重量は必須です');
			expect(callsTo('/workout', 'POST')).toHaveLength(0);
		});

		test('重量が999kgを超える場合、「重量は999以下で入力してください」が表示され送信されない', async () => {
			await renderPage();

			changeValue('workout-form-exercise-select', 'ex-1', 'change');
			changeValue('workout-form-weight-input', '1000', 'input');
			click('workout-form-add-button');

			await expect
				.element(page.getByRole('alert'))
				.toHaveTextContent('重量は999以下で入力してください');
			expect(callsTo('/workout', 'POST')).toHaveLength(0);
		});

		test('API がエラーを返した場合、API のエラーメッセージが表示される', async () => {
			routeFetch(async (url, init) =>
				url === '/workout' && init?.method === 'POST'
					? Response.json(
							{ code: 'NOT_FOUND', message: '種目が見つかりません', fields: [] },
							{ status: 404 }
						)
					: undefined
			);
			await renderPage();

			changeValue('workout-form-exercise-select', 'ex-1', 'change');
			changeValue('workout-form-weight-input', '60', 'input');
			click('workout-form-add-button');

			await expect.element(page.getByRole('alert')).toHaveTextContent('種目が見つかりません');
			expect(invalidateAll).not.toHaveBeenCalled();
		});

		test('API が JSON 以外のエラーを返した場合、汎用エラーメッセージが表示される', async () => {
			routeFetch(async (url, init) =>
				url === '/workout' && init?.method === 'POST'
					? new Response('<html>502 Bad Gateway</html>', { status: 502 })
					: undefined
			);
			await renderPage();

			changeValue('workout-form-exercise-select', 'ex-1', 'change');
			changeValue('workout-form-weight-input', '60', 'input');
			click('workout-form-add-button');

			await expect.element(page.getByRole('alert')).toHaveTextContent('エラーが発生しました');
		});

		test('通信エラーの場合、通信エラーメッセージが表示される', async () => {
			routeFetch(async (url, init) => {
				if (url === '/workout' && init?.method === 'POST') throw new TypeError('Failed to fetch');
				return undefined;
			});
			await renderPage();

			changeValue('workout-form-exercise-select', 'ex-1', 'change');
			changeValue('workout-form-weight-input', '60', 'input');
			click('workout-form-add-button');

			await expect.element(page.getByRole('alert')).toHaveTextContent('通信エラーが発生しました');
		});

		test('種目を選択した場合、その種目の最大重量の記録が過去のMAXとして表示される', async () => {
			await renderPage({
				records: [
					makeRecord({ id: 'r1', weight: 60, reps: 10 }),
					makeRecord({ id: 'r2', weight: 80, reps: 3 }),
					makeRecord({ id: 'r3', exerciseId: 'ex-2', exerciseName: 'スクワット', weight: 120 })
				]
			});

			changeValue('workout-form-exercise-select', 'ex-1', 'change');

			await expect
				.element(page.getByTestId('workout-form-prev-record-hint'))
				.toHaveTextContent('過去のMAX: 80kg × 3回');
		});

		test('種目を選択した場合、記録日より前の直近トレーニング日の最大重量が前回のMAXとして表示される', async () => {
			await renderPage({
				records: [
					// 記録日（today = 2026-09-27）当日の記録は前回に含めない
					makeRecord({ id: 'r1', date: '2026-09-27', weight: 90, reps: 1 }),
					makeRecord({ id: 'r2', date: '2026-09-20', weight: 70, reps: 6 }),
					makeRecord({ id: 'r3', date: '2026-09-20', weight: 70, reps: 8 }),
					makeRecord({ id: 'r4', date: '2026-09-20', weight: 65, reps: 10 }),
					makeRecord({ id: 'r5', date: '2026-09-13', weight: 100, reps: 1 }),
					makeRecord({
						id: 'r6',
						exerciseId: 'ex-2',
						exerciseName: 'スクワット',
						date: '2026-09-25',
						weight: 120
					})
				]
			});

			changeValue('workout-form-exercise-select', 'ex-1', 'change');

			await expect
				.element(page.getByTestId('workout-form-prev-session-hint'))
				.toHaveTextContent('前回（9/20）のMAX: 70kg × 8回');
			await expect
				.element(page.getByTestId('workout-form-prev-record-hint'))
				.toHaveTextContent('過去のMAX: 100kg × 1回');
		});

		test('記録日より前の記録がない場合、前回のMAXは表示されない', async () => {
			await renderPage({
				records: [makeRecord({ id: 'r1', date: '2026-09-27', weight: 60, reps: 8 })]
			});

			changeValue('workout-form-exercise-select', 'ex-1', 'change');

			await expect.element(page.getByTestId('workout-form-prev-record-hint')).toBeVisible();
			await expect
				.element(page.getByTestId('workout-form-prev-session-hint'))
				.not.toBeInTheDocument();
		});
	});

	describe('記録削除', () => {
		test('削除ボタンから確認ダイアログを開き、記録を削除できる', async () => {
			await renderPage({ records: [makeRecord()] });

			click('workout-record-delete-button');
			await expect
				.element(page.getByTestId('workout-record-delete-dialog'))
				.toHaveTextContent('2026-09-27 ベンチプレス 60kg × 8回 を削除します。');

			click('workout-record-delete-confirm-button');

			await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
			expect(callsTo('/workout/rec-1', 'DELETE')).toHaveLength(1);
			await expect
				.element(page.getByTestId('workout-record-delete-dialog'))
				.not.toBeInTheDocument();
			await vi.waitFor(() => {
				expect(callsTo('/workout/chart')).toHaveLength(2);
				expect(callsTo('/workout/volume')).toHaveLength(2);
			});
		});

		test('自重の記録の場合、確認文に「自重」が含まれる', async () => {
			await renderPage({
				records: [makeRecord({ exerciseName: '懸垂', weight: 0, reps: 10, isBodyWeight: true })]
			});

			click('workout-record-delete-button');

			await expect
				.element(page.getByTestId('workout-record-delete-dialog'))
				.toHaveTextContent('2026-09-27 懸垂 自重 0kg × 10回 を削除します。');
		});

		test('キャンセルした場合、ダイアログが閉じて削除されない', async () => {
			await renderPage({ records: [makeRecord()] });

			click('workout-record-delete-button');
			click('workout-record-delete-cancel-button');

			await expect
				.element(page.getByTestId('workout-record-delete-dialog'))
				.not.toBeInTheDocument();
			expect(callsTo('/workout/', 'DELETE')).toHaveLength(0);
		});

		test('削除 API がエラーを返した場合、ダイアログ内にエラーメッセージが表示される', async () => {
			routeFetch(async (_url, init) =>
				init?.method === 'DELETE'
					? Response.json(
							{ code: 'NOT_FOUND', message: '該当データが見つかりません' },
							{ status: 404 }
						)
					: undefined
			);
			await renderPage({ records: [makeRecord()] });

			click('workout-record-delete-button');
			click('workout-record-delete-confirm-button');

			await expect
				.element(page.getByTestId('workout-record-delete-dialog').getByRole('alert'))
				.toHaveTextContent('該当データが見つかりません');
			expect(invalidateAll).not.toHaveBeenCalled();
		});

		test('削除時に通信エラーの場合、ダイアログ内に通信エラーメッセージが表示される', async () => {
			routeFetch(async (_url, init) => {
				if (init?.method === 'DELETE') throw new TypeError('Failed to fetch');
				return undefined;
			});
			await renderPage({ records: [makeRecord()] });

			click('workout-record-delete-button');
			click('workout-record-delete-confirm-button');

			await expect
				.element(page.getByTestId('workout-record-delete-dialog').getByRole('alert'))
				.toHaveTextContent('通信エラーが発生しました');
		});
	});

	describe('体重記録', () => {
		test('体重を入力して本日の体重を記録できる', async () => {
			await renderPage();

			changeValue('workout-body-weight-input', '65.5', 'input');
			click('workout-body-weight-submit-button');

			await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
			const [[, init]] = callsTo('/workout/body-weight', 'POST');
			expect(JSON.parse(String(init?.body))).toEqual({ date: '2026-09-27', weight: 65.5 });
			// 記録後に体重線を含むグラフを再取得する
			await vi.waitFor(() => expect(callsTo('/workout/chart')).toHaveLength(2));
		});

		test('体重が未入力の場合、「体重は必須です」が表示され送信されない', async () => {
			await renderPage();

			click('workout-body-weight-submit-button');

			await expect.element(page.getByRole('alert')).toHaveTextContent('体重は必須です');
			expect(callsTo('/workout/body-weight', 'POST')).toHaveLength(0);
		});

		test('API がエラーを返した場合、API のエラーメッセージが表示される', async () => {
			routeFetch(async (url) =>
				url === '/workout/body-weight'
					? Response.json(
							{ code: 'VALIDATION_ERROR', message: '入力値が正しくありません', fields: [] },
							{ status: 400 }
						)
					: undefined
			);
			await renderPage();

			changeValue('workout-body-weight-input', '65', 'input');
			click('workout-body-weight-submit-button');

			await expect.element(page.getByRole('alert')).toHaveTextContent('入力値が正しくありません');
			expect(invalidateAll).not.toHaveBeenCalled();
		});

		test('体重が300kgを超える場合、「体重は300以下で入力してください」が表示され送信されない', async () => {
			await renderPage();

			changeValue('workout-body-weight-input', '301', 'input');
			click('workout-body-weight-submit-button');

			await expect
				.element(page.getByRole('alert'))
				.toHaveTextContent('体重は300以下で入力してください');
			expect(callsTo('/workout/body-weight', 'POST')).toHaveLength(0);
		});
	});

	describe('記録一覧の種目フィルタ', () => {
		test('種目を選択した場合、exerciseId をクエリに付けて履歴を汚さず遷移する', async () => {
			await renderPage();

			changeValue('workout-filter-exercise-select', 'ex-2', 'change');

			expect(goto).toHaveBeenCalledWith(`/workout?${new URLSearchParams({ exerciseId: 'ex-2' })}`, {
				keepFocus: true,
				replaceState: true,
				noScroll: true
			});
		});

		test('「すべての種目」を選択した場合、クエリなしの /workout へ遷移する', async () => {
			await renderPage({ filterExerciseId: 'ex-1' });

			changeValue('workout-filter-exercise-select', '', 'change');

			expect(goto).toHaveBeenCalledWith('/workout', {
				keepFocus: true,
				replaceState: true,
				noScroll: true
			});
		});
	});

	describe('重量推移グラフ', () => {
		test('種目を切り替えた場合、選択した種目のグラフデータを取得する', async () => {
			await renderPage();

			changeValue('workout-chart-exercise-select', 'ex-2', 'change');

			await vi.waitFor(() => expect(callsTo('/workout/chart')).toHaveLength(2));
			expect(callsTo('/workout/chart')[1][0]).toBe(
				`/workout/chart?${new URLSearchParams({ exerciseId: 'ex-2', period: '1m', month: '2026-09' })}`
			);
		});

		test('年・月を切り替えた場合、選択した年月のグラフデータを取得する', async () => {
			await renderPage();

			changeValue('workout-chart-year-select', '2025', 'change');
			changeValue('workout-chart-month-select', '03', 'change');

			await vi.waitFor(() => expect(callsTo('/workout/chart')).toHaveLength(3));
			expect(callsTo('/workout/chart')[2][0]).toBe(
				`/workout/chart?${new URLSearchParams({ exerciseId: 'ex-1', period: '1m', month: '2025-03' })}`
			);
		});

		test('年間に切り替えた場合、選択年の年間グラフデータを取得する', async () => {
			await renderPage();

			click('workout-chart-year-mode');

			await vi.waitFor(() => expect(callsTo('/workout/chart')).toHaveLength(2));
			expect(callsTo('/workout/chart')[1][0]).toBe(
				`/workout/chart?${new URLSearchParams({ exerciseId: 'ex-1', period: 'year', month: '2026-01' })}`
			);
			await expect.element(page.getByTestId('workout-chart-year-mode')).toBeChecked();
			await expect.element(page.getByTestId('workout-chart-month-select')).toBeDisabled();
		});

		test('年間への切り替えで取得に失敗した場合、エラーが表示され月間に戻る', async () => {
			await renderPage();
			routeFetch(async (url) =>
				url.startsWith('/workout/chart') && url.includes('period=year')
					? Response.json(
							{ code: 'INTERNAL_SERVER_ERROR', message: 'サーバーエラーが発生しました' },
							{ status: 500 }
						)
					: undefined
			);

			click('workout-chart-year-mode');

			await expect
				.element(page.getByRole('alert'))
				.toHaveTextContent('サーバーエラーが発生しました');
			await expect.element(page.getByTestId('workout-chart-year-mode')).not.toBeChecked();
			await expect.element(page.getByTestId('workout-chart-month-select')).toBeEnabled();
		});

		test('グラフ取得で JSON 以外のエラーが返った場合、汎用エラーメッセージが表示される', async () => {
			await renderPage();
			routeFetch(async (url) =>
				url.startsWith('/workout/chart') ? new Response('Bad Gateway', { status: 502 }) : undefined
			);

			changeValue('workout-chart-month-select', '08', 'change');

			await expect
				.element(page.getByRole('alert'))
				.toHaveTextContent('グラフデータの取得に失敗しました');
		});

		test('連続して月を切り替えた場合、先に選んだ月の遅れたレスポンスで後の月のグラフが上書きされない', async () => {
			await renderPage();
			const august = deferred<Response>();
			const july = deferred<Response>();
			routeFetch((url) => {
				if (url.includes('month=2026-08')) return august.promise;
				if (url.includes('month=2026-07')) return july.promise;
				return undefined;
			});

			changeValue('workout-chart-month-select', '08', 'change');
			changeValue('workout-chart-month-select', '07', 'change');

			july.resolve(chartResponse('7月の種目'));
			await expect.element(page.getByText('7月の種目')).toBeVisible();

			august.resolve(chartResponse('8月の種目'));
			await settle();

			expect(page.getByText('8月の種目').elements()).toHaveLength(0);
			await expect.element(page.getByText('7月の種目')).toBeVisible();
			await expect.element(page.getByTestId('workout-chart-month-select')).toHaveValue('07');
		});

		test('年間/月間を連打した場合、古いリクエストの失敗で最新の選択がロールバックされない', async () => {
			await renderPage();
			const first = deferred<Response>();
			let call = 0;
			routeFetch((url) => {
				if (!url.startsWith('/workout/chart')) return undefined;
				call += 1;
				return call === 1 ? first.promise : Promise.resolve(chartResponse());
			});

			click('workout-chart-year-mode'); // 月間→年間（遅延・後で失敗）
			click('workout-chart-year-mode'); // 年間→月間
			click('workout-chart-year-mode'); // 月間→年間（最新）
			await vi.waitFor(() => expect(callsTo('/workout/chart')).toHaveLength(4));

			first.resolve(Response.json({ message: 'サーバーエラーが発生しました' }, { status: 500 }));
			await settle();

			await expect.element(page.getByTestId('workout-chart-year-mode')).toBeChecked();
			expect(page.getByRole('alert').elements()).toHaveLength(0);
		});
	});

	describe('週間ボリューム', () => {
		test('月を切り替えた場合、選択した年月のボリュームデータを取得する', async () => {
			await renderPage();

			changeValue('workout-volume-month-select', '08', 'change');

			await vi.waitFor(() => expect(callsTo('/workout/volume')).toHaveLength(2));
			expect(callsTo('/workout/volume')[1][0]).toBe(
				`/workout/volume?${new URLSearchParams({ period: '1m', month: '2026-08' })}`
			);
		});

		test('年間に切り替えた場合、選択年の年間ボリュームデータを取得する', async () => {
			await renderPage();

			click('workout-volume-year-mode');

			await vi.waitFor(() => expect(callsTo('/workout/volume')).toHaveLength(2));
			expect(callsTo('/workout/volume')[1][0]).toBe(
				`/workout/volume?${new URLSearchParams({ period: 'year', month: '2026-01' })}`
			);
			await expect.element(page.getByTestId('workout-volume-year-mode')).toBeChecked();
		});

		test('年間への切り替えで通信エラーの場合、エラーが表示され月間に戻る', async () => {
			await renderPage();
			routeFetch(async (url) => {
				if (url.startsWith('/workout/volume')) throw new TypeError('Failed to fetch');
				return undefined;
			});

			click('workout-volume-year-mode');

			await expect.element(page.getByRole('alert')).toHaveTextContent('通信エラーが発生しました');
			await expect.element(page.getByTestId('workout-volume-year-mode')).not.toBeChecked();
		});
	});
});
