/**
 * @file E2Eテスト: ログイン
 * @module e2e/login.e2e.ts
 * @testType e2e
 *
 * @scenarios
 * - 初期表示: ログインページが表示される
 * - 未認証リダイレクト: 未認証でアクセスするとログインページへリダイレクトされる
 * - OAuth エラー: ?error パラメータがある場合はエラーメッセージが表示される
 *
 * @pages
 * - /login - ログイン
 */
import { test, expect } from '@playwright/test';

test.describe('ログインページ - 初期表示', () => {
	// storageState を使わない（未認証状態）
	test.use({ storageState: { cookies: [], origins: [] } });

	test.beforeEach(async ({ page }) => {
		await page.goto('/login');
	});

	test('ページタイトルとキャッチコピーが表示される', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Home Hub' })).toBeVisible();
		await expect(page.getByText('暮らしをふたりで')).toBeVisible();
	});

	test('Google でログインボタンが表示される', async ({ page }) => {
		await expect(page.getByTestId('login-google-button')).toBeVisible();
		await expect(page.getByTestId('login-google-button')).toHaveText('Google でログイン');
	});

	test('エラーなしの場合はエラーメッセージが表示されない', async ({ page }) => {
		await expect(page.getByTestId('login-auth-error')).not.toBeVisible();
	});
});

test.describe('ログインページ - OAuth エラー表示', () => {
	test.use({ storageState: { cookies: [], origins: [] } });

	test('?error パラメータがある場合はエラーメッセージが表示される', async ({ page }) => {
		await page.goto('/login?error=OAuthSignin');
		await expect(page.getByTestId('login-auth-error')).toBeVisible();
		await expect(page.getByTestId('login-auth-error')).toHaveText(
			'ログインに失敗しました。もう一度お試しください。'
		);
	});
});

test.describe('認証リダイレクト', () => {
	test.use({ storageState: { cookies: [], origins: [] } });

	test('未認証でトップページにアクセスするとログインページへリダイレクトされる', async ({
		page
	}) => {
		await page.goto('/');
		await expect(page).toHaveURL(/\/login/);
		await expect(page.getByTestId('login-google-button')).toBeVisible();
	});

	test('未認証でレシピページにアクセスするとログインページへリダイレクトされる', async ({
		page
	}) => {
		await page.goto('/recipes');
		await expect(page).toHaveURL(/\/login/);
	});

	test('未認証で支出ページにアクセスするとログインページへリダイレクトされる', async ({ page }) => {
		await page.goto('/expenses');
		await expect(page).toHaveURL(/\/login/);
	});
});
