/**
 * @file E2Eテスト: 認証フロー
 * @module apps/web/e2e/auth.spec.ts
 * @testType e2e
 *
 * @spec specs/auth/spec.md
 * @covers AC-001, AC-002, AC-003, AC-004, AC-101, AC-102, AC-201, AC-202
 *
 * @scenarios
 * - 正しい認証情報でログインすると / にリダイレクトされる
 * - ログアウトすると /login にリダイレクトされる
 * - 未認証で / にアクセスすると /login にリダイレクトされる
 * - ログイン済みで /login にアクセスすると / にリダイレクトされる
 * - 存在しないメールアドレスでログインするとエラーが表示される
 * - 誤ったパスワードでログインするとエラーが表示される
 * - email 空でログインボタンを押すとバリデーションエラーが表示される
 * - password 空でログインボタンを押すとバリデーションエラーが表示される
 *
 * @pages
 * - /login - ログイン画面
 * - /     - ホーム画面
 */
import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'husband@example.com';
const TEST_PASSWORD = 'password123';

test.describe('認証フロー', () => {
	test('[AC-003] 未認証状態で / にアクセスすると /login にリダイレクトされる', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL('/login');
		await expect(page.getByTestId('auth-create-form')).toBeVisible();
	});

	test('[AC-001] 正しい認証情報でログインすると / にリダイレクトされる', async ({ page }) => {
		await page.goto('/login');
		await page.getByTestId('auth-email-input').fill(TEST_EMAIL);
		await page.getByTestId('auth-password-input').fill(TEST_PASSWORD);
		await page.getByTestId('auth-submit-button').click();

		await expect(page).toHaveURL('/');
		await expect(page.getByRole('button', { name: 'ログアウト' })).toBeVisible();
	});

	test('[AC-002] ログアウトすると /login にリダイレクトされる', async ({ page }) => {
		// ログイン状態を作る
		await page.goto('/login');
		await page.getByTestId('auth-email-input').fill(TEST_EMAIL);
		await page.getByTestId('auth-password-input').fill(TEST_PASSWORD);
		await page.getByTestId('auth-submit-button').click();
		await expect(page).toHaveURL('/');

		// ログアウト
		await page.getByRole('button', { name: 'ログアウト' }).click();

		await expect(page).toHaveURL('/login');
		await expect(page.getByTestId('auth-create-form')).toBeVisible();
	});

	test('[AC-004] ログイン済みで /login にアクセスすると / にリダイレクトされる', async ({
		page
	}) => {
		// ログイン状態を作る
		await page.goto('/login');
		await page.getByTestId('auth-email-input').fill(TEST_EMAIL);
		await page.getByTestId('auth-password-input').fill(TEST_PASSWORD);
		await page.getByTestId('auth-submit-button').click();
		await expect(page).toHaveURL('/');

		// ログイン済みで /login に直接アクセス
		await page.goto('/login');
		await expect(page).toHaveURL('/');
	});

	test('[AC-101] 存在しないメールアドレスでログインするとエラーが表示される', async ({ page }) => {
		await page.goto('/login');
		await page.getByTestId('auth-email-input').fill('notexist@example.com');
		await page.getByTestId('auth-password-input').fill(TEST_PASSWORD);
		await page.getByTestId('auth-submit-button').click();

		const errorAlert = page.getByRole('alert');
		await expect(errorAlert).toBeVisible();
		await expect(errorAlert).toContainText('メールアドレスまたはパスワードが正しくありません');
		await expect(page).toHaveURL('/login');
	});

	test('[AC-102] 誤ったパスワードでログインするとエラーが表示される', async ({ page }) => {
		await page.goto('/login');
		await page.getByTestId('auth-email-input').fill(TEST_EMAIL);
		await page.getByTestId('auth-password-input').fill('wrongpassword');
		await page.getByTestId('auth-submit-button').click();

		const errorAlert = page.getByRole('alert');
		await expect(errorAlert).toBeVisible();
		await expect(errorAlert).toContainText('メールアドレスまたはパスワードが正しくありません');
		await expect(page).toHaveURL('/login');
	});

	test('[AC-201] email が空のままログインボタンを押すとバリデーションエラーが表示される', async ({
		page
	}) => {
		await page.goto('/login');
		await page.getByTestId('auth-password-input').fill(TEST_PASSWORD);
		await page.getByTestId('auth-submit-button').click();

		const emailError = page.locator('#auth-email-error');
		await expect(emailError).toBeVisible();
		await expect(emailError).toHaveText('メールアドレスの形式が正しくありません');
		await expect(page).toHaveURL('/login');
	});

	test('[AC-202] password が空のままログインボタンを押すとバリデーションエラーが表示される', async ({
		page
	}) => {
		await page.goto('/login');
		await page.getByTestId('auth-email-input').fill(TEST_EMAIL);
		await page.getByTestId('auth-submit-button').click();

		const passwordError = page.locator('#auth-password-error');
		await expect(passwordError).toBeVisible();
		await expect(passwordError).toHaveText('パスワードは必須です');
		await expect(page).toHaveURL('/login');
	});
});
