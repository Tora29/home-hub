/**
 * @file E2Eテスト: ヘッダー
 * @module e2e/header.e2e.ts
 * @testType e2e
 *
 * @spec specs/header/spec.md
 * @covers AC-001, AC-002, AC-003, AC-004, AC-201
 *
 * @scenarios
 * - ロゴをクリックするとルートページへ遷移する
 * - ダークモード切替ボタンでライト/ダーク表示が切り替わる
 * - ダークモード状態がリロード後も維持される
 * - ログアウトボタンをクリックすると /login へ遷移する
 * - localStorage に theme が未設定の場合、html.dark の有無に従って初期モードが決まる
 *
 * @pages
 * - / - トップページ（ヘッダー表示確認）
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

test.describe('ヘッダー', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('[SPEC: AC-001] ロゴをクリックすると / へ遷移する', async ({ page }) => {
		// 別ページへ移動後にロゴをクリックして / に戻ることを確認
		await page.goto('/login');
		await login(page);
		await page.getByTestId('header-logo').click();
		await expect(page).toHaveURL('/');
	});

	test('[SPEC: AC-002] ダークモード切替ボタンをクリックするとダーク表示に切り替わる', async ({
		page
	}) => {
		const html = page.locator('html');

		// ライトモードに揃える
		await page.evaluate(() => {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		});

		await page.getByTestId('header-dark-toggle').click();
		await expect(html).toHaveClass(/dark/);
	});

	test('[SPEC: AC-002] ダークモード切替ボタンを再度クリックするとライト表示に戻る', async ({
		page
	}) => {
		const html = page.locator('html');

		// ダークモードに揃える
		await page.evaluate(() => {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		});

		await page.getByTestId('header-dark-toggle').click();
		await expect(html).not.toHaveClass(/dark/);
	});

	test('[SPEC: AC-003] ダークモード状態がリロード後も維持される', async ({ page }) => {
		const html = page.locator('html');

		// ダークモードに切り替え
		await page.evaluate(() => {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		});
		await page.getByTestId('header-dark-toggle').click();
		await expect(html).toHaveClass(/dark/);

		await page.reload();
		await expect(html).toHaveClass(/dark/);
	});

	test('[SPEC: AC-004] ログアウトボタンをクリックするとセッションが破棄され /login へ遷移する', async ({
		page
	}) => {
		await page.getByTestId('header-logout-button').click();
		await expect(page).toHaveURL('/login');

		// ログアウト後に / へアクセスすると /login へリダイレクトされることを確認
		await page.goto('/');
		await expect(page).toHaveURL('/login');
	});

	test('[SPEC: AC-201] localStorage に theme が未設定の場合、リロード後も html.dark の有無が維持される', async ({
		page
	}) => {
		const html = page.locator('html');

		// theme を削除してリロード
		await page.evaluate(() => localStorage.removeItem('theme'));
		const hasDarkBeforeReload = await html.evaluate((el) => el.classList.contains('dark'));

		await page.reload();
		const hasDarkAfterReload = await html.evaluate((el) => el.classList.contains('dark'));

		expect(hasDarkAfterReload).toBe(hasDarkBeforeReload);
	});
});
