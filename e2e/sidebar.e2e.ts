/**
 * @file E2Eテスト: サイドバー
 * @module e2e/sidebar.e2e.ts
 * @testType e2e
 *
 * @spec specs/sidebar/spec.md
 * @covers AC-001, AC-005, AC-006, AC-007
 *
 * @scenarios
 * - メニュー項目クリックで対応するページへ遷移する
 * - localStorage の開閉状態がリロード後も維持される
 * - モバイル幅ではサイドバーはデフォルト非表示
 * - モバイルのハンバーガーボタンでサイドバーを開閉できる
 * - デスクトップ幅ではサイドバーはデフォルト表示
 *
 * @pages
 * - / - トップページ（サイドバー表示確認）
 */
import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL ?? 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'password123';

async function login(page: Page): Promise<void> {
	await page.goto('/login');
	await page.getByTestId('login-email-input').fill(TEST_EMAIL);
	await page.getByTestId('login-password-input').fill(TEST_PASSWORD);
	await page.getByTestId('login-submit-button').click();
	await expect(page).toHaveURL('/');
}

test.describe('サイドバー（デスクトップ）', () => {
	test.use({ viewport: { width: 1280, height: 720 } });

	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('[SPEC: AC-006] デスクトップ幅ではサイドバーはデフォルト表示される', async ({ page }) => {
		await expect(page.getByTestId('sidebar')).toBeVisible();
	});

	test('[SPEC: AC-001] レシピ一覧メニュー項目をクリックすると /recipes へ遷移する', async ({
		page
	}) => {
		// カテゴリを一度閉じてから開き、items が開閉後もクリック可能であることを検証する
		await page.getByTestId('sidebar-category-meal').click();
		await expect(page.getByTestId('sidebar-category-meal')).toHaveAttribute(
			'aria-expanded',
			'false'
		);
		await page.getByTestId('sidebar-category-meal').click();
		await expect(page.getByTestId('sidebar-category-meal')).toHaveAttribute(
			'aria-expanded',
			'true'
		);
		await page.getByTestId('sidebar-item-recipes').click();
		await expect(page).toHaveURL('/recipes');
	});

	test('[SPEC: AC-001] 家計簿メニュー項目をクリックすると /expenses へ遷移する', async ({
		page
	}) => {
		await page.getByTestId('sidebar-category-expense').click();
		await expect(page.getByTestId('sidebar-category-expense')).toHaveAttribute(
			'aria-expanded',
			'false'
		);
		await page.getByTestId('sidebar-category-expense').click();
		await expect(page.getByTestId('sidebar-category-expense')).toHaveAttribute(
			'aria-expanded',
			'true'
		);
		await page.getByTestId('sidebar-item-expenses').click();
		await expect(page).toHaveURL('/expenses');
	});

	test('[SPEC: AC-007] サイドバーを閉じた状態がリロード後も維持される', async ({ page }) => {
		await page.getByTestId('sidebar-toggle').click();
		await expect(page.getByTestId('sidebar')).not.toBeVisible();

		await page.reload();
		await expect(page.getByTestId('sidebar')).not.toBeVisible();
	});

	test('[SPEC: AC-007] サイドバーを開いた状態がリロード後も維持される', async ({ page }) => {
		// 一度閉じてから開く
		await page.getByTestId('sidebar-toggle').click();
		await expect(page.getByTestId('sidebar')).not.toBeVisible();

		await page.getByTestId('sidebar-toggle').click();
		await expect(page.getByTestId('sidebar')).toBeVisible();

		await page.reload();
		await expect(page.getByTestId('sidebar')).toBeVisible();
	});
});

test.describe('サイドバー（モバイル）', () => {
	test.use({ viewport: { width: 375, height: 667 } });

	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('[SPEC: AC-005] モバイル幅ではサイドバーはデフォルト非表示', async ({ page }) => {
		await expect(page.getByTestId('sidebar')).not.toBeVisible();
	});

	test('[SPEC: AC-005] モバイルのハンバーガーボタンをクリックするとサイドバーが表示される', async ({
		page
	}) => {
		await page.getByTestId('sidebar-hamburger').click();
		await expect(page.getByTestId('sidebar')).toBeVisible();
	});

	test('[SPEC: AC-005] モバイルのオーバーレイをクリックするとサイドバーが閉じる', async ({
		page
	}) => {
		await page.getByTestId('sidebar-hamburger').click();
		await expect(page.getByTestId('sidebar')).toBeVisible();

		await page.getByTestId('sidebar-overlay').click();
		await expect(page.getByTestId('sidebar')).not.toBeVisible();
	});
});
