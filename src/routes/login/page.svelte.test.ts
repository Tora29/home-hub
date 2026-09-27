/**
 * @file テスト: ログイン画面
 * @module src/routes/login/page.svelte.test.ts
 * @testType unit
 *
 * @target ./+page.svelte
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { flushSync } from 'svelte';
import LoginPage from './+page.svelte';

// vi.hoisted で宣言することでモックファクトリ内から参照できる
const mockKitPage = vi.hoisted(() => ({ url: new URL('http://localhost/login') }));
const mockSignInSocial = vi.hoisted(() => vi.fn());

vi.mock('$app/state', () => ({
	get page() {
		return mockKitPage;
	}
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

vi.mock('$lib/auth-client', () => ({
	authClient: {
		signIn: {
			social: mockSignInSocial
		}
	}
}));

beforeEach(() => {
	mockKitPage.url = new URL('http://localhost/login');
	mockSignInSocial.mockReset();
	mockSignInSocial.mockResolvedValue({
		data: { url: 'https://accounts.google.com/' },
		error: null
	});
});

describe('+page.svelte (login)', () => {
	test('Google でログインボタンが表示される', async () => {
		await render(LoginPage);
		await expect.element(page.getByRole('button', { name: 'Google でログイン' })).toBeVisible();
	});

	test('エラーパラメータがない場合、エラーメッセージが表示されない', async () => {
		await render(LoginPage);
		await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
	});

	test('OAuth 失敗で ?error パラメータ付きで戻った場合、「ログインに失敗しました」が表示される', async () => {
		mockKitPage.url = new URL('http://localhost/login?error=OAuthAccountNotLinked');
		await render(LoginPage);
		await expect
			.element(page.getByRole('alert'))
			.toHaveTextContent('ログインに失敗しました。もう一度お試しください。');
	});

	test('ログインボタンを押すと Google アカウントでのログインを開始し、成功後はホームへ戻る', async () => {
		await render(LoginPage);

		(page.getByRole('button', { name: 'Google でログイン' }).element() as HTMLElement).click();
		flushSync();

		expect(mockSignInSocial).toHaveBeenCalledWith({ provider: 'google', callbackURL: '/' });
	});

	test('ログイン開始に失敗した場合、「ログインを開始できませんでした」が表示され再試行できる', async () => {
		mockSignInSocial.mockResolvedValue({ data: null, error: { status: 500, message: 'error' } });
		await render(LoginPage);

		(page.getByRole('button', { name: 'Google でログイン' }).element() as HTMLElement).click();
		flushSync();

		await expect
			.element(page.getByRole('alert'))
			.toHaveTextContent('ログインを開始できませんでした。もう一度お試しください。');
		await expect.element(page.getByRole('button', { name: 'Google でログイン' })).toBeEnabled();
	});

	test('通信エラーの場合、「通信エラーが発生しました」が表示される', async () => {
		mockSignInSocial.mockRejectedValue(new TypeError('Failed to fetch'));
		await render(LoginPage);

		(page.getByRole('button', { name: 'Google でログイン' }).element() as HTMLElement).click();
		flushSync();

		await expect.element(page.getByRole('alert')).toHaveTextContent('通信エラーが発生しました');
	});
});
