/**
 * @file E2Eテスト: ログイン
 * @module e2e/login.e2e.ts
 * @testType e2e
 *
 * @spec specs/login/spec.md
 * @covers AC-001, AC-002, AC-003, AC-101, AC-102, AC-103, AC-104
 *
 * @scenarios
 * - 正しいメールアドレスとパスワードでログインするとルートページへ遷移する
 * - パスワード表示切替ボタンで表示/非表示が切り替わる
 * - 未認証で / にアクセスすると /login へリダイレクトされる
 * - メールアドレスが空の場合にエラーが表示される
 * - メールアドレスの形式が不正な場合にエラーが表示される
 * - パスワードが空の場合にエラーが表示される
 * - 認証失敗時にフォーム全体エラーが表示される
 *
 * @pages
 * - /login - ログイン画面
 */
import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL ?? 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'password123';

test.describe('認証ガード', () => {
	test('[SPEC: AC-003] 未認証で / にアクセスすると /login へリダイレクトされる', async ({
		page
	}) => {
		await page.goto('/');
		await expect(page).toHaveURL('/login');
	});
});

test.describe('ログイン画面', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/login');
	});

	test('[SPEC: AC-001] 正しいメールアドレスとパスワードでログインするとルートページへ遷移する', async ({
		page
	}) => {
		await page.getByTestId('login-email-input').fill(TEST_EMAIL);
		await page.getByTestId('login-password-input').fill(TEST_PASSWORD);
		await page.getByTestId('login-submit-button').click();
		await expect(page).toHaveURL('/');
	});

	test('[SPEC: AC-002] パスワード表示切替ボタンをクリックするとパスワードの表示/非表示が切り替わる', async ({
		page
	}) => {
		const passwordInput = page.getByTestId('login-password-input');

		await expect(passwordInput).toHaveAttribute('type', 'password');

		await page.getByTestId('login-password-toggle').click();
		await expect(passwordInput).toHaveAttribute('type', 'text');

		await page.getByTestId('login-password-toggle').click();
		await expect(passwordInput).toHaveAttribute('type', 'password');
	});

	test('[SPEC: AC-101] メールアドレスが空の場合「メールアドレスは必須です」エラーが表示される', async ({
		page
	}) => {
		await page.getByTestId('login-password-input').fill(TEST_PASSWORD);
		await page.getByTestId('login-submit-button').click();
		await expect(page.getByTestId('login-email-error')).toHaveText('メールアドレスは必須です');
	});

	test('[SPEC: AC-102] メールアドレスの形式が不正な場合「正しいメールアドレスを入力してください」エラーが表示される', async ({
		page
	}) => {
		await page.getByTestId('login-email-input').fill('invalid-email');
		await page.getByTestId('login-password-input').fill(TEST_PASSWORD);
		await page.getByTestId('login-submit-button').click();
		await expect(page.getByTestId('login-email-error')).toHaveText(
			'正しいメールアドレスを入力してください'
		);
	});

	test('[SPEC: AC-103] パスワードが空の場合「パスワードは必須です」エラーが表示される', async ({
		page
	}) => {
		await page.getByTestId('login-email-input').fill(TEST_EMAIL);
		await page.getByTestId('login-submit-button').click();
		await expect(page.getByTestId('login-password-error')).toHaveText('パスワードは必須です');
	});

	test('[SPEC: AC-104] 認証失敗時に「メールアドレスまたはパスワードが正しくありません」エラーが表示される', async ({
		page
	}) => {
		await page.getByTestId('login-email-input').fill('wrong@example.com');
		await page.getByTestId('login-password-input').fill('wrongpassword123');
		await page.getByTestId('login-submit-button').click();
		await expect(page.getByTestId('login-auth-error')).toHaveText(
			'メールアドレスまたはパスワードが正しくありません'
		);
	});
});
