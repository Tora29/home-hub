/**
 * @file テスト: Sidebar
 * @module src/lib/components/Sidebar.svelte.test.ts
 * @testType unit
 *
 * @target ./Sidebar.svelte
 * @spec specs/sidebar/spec.md
 * @covers AC-002, AC-003, AC-004
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import Sidebar from './Sidebar.svelte';

vi.mock('$app/state', () => ({
	page: { url: { pathname: '/recipes' } }
}));

describe('Sidebar', () => {
	describe('カテゴリ開閉', () => {
		it('[SPEC: AC-002] 献立系カテゴリをクリックすると配下メニューが非表示になる', async () => {
			render(Sidebar);
			await expect.element(page.getByTestId('sidebar-item-recipes')).toBeVisible();
			await page.getByTestId('sidebar-category-meal').click();
			await expect.element(page.getByTestId('sidebar-item-recipes')).not.toBeVisible();
		});

		it('[SPEC: AC-002] 閉じた献立系カテゴリを再クリックすると配下メニューが再表示される', async () => {
			render(Sidebar);
			await page.getByTestId('sidebar-category-meal').click();
			await page.getByTestId('sidebar-category-meal').click();
			await expect.element(page.getByTestId('sidebar-item-recipes')).toBeVisible();
		});

		it('[SPEC: AC-002] 収支系カテゴリをクリックすると配下メニューが非表示になる', async () => {
			render(Sidebar);
			await expect.element(page.getByTestId('sidebar-item-expenses')).toBeVisible();
			await page.getByTestId('sidebar-category-expense').click();
			await expect.element(page.getByTestId('sidebar-item-expenses')).not.toBeVisible();
		});

		it('[SPEC: AC-002] 閉じた収支系カテゴリを再クリックすると配下メニューが再表示される', async () => {
			render(Sidebar);
			await page.getByTestId('sidebar-category-expense').click();
			await page.getByTestId('sidebar-category-expense').click();
			await expect.element(page.getByTestId('sidebar-item-expenses')).toBeVisible();
		});
	});

	describe('サイドバー開閉', () => {
		it('[SPEC: AC-003] 開閉ボタンをクリックするとサイドバーが非表示になる', async () => {
			render(Sidebar);
			await expect.element(page.getByTestId('sidebar')).toBeVisible();
			await page.getByTestId('sidebar-toggle').click();
			await expect.element(page.getByTestId('sidebar')).not.toBeVisible();
		});

		it('[SPEC: AC-003] 再度クリックするとサイドバーが再表示される', async () => {
			render(Sidebar);
			await page.getByTestId('sidebar-toggle').click();
			await page.getByTestId('sidebar-toggle').click();
			await expect.element(page.getByTestId('sidebar')).toBeVisible();
		});
	});

	describe('アクティブ状態', () => {
		it('[SPEC: AC-004] 現在のパスに対応するメニュー項目が aria-current="page" を持つ', async () => {
			render(Sidebar);
			await expect
				.element(page.getByTestId('sidebar-item-recipes'))
				.toHaveAttribute('aria-current', 'page');
		});

		it('[SPEC: AC-004] 現在のパス以外のメニュー項目は aria-current を持たない', async () => {
			render(Sidebar);
			await expect
				.element(page.getByTestId('sidebar-item-expenses'))
				.not.toHaveAttribute('aria-current', 'page');
			await expect
				.element(page.getByTestId('sidebar-item-recipes-tags'))
				.not.toHaveAttribute('aria-current', 'page');
		});
	});
});
