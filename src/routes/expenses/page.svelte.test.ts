/**
 * @file テスト: 支出一覧画面
 * @module src/routes/expenses/page.svelte.test.ts
 * @testType unit
 *
 * @target ./+page.svelte
 */
import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ExpensesRoute from './+page.svelte';
import type { PageData } from './$types';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost/expenses') }
}));

const user = { id: 'user-1', name: 'たろう', email: 'taro@example.com' };
const category = { id: 'cat-1', name: '食費', createdAt: new Date('2026-09-01T00:00:00Z') };

/** +page.server.ts の load 戻り値（+ layout の userRole）と同じ形のフィクスチャ */
function makeData(overrides: Partial<PageData> = {}): PageData {
	return {
		userRole: 'main',
		expenses: [],
		monthTotal: 0,
		categories: { items: [category], total: 1, page: 1, limit: 1 },
		users: [user],
		currentUserId: user.id,
		selectedMonth: '2026-09',
		currentMonth: '2026-09',
		partnerPendingCount: 0,
		settlement: null,
		...overrides
	};
}

describe('+page.svelte（支出一覧）', () => {
	test('load の支出データで、月間合計と支出一覧（金額・カテゴリ・支払者）を表示できる', async () => {
		await render(ExpensesRoute, {
			data: makeData({
				monthTotal: 1500,
				expenses: [
					{
						id: 'exp-1',
						userId: user.id,
						amount: 1500,
						categoryId: category.id,
						payerUserId: user.id,
						status: 'unapproved',
						createdAt: '2026-09-10T00:00:00.000Z',
						category,
						payer: user
					}
				]
			})
		});

		await expect.element(page.getByTestId('expense-total')).toHaveTextContent('¥1,500');
		const item = page.getByTestId('expense-item');
		await expect.element(item).toHaveTextContent('¥1,500');
		await expect.element(item).toHaveTextContent('食費');
		await expect.element(item).toHaveTextContent('たろう');
		await expect.element(page.getByText('支出はまだありません')).not.toBeInTheDocument();
	});

	test('対象月の支出がない場合、空状態メッセージが表示される', async () => {
		await render(ExpensesRoute, { data: makeData() });
		await expect.element(page.getByText('支出はまだありません')).toBeVisible();
		await expect.element(page.getByTestId('expense-total')).toHaveTextContent('¥0');
	});

	test('load の partnerPendingCount が 1 以上の場合、件数付きの全件承認ボタンが表示される', async () => {
		await render(ExpensesRoute, { data: makeData({ partnerPendingCount: 2 }) });
		await expect.element(page.getByRole('button', { name: '全件承認する（2件）' })).toBeVisible();
	});
});
