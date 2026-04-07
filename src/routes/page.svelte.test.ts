/**
 * @file テスト: 画面 ダッシュボード（ルートページ）
 * @module src/routes/page.svelte.test.ts
 * @testType unit
 *
 * @target ./+page.svelte
 * @spec specs/dashboard/spec.md
 * @covers AC-005, AC-006, AC-007, AC-008, AC-009, AC-201, AC-202, AC-203
 */

import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import Page from './+page.svelte';

const emptySummary = {
	overall: 0,
	byPayer: [],
	byCategory: []
};

const richSummary = {
	overall: 12300,
	byPayer: [
		{ payerId: 'p-1', payerName: '田中', total: 8000 },
		{ payerId: 'p-2', payerName: '佐藤', total: 4300 }
	],
	byCategory: [
		{ categoryId: 'c-1', categoryName: '食費', total: 7500 },
		{ categoryId: 'c-2', categoryName: '交通費', total: 4800 }
	]
};

describe('ダッシュボード - 合計金額表示', () => {
	test('[SPEC: AC-005] 全体合計金額がカンマ区切りで表示される（¥12,300）', async () => {
		render(Page, {
			data: { summary: richSummary, unapprovedCount: 0, currentMonth: '2026-04' }
		});

		await expect.element(page.getByTestId('dashboard-total')).toHaveTextContent('¥12,300');
	});

	test('[SPEC: AC-006] 支払者別合計セクションに各支払者名と合計金額がカンマ区切りで表示される', async () => {
		render(Page, {
			data: { summary: richSummary, unapprovedCount: 0, currentMonth: '2026-04' }
		});

		await expect.element(page.getByTestId('dashboard-payer-summary-list')).toBeVisible();
		const items = page.getByTestId('dashboard-payer-summary-item');
		await expect.element(items.nth(0)).toHaveTextContent('田中');
		await expect.element(items.nth(0)).toHaveTextContent('¥8,000');
		await expect.element(items.nth(1)).toHaveTextContent('佐藤');
		await expect.element(items.nth(1)).toHaveTextContent('¥4,300');
	});

	test('[SPEC: AC-007] カテゴリ別合計セクションに各カテゴリ名と合計金額がカンマ区切りで表示される', async () => {
		render(Page, {
			data: { summary: richSummary, unapprovedCount: 0, currentMonth: '2026-04' }
		});

		await expect.element(page.getByTestId('dashboard-category-summary-list')).toBeVisible();
		const items = page.getByTestId('dashboard-category-summary-item');
		await expect.element(items.nth(0)).toHaveTextContent('食費');
		await expect.element(items.nth(0)).toHaveTextContent('¥7,500');
		await expect.element(items.nth(1)).toHaveTextContent('交通費');
		await expect.element(items.nth(1)).toHaveTextContent('¥4,800');
	});
});

describe('ダッシュボード - 未承認バナー', () => {
	test('[SPEC: AC-008] 未承認支出が1件以上ある場合、expense-pending-alert が件数付きで表示される', async () => {
		render(Page, {
			data: { summary: emptySummary, unapprovedCount: 3, currentMonth: '2026-04' }
		});

		await expect.element(page.getByTestId('expense-pending-alert')).toBeVisible();
		await expect.element(page.getByText('未確認の支出が 3 件あります')).toBeVisible();
	});

	test('[SPEC: AC-009] 未承認支出が0件の場合、expense-pending-alert が DOM に存在しない', async () => {
		render(Page, {
			data: { summary: emptySummary, unapprovedCount: 0, currentMonth: '2026-04' }
		});

		await expect.element(page.getByTestId('expense-pending-alert')).not.toBeInTheDocument();
	});
});

describe('ダッシュボード - 空状態表示', () => {
	test('[SPEC: AC-201] 対象期間に支出が0件の場合、全体合計が「¥0」と表示される', async () => {
		render(Page, {
			data: {
				summary: emptySummary,
				unapprovedCount: 0,
				currentMonth: '2026-04'
			}
		});

		await expect.element(page.getByTestId('dashboard-total')).toBeVisible();
		await expect.element(page.getByText('¥0')).toBeVisible();
	});

	test('[SPEC: AC-202] 支払者が存在しない場合、支払者別合計の空状態メッセージが表示される', async () => {
		render(Page, {
			data: {
				summary: emptySummary,
				unapprovedCount: 0,
				currentMonth: '2026-04'
			}
		});

		await expect.element(page.getByTestId('dashboard-payer-summary-empty')).toBeInTheDocument();
	});

	test('[SPEC: AC-203] カテゴリが存在しない場合、カテゴリ別合計の空状態メッセージが表示される', async () => {
		render(Page, {
			data: {
				summary: emptySummary,
				unapprovedCount: 0,
				currentMonth: '2026-04'
			}
		});

		await expect.element(page.getByTestId('dashboard-category-summary-empty')).toBeInTheDocument();
	});
});
