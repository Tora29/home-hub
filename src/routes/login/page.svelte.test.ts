/**
 * @file テスト: ログイン画面
 * @module src/routes/login/+page.svelte.test.ts
 * @testType unit
 *
 * @target ./+page.svelte
 * @spec specs/login/spec.md
 * @covers AC-001, AC-002, AC-104
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import Page from './+page.svelte';

const { mockGoto, mockSignIn } = vi.hoisted(() => ({
	mockGoto: vi.fn(),
	mockSignIn: vi.fn()
}));

vi.mock('$app/navigation', () => ({
	goto: mockGoto
}));

vi.mock('$lib/auth-client', () => ({
	authClient: {
		signIn: {
			email: mockSignIn
		}
	}
}));

describe('+page.svelte', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('正常系', () => {
		it('[SPEC: AC-001] 正しい認証情報でログインすると / へ遷移する', async () => {
			mockSignIn.mockResolvedValue({ error: null });
			render(Page);

			await page.getByTestId('login-email-input').fill('test@example.com');
			await page.getByTestId('login-password-input').fill('password123');
			await page.getByTestId('login-submit-button').click();

			await vi.waitFor(() => {
				expect(mockGoto).toHaveBeenCalledWith('/');
			});
		});

		it('[SPEC: AC-002] パスワード表示切替ボタンをクリックするとパスワードフィールドの type が password から text に切り替わる', async () => {
			render(Page);
			const passwordInput = page.getByTestId('login-password-input');
			const toggleButton = page.getByTestId('login-password-toggle');

			await expect.element(passwordInput).toHaveAttribute('type', 'password');
			await toggleButton.click();
			await expect.element(passwordInput).toHaveAttribute('type', 'text');
		});

		it('[SPEC: AC-002] パスワード表示切替ボタンを再度クリックすると type が text から password に戻る', async () => {
			render(Page);
			const passwordInput = page.getByTestId('login-password-input');
			const toggleButton = page.getByTestId('login-password-toggle');

			await toggleButton.click();
			await expect.element(passwordInput).toHaveAttribute('type', 'text');
			await toggleButton.click();
			await expect.element(passwordInput).toHaveAttribute('type', 'password');
		});
	});

	describe('異常系', () => {
		it('[SPEC: AC-104] 認証に失敗した場合、「メールアドレスまたはパスワードが正しくありません」エラーが表示される', async () => {
			mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } });
			render(Page);

			await page.getByTestId('login-email-input').fill('test@example.com');
			await page.getByTestId('login-password-input').fill('wrongpassword');
			await page.getByTestId('login-submit-button').click();

			await expect
				.element(page.getByTestId('login-auth-error'))
				.toHaveTextContent('メールアドレスまたはパスワードが正しくありません');
		});

		it('[SPEC: AC-104] 認証失敗後は / へ遷移しない', async () => {
			mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } });
			render(Page);

			await page.getByTestId('login-email-input').fill('test@example.com');
			await page.getByTestId('login-password-input').fill('wrongpassword');
			await page.getByTestId('login-submit-button').click();

			await vi.waitFor(() => {
				expect(page.getByTestId('login-auth-error').element()).toBeTruthy();
			});
			expect(mockGoto).not.toHaveBeenCalled();
		});
	});
});
