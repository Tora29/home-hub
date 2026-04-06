/**
 * @file テスト: 画面 ダッシュボード（ルートページ）
 * @module src/routes/page.svelte.test.ts
 * @testType unit
 *
 * @target ./+page.svelte
 * @spec specs/dashboard/spec.md
 * @covers AC-201, AC-202, AC-203
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

describe('ダッシュボード - 空状態表示', () => {
	test('[SPEC: AC-201] 対象期間に支出が0件の場合、全体合計が「¥0」と表示される', async () => {
		render(Page, {
			data: {
				summary: emptySummary,
				unapprovedCount: 0
			}
		});

		await expect.element(page.getByTestId('dashboard-total')).toBeVisible();
		await expect.element(page.getByText('¥0')).toBeVisible();
	});

	test('[SPEC: AC-202] 支払者が存在しない場合、支払者別合計の空状態メッセージが表示される', async () => {
		render(Page, {
			data: {
				summary: emptySummary,
				unapprovedCount: 0
			}
		});

		await expect
			.element(page.getByTestId('dashboard-payer-summary-empty'))
			.toBeInTheDocument();
	});

	test('[SPEC: AC-203] カテゴリが存在しない場合、カテゴリ別合計の空状態メッセージが表示される', async () => {
		render(Page, {
			data: {
				summary: emptySummary,
				unapprovedCount: 0
			}
		});

		await expect
			.element(page.getByTestId('dashboard-category-summary-empty'))
			.toBeInTheDocument();
	});
});
