/**
 * @file テスト: 筋トレ記録画面
 * @module src/routes/workout/page.svelte.test.ts
 * @testType unit
 *
 * @target ./+page.svelte
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import WorkoutRoute from './+page.svelte';
import type { PageData } from './$types';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost/workout') }
}));

const mockFetch = vi.fn<typeof fetch>();

beforeEach(() => {
	// マウント時のグラフ・週間ボリューム取得（CSR fetch）をスタブする
	mockFetch.mockReset();
	mockFetch.mockImplementation(async (input) => {
		const url = String(input);
		if (url.startsWith('/workout/volume')) return Response.json([]);
		return Response.json({
			exercise: { id: 'ex-1', name: 'ベンチプレス' },
			exercisePoints: [],
			bodyWeightPoints: []
		});
	});
	vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

const exercise = { id: 'ex-1', name: 'ベンチプレス', category: { id: 'wc-1', name: '胸' } };

/** +page.server.ts の load 戻り値（+ layout の userRole）と同じ形のフィクスチャ */
function makeData(overrides: Partial<PageData> = {}): PageData {
	return {
		userRole: 'main',
		records: [],
		exercises: {
			items: [
				{
					...exercise,
					userId: 'user-1',
					categoryId: 'wc-1',
					createdAt: new Date('2026-09-01T00:00:00Z')
				}
			],
			total: 1,
			page: 1,
			limit: 1
		},
		filterExerciseId: null,
		todayBodyWeight: null,
		today: '2026-09-27',
		...overrides
	};
}

describe('+page.svelte（筋トレ記録）', () => {
	test('load の記録一覧で、日付ごとに種目・重量・回数を表示できる', async () => {
		await render(WorkoutRoute, {
			data: makeData({
				records: [
					{
						id: 'rec-1',
						userId: 'user-1',
						exerciseId: 'ex-1',
						exerciseName: 'ベンチプレス',
						date: '2026-09-27',
						weight: 60,
						reps: 8,
						isBodyWeight: false,
						createdAt: new Date('2026-09-27T00:00:00Z')
					}
				]
			})
		});

		await expect.element(page.getByRole('heading', { name: '筋トレ記録', level: 1 })).toBeVisible();
		const item = page.getByTestId('workout-record-item');
		await expect.element(item).toHaveTextContent('ベンチプレス');
		await expect.element(item).toHaveTextContent('60kg');
		await expect.element(item).toHaveTextContent('×8回');
		await expect.element(page.getByText('2026-09-27', { exact: true })).toBeVisible();
	});

	test('記録がない場合、記録一覧に空状態メッセージが表示される', async () => {
		await render(WorkoutRoute, { data: makeData() });
		await expect.element(page.getByText('記録がありません')).toBeVisible();
		await expect.element(page.getByTestId('workout-record-list')).not.toBeInTheDocument();
	});

	test('load の todayBodyWeight がある場合、本日の体重が記録済みとして表示される', async () => {
		await render(WorkoutRoute, { data: makeData({ todayBodyWeight: 65.5 }) });
		await expect.element(page.getByTestId('workout-body-weight-input')).toHaveValue(65.5);
		await expect.element(page.getByRole('button', { name: '記録済み' })).toBeDisabled();
	});

	test('種目が未登録の場合、重量推移グラフと週間ボリュームが表示されない', async () => {
		await render(WorkoutRoute, {
			data: makeData({ exercises: { items: [], total: 0, page: 1, limit: 0 } })
		});
		await expect.element(page.getByText('記録がありません')).toBeVisible();
		await expect.element(page.getByText('重量推移グラフ')).not.toBeInTheDocument();
		await expect.element(page.getByText('週間ボリューム')).not.toBeInTheDocument();
	});
});
