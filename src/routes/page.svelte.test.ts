/**
 * @file テスト: ダッシュボード画面
 * @module src/routes/page.svelte.test.ts
 * @testType unit
 *
 * @target ./+page.svelte
 */
import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import DashboardRoute from './+page.svelte';
import type { PageData } from './$types';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost/') }
}));

/** +page.server.ts の load 戻り値（+ layout の userRole）と同じ形のフィクスチャ */
function makeData(overrides: Partial<PageData> = {}): PageData {
	return {
		userRole: 'main',
		unapprovedCount: 0,
		summary: {
			overall: 12345,
			byPayer: [{ payerId: 'u1', payerName: 'たろう', total: 12345 }],
			byCategory: [
				{
					categoryId: 'c1',
					categoryName: '食費',
					total: 12345,
					byPayer: [{ payerId: 'u1', payerName: 'たろう', total: 12345 }]
				}
			]
		},
		currentMonth: '2026-09',
		period: 'month',
		month: '2026-09',
		...overrides
	};
}

describe('+page.svelte（ダッシュボード）', () => {
	test('load の集計データで、合計・支払者別・カテゴリ別の金額を表示できる', async () => {
		await render(DashboardRoute, { data: makeData() });
		await expect.element(page.getByRole('heading', { name: 'ホーム', level: 1 })).toBeVisible();
		await expect.element(page.getByTestId('dashboard-total')).toHaveTextContent('¥12,345');
		await expect
			.element(page.getByTestId('dashboard-payer-summary-item'))
			.toHaveTextContent(/たろう\s*¥12,345/);
		await expect.element(page.getByText('食費')).toBeVisible();
	});

	test('集計対象の支出がない場合、支払者別・カテゴリ別に空状態メッセージが表示される', async () => {
		await render(DashboardRoute, {
			data: makeData({ summary: { overall: 0, byPayer: [], byCategory: [] } })
		});
		await expect.element(page.getByTestId('dashboard-total')).toHaveTextContent('¥0');
		await expect.element(page.getByText('支払者データがありません')).toBeVisible();
		await expect.element(page.getByText('カテゴリデータがありません')).toBeVisible();
	});

	test('load の unapprovedCount が 1 以上の場合、未確認支出の警告バナーが表示される', async () => {
		await render(DashboardRoute, { data: makeData({ unapprovedCount: 3 }) });
		await expect.element(page.getByText('未確認の支出が 3 件あります')).toBeVisible();
	});

	test('load の period が all の場合、全期間合計として表示され月選択が表示されない', async () => {
		await render(DashboardRoute, { data: makeData({ period: 'all' }) });
		await expect.element(page.getByText('全期間合計')).toBeVisible();
		await expect
			.element(page.getByRole('combobox', { name: '表示する月' }))
			.not.toBeInTheDocument();
	});
});
