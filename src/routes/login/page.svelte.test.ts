/**
 * @file テスト: ログイン画面
 * @module src/routes/login/+page.svelte.test.ts
 * @testType unit
 *
 * @target ./+page.svelte
 * @spec specs/login/spec.md
 * @covers AC-001, AC-002, AC-104
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
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
		test('[SPEC: AC-001] 正しい認証情報でログインすると / へ遷移する', async () => {
			mockSignIn.mockResolvedValue({ error: null });
			render(Page);

			await page.getByLabelText('メールアドレス').fill('test@example.com');
			await page.getByLabelText('パスワード', { exact: true }).fill('password123');
			await page.getByRole('button', { name: 'ログイン' }).click();

			await vi.waitFor(() => {
				expect(mockGoto).toHaveBeenCalledWith('/');
			});
		});

		test('[SPEC: AC-002] パスワード表示切替ボタンをクリックするとパスワードフィールドの type が password から text に切り替わる', async () => {
			render(Page);
			const passwordInput = page.getByLabelText('パスワード', { exact: true });
			const toggleButton = page.getByRole('button', { name: 'パスワードを表示する' });

			await expect.element(passwordInput).toHaveAttribute('type', 'password');
			await toggleButton.click();
			await expect.element(passwordInput).toHaveAttribute('type', 'text');
		});

		test('[SPEC: AC-002] パスワード表示切替ボタンを再度クリックすると type が text から password に戻る', async () => {
			render(Page);
			const passwordInput = page.getByLabelText('パスワード', { exact: true });

			await page.getByRole('button', { name: 'パスワードを表示する' }).click();
			await expect.element(passwordInput).toHaveAttribute('type', 'text');
			await page.getByRole('button', { name: 'パスワードを隠す' }).click();
			await expect.element(passwordInput).toHaveAttribute('type', 'password');
		});
	});

	describe('異常系', () => {
		test('[SPEC: AC-104] 認証に失敗した場合、「メールアドレスまたはパスワードが正しくありません」エラーが表示される', async () => {
			mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } });
			render(Page);

			await page.getByLabelText('メールアドレス').fill('test@example.com');
			await page.getByLabelText('パスワード', { exact: true }).fill('wrongpassword');
			await page.getByRole('button', { name: 'ログイン' }).click();

			await expect
				.element(page.getByTestId('login-auth-error'))
				.toHaveTextContent('メールアドレスまたはパスワードが正しくありません');
		});

		test('[SPEC: AC-104] 認証失敗後は / へ遷移しない', async () => {
			mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } });
			render(Page);

			await page.getByLabelText('メールアドレス').fill('test@example.com');
			await page.getByLabelText('パスワード', { exact: true }).fill('wrongpassword');
			await page.getByRole('button', { name: 'ログイン' }).click();

			await vi.waitFor(() => {
				expect(page.getByTestId('login-auth-error').element()).toBeTruthy();
			});
			expect(mockGoto).not.toHaveBeenCalled();
		});
	});
});
