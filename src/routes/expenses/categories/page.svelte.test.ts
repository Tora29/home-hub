/**
 * @file テスト: カテゴリ管理画面
 * @module src/routes/expenses/categories/page.svelte.test.ts
 * @testType unit
 *
 * @target ./+page.svelte
 */
import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ExpenseCategoriesRoute from './+page.svelte';
import type { PageData } from './$types';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost/expenses/categories') }
}));

/** +page.server.ts の load 戻り値（+ layout の userRole）と同じ形のフィクスチャ */
function makeData(items: PageData['categories']['items'] = []): PageData {
	return {
		userRole: 'main',
		categories: { items, total: items.length, page: 1, limit: items.length }
	};
}

describe('+page.svelte（カテゴリ管理）', () => {
	test('load のカテゴリ一覧で、カテゴリ名の一覧と追加フォームを表示できる', async () => {
		await render(ExpenseCategoriesRoute, {
			data: makeData([
				{ id: 'cat-1', name: '食費', createdAt: new Date('2026-09-01T00:00:00Z') },
				{ id: 'cat-2', name: '日用品', createdAt: new Date('2026-09-02T00:00:00Z') }
			])
		});

		await expect
			.element(page.getByRole('heading', { name: 'カテゴリ管理', level: 1 }))
			.toBeVisible();
		const items = page.getByTestId('expense-category-item');
		await expect.element(items.nth(0)).toHaveTextContent('食費');
		await expect.element(items.nth(1)).toHaveTextContent('日用品');
		await expect.element(page.getByRole('button', { name: '追加' })).toBeVisible();
	});

	test('カテゴリが未登録の場合、空状態メッセージが表示される', async () => {
		await render(ExpenseCategoriesRoute, { data: makeData() });
		await expect
			.element(page.getByText('カテゴリがありません。上のフォームから追加してください。'))
			.toBeVisible();
		await expect.element(page.getByTestId('expense-category-list')).not.toBeInTheDocument();
	});
});
