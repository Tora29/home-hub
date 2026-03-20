/**
 * @file テスト: LoginPage
 * @module src/routes/login/page.svelte.test.ts
 * @testType unit
 *
 * @target ./+page.svelte
 * @spec specs/login/spec.md
 * @covers AC-001, AC-002, AC-101, AC-102, AC-103, AC-104
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import LoginPage from './+page.svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$lib/auth-client', () => ({
	authClient: {
		signIn: {
			email: vi.fn()
		}
	}
}));

describe('LoginPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('ログイン成功', () => {
		it('[SPEC: AC-001] 正しいメールとパスワードでログインすると / へ遷移する', async () => {
			const { authClient } = await import('$lib/auth-client');
			vi.mocked(authClient.signIn.email).mockResolvedValue({ data: {}, error: null } as never);

			render(LoginPage);
			await page.getByTestId('login-email-input').fill('test@example.com');
			await page.getByTestId('login-password-input').fill('password123');
			await page.getByTestId('login-submit-button').click();

			const { goto } = await import('$app/navigation');
			await vi.waitFor(() => {
				expect(goto).toHaveBeenCalledWith('/');
			});
		});
	});

	describe('パスワード表示切替', () => {
		it('[SPEC: AC-002] 初期状態でパスワードフィールドの type は password である', async () => {
			render(LoginPage);
			const passwordInput = page.getByTestId('login-password-input');
			await expect.element(passwordInput).toHaveAttribute('type', 'password');
		});

		it('[SPEC: AC-002] パスワード表示切替ボタンをクリックするとパスワードが表示状態になる', async () => {
			render(LoginPage);
			await page.getByTestId('login-password-toggle').click();
			const passwordInput = page.getByTestId('login-password-input');
			await expect.element(passwordInput).toHaveAttribute('type', 'text');
		});

		it('[SPEC: AC-002] もう一度クリックするとパスワードが非表示に戻る', async () => {
			render(LoginPage);
			const toggle = page.getByTestId('login-password-toggle');
			await toggle.click();
			await toggle.click();
			const passwordInput = page.getByTestId('login-password-input');
			await expect.element(passwordInput).toHaveAttribute('type', 'password');
		});
	});

	describe('バリデーションエラー表示', () => {
		it('[SPEC: AC-101] メールアドレスが空でログインボタンを押すと「メールアドレスは必須です」が表示される', async () => {
			render(LoginPage);
			await page.getByTestId('login-password-input').fill('password123');
			await page.getByTestId('login-submit-button').click();

			const emailError = page.getByTestId('login-email-error');
			await expect.element(emailError).toHaveTextContent('メールアドレスは必須です');
		});

		it('[SPEC: AC-102] メールアドレスの形式が不正な場合、「正しいメールアドレスを入力してください」が表示される', async () => {
			render(LoginPage);
			await page.getByTestId('login-email-input').fill('not-an-email');
			await page.getByTestId('login-password-input').fill('password123');
			await page.getByTestId('login-submit-button').click();

			const emailError = page.getByTestId('login-email-error');
			await expect.element(emailError).toHaveTextContent('正しいメールアドレスを入力してください');
		});

		it('[SPEC: AC-103] パスワードが空でログインボタンを押すと「パスワードは必須です」が表示される', async () => {
			render(LoginPage);
			await page.getByTestId('login-email-input').fill('test@example.com');
			await page.getByTestId('login-submit-button').click();

			const passwordError = page.getByTestId('login-password-error');
			await expect.element(passwordError).toHaveTextContent('パスワードは必須です');
		});

		it('[SPEC: AC-101] バリデーションエラー時は signIn.email が呼ばれない', async () => {
			const { authClient } = await import('$lib/auth-client');
			render(LoginPage);
			await page.getByTestId('login-submit-button').click();

			expect(authClient.signIn.email).not.toHaveBeenCalled();
		});
	});

	describe('認証エラー', () => {
		it('[SPEC: AC-104] 認証に失敗した場合、「メールアドレスまたはパスワードが正しくありません」が表示される', async () => {
			const { authClient } = await import('$lib/auth-client');
			vi.mocked(authClient.signIn.email).mockResolvedValue({
				data: null,
				error: { message: 'Invalid credentials' }
			} as never);

			render(LoginPage);
			await page.getByTestId('login-email-input').fill('test@example.com');
			await page.getByTestId('login-password-input').fill('wrongpassword');
			await page.getByTestId('login-submit-button').click();

			const authError = page.getByTestId('login-auth-error');
			await expect.element(authError).toHaveTextContent(
				'メールアドレスまたはパスワードが正しくありません'
			);
		});

		it('[SPEC: AC-104] 認証失敗時は / へ遷移しない', async () => {
			const { authClient } = await import('$lib/auth-client');
			vi.mocked(authClient.signIn.email).mockResolvedValue({
				data: null,
				error: { message: 'Invalid credentials' }
			} as never);

			render(LoginPage);
			await page.getByTestId('login-email-input').fill('test@example.com');
			await page.getByTestId('login-password-input').fill('wrongpassword');
			await page.getByTestId('login-submit-button').click();

			const { goto } = await import('$app/navigation');
			expect(goto).not.toHaveBeenCalled();
		});
	});
});
