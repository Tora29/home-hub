/**
 * @file テスト: Header
 * @module src/lib/components/Header.svelte.test.ts
 * @testType unit
 *
 * @target ./Header.svelte
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { flushSync } from 'svelte';
import { goto } from '$app/navigation';
import { sidebarState } from '$lib/stores/sidebar.svelte';
import Header from './Header.svelte';

const mockSignOut = vi.hoisted(() => vi.fn());

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

vi.mock('$lib/auth-client', () => ({
	authClient: { signOut: mockSignOut }
}));

beforeEach(() => {
	mockSignOut.mockReset();
	mockSignOut.mockResolvedValue({ data: { success: true }, error: null });
	vi.mocked(goto).mockReset();
	sidebarState.mobileOpen = false;
	document.documentElement.classList.remove('dark');
	localStorage.removeItem('theme');
});

afterEach(() => {
	sidebarState.mobileOpen = false;
	document.documentElement.classList.remove('dark');
	localStorage.removeItem('theme');
});

describe('Header', () => {
	test('ホームへのロゴリンクを表示できる', async () => {
		await render(Header);
		await expect
			.element(page.getByRole('link', { name: 'ホームへ戻る' }))
			.toHaveAttribute('href', '/');
	});

	test('ハンバーガーボタンでモバイルサイドバーを開閉できる', async () => {
		await render(Header);
		const hamburger = page.getByRole('button', { name: 'メニューを開く' });
		(hamburger.element() as HTMLElement).click();
		flushSync();
		expect(sidebarState.mobileOpen).toBe(true);
		(hamburger.element() as HTMLElement).click();
		flushSync();
		expect(sidebarState.mobileOpen).toBe(false);
	});

	test('ライトモードでテーマ切り替えボタンを押すとダークモードに切り替えられる', async () => {
		await render(Header);
		(
			page.getByRole('button', { name: 'ダークモードに切り替える' }).element() as HTMLElement
		).click();
		flushSync();
		expect(document.documentElement.classList.contains('dark')).toBe(true);
		expect(localStorage.getItem('theme')).toBe('dark');
		await expect
			.element(page.getByRole('button', { name: 'ライトモードに切り替える' }))
			.toBeVisible();
	});

	test('ダークモードで表示した場合、テーマ切り替えボタンでライトモードに戻せる', async () => {
		document.documentElement.classList.add('dark');
		await render(Header);
		(
			page.getByRole('button', { name: 'ライトモードに切り替える' }).element() as HTMLElement
		).click();
		flushSync();
		expect(document.documentElement.classList.contains('dark')).toBe(false);
		expect(localStorage.getItem('theme')).toBe('light');
		await expect
			.element(page.getByRole('button', { name: 'ダークモードに切り替える' }))
			.toBeVisible();
	});

	test('ログアウトボタンでサインアウトしてログイン画面へ遷移できる', async () => {
		await render(Header);
		(page.getByRole('button', { name: 'ログアウト' }).element() as HTMLElement).click();
		await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/login'));
		expect(mockSignOut).toHaveBeenCalledTimes(1);
	});

	test('サインアウトがエラーを返した場合、エラーメッセージが表示されログイン画面へ遷移しない', async () => {
		mockSignOut.mockResolvedValue({ data: null, error: { message: 'failed' } });
		await render(Header);
		(page.getByRole('button', { name: 'ログアウト' }).element() as HTMLElement).click();
		await expect.element(page.getByRole('alert')).toHaveTextContent('ログアウトに失敗しました');
		expect(goto).not.toHaveBeenCalled();
	});

	test('通信エラーの場合、通信エラーのメッセージが表示されログイン画面へ遷移しない', async () => {
		mockSignOut.mockRejectedValue(new TypeError('Failed to fetch'));
		await render(Header);
		(page.getByRole('button', { name: 'ログアウト' }).element() as HTMLElement).click();
		await expect.element(page.getByRole('alert')).toHaveTextContent('通信エラーが発生しました');
		expect(goto).not.toHaveBeenCalled();
	});
});
