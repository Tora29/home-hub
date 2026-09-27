/**
 * @file テスト: DashboardPage
 * @module src/lib/features/dashboard/components/DashboardPage.svelte.test.ts
 * @testType unit
 *
 * @target ./DashboardPage.svelte
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { flushSync } from 'svelte';
import DashboardPage from './DashboardPage.svelte';
import type { DashboardSummary } from '../types';

const mockGoto = vi.hoisted(() => vi.fn());

vi.mock('$app/navigation', () => ({
	goto: mockGoto,
	invalidateAll: vi.fn()
}));

const summary: DashboardSummary = {
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
};

const baseProps = {
	unapprovedCount: 0,
	summary,
	currentMonth: '2026-09',
	period: 'month' as const,
	month: '2026-09'
};

beforeEach(() => {
	mockGoto.mockReset();
	mockGoto.mockResolvedValue(undefined);
});

describe('DashboardPage', () => {
	test('相手の承認依頼中の支出がある場合、件数付きの警告バナーが表示される', async () => {
		await render(DashboardPage, { ...baseProps, unapprovedCount: 2 });
		await expect.element(page.getByText('未確認の支出が 2 件あります')).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: '確認する' }))
			.toHaveAttribute('href', '/expenses');
	});

	test('相手の承認依頼中の支出がない場合、警告バナーが表示されない', async () => {
		await render(DashboardPage, baseProps);
		await expect.element(page.getByText(/未確認の支出が/)).not.toBeInTheDocument();
	});

	test('月間合計・支払者別・カテゴリ別の金額を ¥ 区切り付きで表示できる', async () => {
		await render(DashboardPage, baseProps);
		await expect.element(page.getByTestId('dashboard-total')).toHaveTextContent('¥12,345');
		await expect
			.element(page.getByTestId('dashboard-payer-summary-item'))
			.toHaveTextContent(/たろう\s*¥12,345/);
	});

	test('全期間タブを押すと、URL を ?period=all に切り替えて全期間の集計を表示できる', async () => {
		await render(DashboardPage, baseProps);

		(page.getByRole('button', { name: '全期間' }).element() as HTMLElement).click();
		flushSync();

		expect(mockGoto).toHaveBeenCalledWith('/?period=all', {
			keepFocus: true,
			replaceState: true,
			noScroll: true
		});
	});

	test('月を選択すると、URL を ?period=month&month=YYYY-MM に切り替えて指定月の集計を表示できる', async () => {
		await render(DashboardPage, baseProps);

		const select = page
			.getByRole('combobox', { name: '表示する月' })
			.element() as HTMLSelectElement;
		select.value = '2026-07';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		expect(mockGoto).toHaveBeenCalledWith('/?period=month&month=2026-07', {
			keepFocus: true,
			replaceState: true,
			noScroll: true
		});
	});

	test('表示中の期間タブが選択状態（aria-pressed）になる', async () => {
		await render(DashboardPage, { ...baseProps, period: 'all' });
		await expect
			.element(page.getByRole('button', { name: '全期間' }))
			.toHaveAttribute('aria-pressed', 'true');
		await expect
			.element(page.getByRole('button', { name: '月別' }))
			.toHaveAttribute('aria-pressed', 'false');
		await expect
			.element(page.getByRole('combobox', { name: '表示する月' }))
			.not.toBeInTheDocument();
	});
});
