/**
 * @file テスト: ログイン画面
 * @module src/routes/login/page.svelte.test.ts
 * @testType unit
 *
 * @target ./+page.svelte
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import LoginPage from './+page.svelte';

// vi.hoisted で宣言することでモックファクトリ内から参照できる
const mockKitPage = vi.hoisted(() => ({ url: new URL('http://localhost/login') }));

vi.mock('$app/state', () => ({
	get page() {
		return mockKitPage;
	}
}));

vi.mock('$lib/auth-client', () => ({
	authClient: {
		signIn: {
			social: vi.fn().mockResolvedValue(undefined)
		}
	}
}));

beforeEach(() => {
	mockKitPage.url = new URL('http://localhost/login');
});

describe('+page.svelte (login)', () => {
	test('Google でログインボタンが表示される', async () => {
		render(LoginPage);
		await expect.element(page.getByTestId('login-google-button')).toBeVisible();
	});

	test('エラーパラメータがない場合、エラーメッセージが表示されない', async () => {
		render(LoginPage);
		await expect.element(page.getByTestId('login-auth-error')).not.toBeInTheDocument();
	});

	test('?error パラメータがある場合、エラーメッセージが表示される', async () => {
		mockKitPage.url = new URL('http://localhost/login?error=OAuthAccountNotLinked');
		render(LoginPage);
		await expect.element(page.getByTestId('login-auth-error')).toBeVisible();
		await expect
			.element(page.getByText('ログインに失敗しました。もう一度お試しください。'))
			.toBeVisible();
	});

	test('ログインボタンをクリックすると signIn.social が呼ばれる', async () => {
		render(LoginPage);
		const { authClient } = await import('$lib/auth-client');
		const signInSocial = vi.mocked(authClient.signIn.social);
		signInSocial.mockClear();

		await page.getByTestId('login-google-button').click();

		expect(signInSocial).toHaveBeenCalledWith({
			provider: 'google',
			callbackURL: '/'
		});
	});
});
