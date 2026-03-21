/**
 * @file テスト: Sidebar
 * @module src/lib/components/Sidebar.svelte.test.ts
 * @testType unit
 *
 * @target ./Sidebar.svelte
 * @spec specs/sidebar/spec.md
 * @covers AC-002, AC-003, AC-004, AC-007
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';

// $app/state の page をモック（vi.hoisted でファクトリ内からアクセス可能にする）
const mockPage = vi.hoisted(() => ({ url: { pathname: '/' } }));

vi.mock('$app/state', () => ({
	page: mockPage
}));

vi.mock('$lib/stores/sidebar', async () => {
	const { writable } = await import('svelte/store');
	return { mobileOpen: writable(false) };
});

import Sidebar from './Sidebar.svelte';

beforeEach(() => {
	localStorage.clear();
	mockPage.url.pathname = '/';
});

describe('Sidebar', () => {
	describe('カテゴリ開閉（AC-002）', () => {
		it('[SPEC: AC-002] カテゴリはデフォルトで開いた状態（aria-expanded="true"）である', async () => {
			render(Sidebar);

			await expect
				.element(page.getByTestId('sidebar-category-meal'))
				.toHaveAttribute('aria-expanded', 'true');
			await expect
				.element(page.getByTestId('sidebar-category-expense'))
				.toHaveAttribute('aria-expanded', 'true');
		});

		it('[SPEC: AC-002] 献立系カテゴリ見出しをクリックすると aria-expanded が false になる', async () => {
			render(Sidebar);

			const mealCategory = page.getByTestId('sidebar-category-meal');
			await mealCategory.click();

			await expect.element(mealCategory).toHaveAttribute('aria-expanded', 'false');
		});

		it('[SPEC: AC-002] 閉じた献立系カテゴリを再クリックすると aria-expanded が true に戻る', async () => {
			render(Sidebar);

			const mealCategory = page.getByTestId('sidebar-category-meal');
			await mealCategory.click();
			await mealCategory.click();

			await expect.element(mealCategory).toHaveAttribute('aria-expanded', 'true');
		});

		it('[SPEC: AC-002] 収支系カテゴリの開閉は献立系カテゴリと独立して動作する', async () => {
			render(Sidebar);

			const expenseCategory = page.getByTestId('sidebar-category-expense');
			const mealCategory = page.getByTestId('sidebar-category-meal');

			await expenseCategory.click();

			await expect.element(expenseCategory).toHaveAttribute('aria-expanded', 'false');
			await expect.element(mealCategory).toHaveAttribute('aria-expanded', 'true');
		});
	});

	describe('サイドバー開閉ボタン（AC-003）', () => {
		it('[SPEC: AC-003] トグルボタンの初期 aria-label は「サイドバーを閉じる」である', async () => {
			render(Sidebar);

			await expect
				.element(page.getByTestId('sidebar-toggle'))
				.toHaveAttribute('aria-label', 'サイドバーを閉じる');
		});

		it('[SPEC: AC-003] トグルボタンをクリックすると aria-label が「サイドバーを開く」に変わる', async () => {
			render(Sidebar);

			const toggle = page.getByTestId('sidebar-toggle');
			await toggle.click();

			await expect.element(toggle).toHaveAttribute('aria-label', 'サイドバーを開く');
		});

		it('[SPEC: AC-003] 閉じた状態でトグルボタンをクリックすると aria-label が「サイドバーを閉じる」に戻る', async () => {
			render(Sidebar);

			const toggle = page.getByTestId('sidebar-toggle');
			await toggle.click();
			await toggle.click();

			await expect.element(toggle).toHaveAttribute('aria-label', 'サイドバーを閉じる');
		});

		it('[SPEC: AC-003] トグルボタンクリック後に nav の aria-hidden が true になる', async () => {
			render(Sidebar);

			const toggle = page.getByTestId('sidebar-toggle');
			await toggle.click();

			await expect.element(page.getByTestId('sidebar')).toHaveAttribute('aria-hidden', 'true');
		});
	});

	describe('localStorage 永続化（AC-007）', () => {
		it('[SPEC: AC-007] 初期表示時に localStorage の sidebar-open が true に設定される', async () => {
			render(Sidebar);

			// $effect 実行を待つために aria-label の存在確認を先行する
			await expect
				.element(page.getByTestId('sidebar-toggle'))
				.toHaveAttribute('aria-label', 'サイドバーを閉じる');

			expect(localStorage.getItem('sidebar-open')).toBe('true');
		});

		it('[SPEC: AC-007] トグルボタンをクリックすると localStorage に false が保存される', async () => {
			render(Sidebar);

			const toggle = page.getByTestId('sidebar-toggle');
			await toggle.click();

			// 状態変更後の aria-label 更新を待ってから localStorage を検証
			await expect.element(toggle).toHaveAttribute('aria-label', 'サイドバーを開く');

			expect(localStorage.getItem('sidebar-open')).toBe('false');
		});

		it('[SPEC: AC-007] localStorage に false がある場合、サイドバーは閉じた状態で初期化される', async () => {
			localStorage.setItem('sidebar-open', 'false');
			render(Sidebar);

			await expect
				.element(page.getByTestId('sidebar-toggle'))
				.toHaveAttribute('aria-label', 'サイドバーを開く');
		});

		it('[SPEC: AC-007] localStorage に値がない場合、サイドバーは開いた状態で初期化される', async () => {
			render(Sidebar);

			await expect
				.element(page.getByTestId('sidebar-toggle'))
				.toHaveAttribute('aria-label', 'サイドバーを閉じる');
		});
	});

	describe('アクティブ状態（AC-004）', () => {
		it('[SPEC: AC-004] /recipes アクセス時、レシピ一覧リンクが aria-current="page" を持つ', async () => {
			mockPage.url.pathname = '/recipes';
			render(Sidebar);

			await expect
				.element(page.getByTestId('sidebar-item-recipes'))
				.toHaveAttribute('aria-current', 'page');
		});

		it('[SPEC: AC-004] /recipes アクセス時、他のメニュー項目は aria-current を持たない', async () => {
			mockPage.url.pathname = '/recipes';
			render(Sidebar);

			await expect
				.element(page.getByTestId('sidebar-item-recipes-tags'))
				.not.toHaveAttribute('aria-current');
			await expect
				.element(page.getByTestId('sidebar-item-expenses'))
				.not.toHaveAttribute('aria-current');
		});

		it('[SPEC: AC-004] /recipes/tags アクセス時、タグリンクが aria-current="page" を持つ', async () => {
			mockPage.url.pathname = '/recipes/tags';
			render(Sidebar);

			await expect
				.element(page.getByTestId('sidebar-item-recipes-tags'))
				.toHaveAttribute('aria-current', 'page');
			await expect
				.element(page.getByTestId('sidebar-item-recipes'))
				.not.toHaveAttribute('aria-current');
		});

		it('[SPEC: AC-004] /expenses アクセス時、家計簿リンクが aria-current="page" を持つ', async () => {
			mockPage.url.pathname = '/expenses';
			render(Sidebar);

			await expect
				.element(page.getByTestId('sidebar-item-expenses'))
				.toHaveAttribute('aria-current', 'page');
		});

		it('[SPEC: AC-004] いずれのページにも対応しないパスではすべての項目が aria-current を持たない', async () => {
			mockPage.url.pathname = '/';
			render(Sidebar);

			await expect
				.element(page.getByTestId('sidebar-item-recipes'))
				.not.toHaveAttribute('aria-current');
			await expect
				.element(page.getByTestId('sidebar-item-recipes-tags'))
				.not.toHaveAttribute('aria-current');
			await expect
				.element(page.getByTestId('sidebar-item-expenses'))
				.not.toHaveAttribute('aria-current');
		});
	});
});
