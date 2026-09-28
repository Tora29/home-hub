/**
 * @file テスト: VolumeChartSection
 * @module src/lib/features/workout/components/VolumeChartSection.svelte.test.ts
 * @testType unit
 *
 * @target ./VolumeChartSection.svelte
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { flushSync } from 'svelte';
import VolumeChartSection from './VolumeChartSection.svelte';
import type { WeeklyVolumeBreakdownItem, WeeklyVolumePoint } from '../types';

const points: WeeklyVolumePoint[] = [
	{ weekStart: '2026-09-14', volume: 3000 },
	{ weekStart: '2026-09-21', volume: 4500 }
];

const mockFetch = vi.fn<typeof fetch>();

beforeEach(() => {
	mockFetch.mockReset();
	vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

type Props = {
	mode: 'month' | 'year';
	data: WeeklyVolumePoint[];
	loading: boolean;
	error: string;
	onToggleMode: () => void;
	onPeriodChange: () => void;
};

function renderSection(overrides: Partial<Props> = {}) {
	return render(VolumeChartSection, {
		mode: 'month',
		year: '2026',
		month: '09',
		yearOptions: [
			{ value: '2026', label: '2026年' },
			{ value: '2025', label: '2025年' }
		],
		months: [
			{ value: '08', label: '8月' },
			{ value: '09', label: '9月' }
		],
		data: points,
		loading: false,
		error: '',
		onToggleMode: () => {},
		onPeriodChange: () => {},
		...overrides
	});
}

/** 棒（SVG rect）をクリックする。SVGElement は click() を持たないため MouseEvent を dispatch する */
function clickBar(weekStart: string): void {
	const bar = page.getByRole('button', { name: new RegExp(`^${weekStart} の週`) }).element();
	bar.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	flushSync();
}

/** 遅れて届くレスポンス（json() 含む）の処理を待ってから DOM を確定させる */
async function settle(): Promise<void> {
	await new Promise((r) => setTimeout(r, 50));
	flushSync();
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => (resolve = r));
	return { promise, resolve };
}

const breakdown: WeeklyVolumeBreakdownItem[] = [
	{ exerciseName: 'ベンチプレス', volume: 2400 },
	{ exerciseName: 'スクワット', volume: 2100 }
];

describe('VolumeChartSection', () => {
	test('週の棒を選択すると weekStart 指定で内訳を取得し、種目別ボリュームと合計を表示できる', async () => {
		mockFetch.mockResolvedValue(Response.json(breakdown));
		await renderSection();

		clickBar('2026-09-21');

		expect(mockFetch).toHaveBeenCalledWith('/workout/volume?weekStart=2026-09-21');
		const dialog = page.getByRole('dialog', { name: '週間ボリューム内訳' });
		await expect.element(dialog.getByRole('heading')).toHaveTextContent('2026/09/21 〜 内訳');
		await expect.element(dialog.getByText('ベンチプレス')).toBeVisible();
		await expect.element(dialog.getByText('2,400')).toBeVisible();
		await expect.element(dialog.getByText('2,100')).toBeVisible();
		await expect.element(dialog.getByText('4,500')).toBeVisible();
	});

	test('内訳の取得中の場合、ダイアログに読み込み中が表示される', async () => {
		const pending = deferred<Response>();
		mockFetch.mockReturnValue(pending.promise);
		await renderSection();

		clickBar('2026-09-21');

		await expect.element(page.getByRole('dialog').getByText('読み込み中...')).toBeVisible();
		pending.resolve(Response.json([]));
		await expect.element(page.getByText('データがありません')).toBeVisible();
	});

	test('内訳が0件の場合、データがありませんと表示される', async () => {
		mockFetch.mockResolvedValue(Response.json([]));
		await renderSection();

		clickBar('2026-09-14');

		await expect.element(page.getByText('データがありません')).toBeVisible();
	});

	test('閉じるボタンを押すと内訳ダイアログが閉じる', async () => {
		mockFetch.mockResolvedValue(Response.json(breakdown));
		await renderSection();
		clickBar('2026-09-21');
		await expect.element(page.getByRole('dialog')).toBeVisible();

		(page.getByRole('button', { name: '閉じる' }).element() as HTMLElement).click();
		flushSync();

		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
	});

	test('内訳の取得が失敗した場合、API のエラーメッセージが表示される', async () => {
		mockFetch.mockResolvedValue(
			Response.json({ code: 'FORBIDDEN', message: 'アクセス権限がありません' }, { status: 403 })
		);
		await renderSection();

		clickBar('2026-09-21');

		await expect
			.element(page.getByRole('dialog').getByRole('alert'))
			.toHaveTextContent('アクセス権限がありません');
	});

	test('内訳の取得で JSON 以外のエラーが返った場合、汎用エラーメッセージが表示される', async () => {
		mockFetch.mockResolvedValue(new Response('<html>502</html>', { status: 502 }));
		await renderSection();

		clickBar('2026-09-21');

		await expect
			.element(page.getByRole('dialog').getByRole('alert'))
			.toHaveTextContent('取得に失敗しました');
	});

	test('内訳の取得で通信エラーが発生した場合、通信エラーメッセージが表示される', async () => {
		mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
		await renderSection();

		clickBar('2026-09-21');

		await expect
			.element(page.getByRole('dialog').getByRole('alert'))
			.toHaveTextContent('通信エラーが発生しました');
	});

	test('連続して週を選択した場合、先に選択した週の遅れたレスポンスで後の週の内訳が上書きされない', async () => {
		const first = deferred<Response>();
		const second = deferred<Response>();
		mockFetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
		await renderSection();

		clickBar('2026-09-14');
		clickBar('2026-09-21');

		second.resolve(Response.json([{ exerciseName: 'スクワット', volume: 4500 }]));
		const dialog = page.getByRole('dialog');
		await expect.element(dialog.getByText('スクワット')).toBeVisible();

		first.resolve(Response.json([{ exerciseName: 'デッドリフト', volume: 3000 }]));
		await settle();

		await expect.element(dialog.getByRole('heading')).toHaveTextContent('2026/09/21 〜 内訳');
		await expect.element(dialog.getByText('スクワット')).toBeVisible();
		expect(dialog.getByText('デッドリフト').elements()).toHaveLength(0);
	});

	test('連続して週を選択した場合、先に選択した週の遅れた失敗で後の週にエラーが表示されない', async () => {
		const first = deferred<Response>();
		const second = deferred<Response>();
		mockFetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
		await renderSection();

		clickBar('2026-09-14');
		clickBar('2026-09-21');

		second.resolve(Response.json(breakdown));
		const dialog = page.getByRole('dialog');
		await expect.element(dialog.getByText('ベンチプレス')).toBeVisible();

		first.resolve(Response.json({ message: '取得に失敗しました' }, { status: 500 }));
		await settle();

		expect(dialog.getByRole('alert').elements()).toHaveLength(0);
		await expect.element(dialog.getByText('ベンチプレス')).toBeVisible();
	});

	test('年間にチェックすると onToggleMode が呼ばれる', async () => {
		const onToggleMode = vi.fn();
		await renderSection({ onToggleMode });

		(page.getByRole('checkbox', { name: '年間' }).element() as HTMLElement).click();
		flushSync();

		expect(onToggleMode).toHaveBeenCalledTimes(1);
	});

	test('月を選択すると onPeriodChange が呼ばれる', async () => {
		const onPeriodChange = vi.fn();
		await renderSection({ onPeriodChange });

		const select = page.getByTestId('workout-volume-month-select').element() as HTMLSelectElement;
		select.value = '08';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		expect(onPeriodChange).toHaveBeenCalledTimes(1);
	});

	test('年間モードの場合、年・月セレクトが無効化される', async () => {
		await renderSection({ mode: 'year' });

		await expect.element(page.getByRole('checkbox', { name: '年間' })).toBeChecked();
		await expect.element(page.getByTestId('workout-volume-year-select')).toBeDisabled();
		await expect.element(page.getByTestId('workout-volume-month-select')).toBeDisabled();
	});

	test('ボリュームデータが0件の場合、記録がありませんと表示される', async () => {
		await renderSection({ data: [] });

		await expect.element(page.getByText('記録がありません')).toBeVisible();
		await expect.element(page.getByTestId('workout-volume-svg')).not.toBeInTheDocument();
	});

	test('ボリュームデータが0件で取得中の場合、読み込み中が表示される', async () => {
		await renderSection({ data: [], loading: true });

		await expect.element(page.getByText('読み込み中...')).toBeVisible();
		await expect.element(page.getByText('記録がありません')).not.toBeInTheDocument();
	});

	test('エラーがある場合、エラーメッセージが表示されグラフは表示されない', async () => {
		await renderSection({ error: 'ボリュームデータの取得に失敗しました' });

		await expect
			.element(page.getByRole('alert'))
			.toHaveTextContent('ボリュームデータの取得に失敗しました');
		await expect.element(page.getByTestId('workout-volume-svg')).not.toBeInTheDocument();
	});
});
