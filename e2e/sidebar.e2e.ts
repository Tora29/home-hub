/**
 * @file E2Eテスト: Sidebar ナビゲーション
 * @module e2e/sidebar.e2e.ts
 * @testType e2e
 *
 * @spec specs/sidebar/spec.md
 * @covers AC-001, AC-004, AC-005, AC-006
 *
 * @scenarios
 * - メニュー項目クリックによるページ遷移
 * - 現在ページのアクティブ状態表示
 * - モバイル幅でのデフォルト非表示とハンバーガーボタン操作
 * - デスクトップ幅でのデフォルト表示
 *
 * @pages
 * / - トップページ（サイドバー確認起点）
 * /recipes - レシピ一覧
 * /recipes/tags - タグ
 * /expenses - 家計簿
 */

import { test, expect } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 375, height: 812 };
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };

test.describe('Sidebar', () => {
	test.describe('ナビゲーション遷移', () => {
		test('[SPEC: AC-001] レシピ一覧メニューをクリックすると /recipes へ遷移する', async ({
			page
		}) => {
			await page.goto('/');
			await page.getByTestId('sidebar-item-recipes').click();
			await expect(page).toHaveURL('/recipes');
		});

		test('[SPEC: AC-001] タグメニューをクリックすると /recipes/tags へ遷移する', async ({
			page
		}) => {
			await page.goto('/');
			await page.getByTestId('sidebar-item-recipes-tags').click();
			await expect(page).toHaveURL('/recipes/tags');
		});

		test('[SPEC: AC-001] 家計簿メニューをクリックすると /expenses へ遷移する', async ({
			page
		}) => {
			await page.goto('/');
			await page.getByTestId('sidebar-item-expenses').click();
			await expect(page).toHaveURL('/expenses');
		});
	});

	test.describe('アクティブ状態', () => {
		test('[SPEC: AC-004] /recipes 表示中はレシピ一覧メニューが aria-current="page" を持つ', async ({
			page
		}) => {
			await page.goto('/recipes');
			await expect(page.getByTestId('sidebar-item-recipes')).toHaveAttribute(
				'aria-current',
				'page'
			);
		});

		test('[SPEC: AC-004] /recipes 表示中は他のメニュー項目が aria-current を持たない', async ({
			page
		}) => {
			await page.goto('/recipes');
			await expect(page.getByTestId('sidebar-item-expenses')).not.toHaveAttribute(
				'aria-current',
				'page'
			);
			await expect(page.getByTestId('sidebar-item-recipes-tags')).not.toHaveAttribute(
				'aria-current',
				'page'
			);
		});

		test('[SPEC: AC-004] /expenses 表示中は家計簿メニューが aria-current="page" を持つ', async ({
			page
		}) => {
			await page.goto('/expenses');
			await expect(page.getByTestId('sidebar-item-expenses')).toHaveAttribute(
				'aria-current',
				'page'
			);
		});

		test('[SPEC: AC-004] /recipes/tags 表示中はタグメニューが aria-current="page" を持つ', async ({
			page
		}) => {
			await page.goto('/recipes/tags');
			await expect(page.getByTestId('sidebar-item-recipes-tags')).toHaveAttribute(
				'aria-current',
				'page'
			);
		});
	});

	test.describe('モバイル表示', () => {
		test('[SPEC: AC-005] モバイル幅ではサイドバーがデフォルト非表示になる', async ({ page }) => {
			await page.setViewportSize(MOBILE_VIEWPORT);
			await page.goto('/');
			await expect(page.getByTestId('sidebar')).not.toBeVisible();
		});

		test('[SPEC: AC-005] モバイル幅ではハンバーガーボタンが表示される', async ({ page }) => {
			await page.setViewportSize(MOBILE_VIEWPORT);
			await page.goto('/');
			await expect(page.getByTestId('sidebar-hamburger')).toBeVisible();
		});

		test('[SPEC: AC-005] ハンバーガーボタンをクリックするとサイドバーが表示される', async ({
			page
		}) => {
			await page.setViewportSize(MOBILE_VIEWPORT);
			await page.goto('/');
			await page.getByTestId('sidebar-hamburger').click();
			await expect(page.getByTestId('sidebar')).toBeVisible();
		});

		test('[SPEC: AC-005] モバイルのオーバーレイをクリックするとサイドバーが閉じる', async ({
			page
		}) => {
			await page.setViewportSize(MOBILE_VIEWPORT);
			await page.goto('/');
			await page.getByTestId('sidebar-hamburger').click();
			await expect(page.getByTestId('sidebar')).toBeVisible();
			await page.getByTestId('sidebar-overlay').click();
			await expect(page.getByTestId('sidebar')).not.toBeVisible();
		});
	});

	test.describe('デスクトップ表示', () => {
		test('[SPEC: AC-006] デスクトップ幅ではサイドバーがデフォルト表示される', async ({
			page
		}) => {
			await page.setViewportSize(DESKTOP_VIEWPORT);
			await page.goto('/');
			await expect(page.getByTestId('sidebar')).toBeVisible();
		});

		test('[SPEC: AC-006] デスクトップ幅ではハンバーガーボタンが非表示になる', async ({
			page
		}) => {
			await page.setViewportSize(DESKTOP_VIEWPORT);
			await page.goto('/');
			await expect(page.getByTestId('sidebar-hamburger')).not.toBeVisible();
		});
	});
});
