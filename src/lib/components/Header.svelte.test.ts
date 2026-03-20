/**
 * @file テスト: Header
 * @module src/lib/components/Header.svelte.test.ts
 * @testType unit
 *
 * @target ./Header.svelte
 * @spec specs/header/spec.md
 * @covers AC-001, AC-002, AC-003, AC-004
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import Header from './Header.svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$lib/auth-client', () => ({
	authClient: {
		signOut: vi.fn().mockResolvedValue({})
	}
}));

describe('Header', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		document.documentElement.classList.remove('dark');
	});

	describe('ロゴ', () => {
		it('[SPEC: AC-001] ロゴリンクが / へのリンクになっている', async () => {
			render(Header);
			const logo = page.getByTestId('header-logo');
			await expect.element(logo).toBeInTheDocument();
			await expect.element(logo).toHaveAttribute('href', '/');
		});
	});

	describe('ダークモード切替', () => {
		it('[SPEC: AC-002] ライトモード時にボタンをクリックするとダークモードに切り替わる', async () => {
			render(Header);
			const toggle = page.getByTestId('header-dark-toggle');
			await toggle.click();
			expect(document.documentElement.classList.contains('dark')).toBe(true);
		});

		it('[SPEC: AC-002] ダークモード時にボタンをクリックするとライトモードに戻る', async () => {
			document.documentElement.classList.add('dark');
			render(Header);
			const toggle = page.getByTestId('header-dark-toggle');
			await toggle.click();
			expect(document.documentElement.classList.contains('dark')).toBe(false);
		});

		it('[SPEC: AC-003] ダークモードに切り替えると localStorage の theme が dark になる', async () => {
			render(Header);
			const toggle = page.getByTestId('header-dark-toggle');
			await toggle.click();
			expect(localStorage.getItem('theme')).toBe('dark');
		});

		it('[SPEC: AC-003] ライトモードに戻すと localStorage の theme が light になる', async () => {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
			render(Header);
			const toggle = page.getByTestId('header-dark-toggle');
			await toggle.click();
			expect(localStorage.getItem('theme')).toBe('light');
		});

		it('[SPEC: AC-003] localStorage の theme が dark のとき初期表示でダークモードになる', async () => {
			localStorage.setItem('theme', 'dark');
			render(Header);
			expect(document.documentElement.classList.contains('dark')).toBe(true);
		});

		it('[SPEC: AC-003] localStorage の theme が light のとき初期表示でライトモードになる', async () => {
			localStorage.setItem('theme', 'light');
			document.documentElement.classList.add('dark');
			render(Header);
			expect(document.documentElement.classList.contains('dark')).toBe(false);
		});
	});

	describe('ログアウト', () => {
		it('[SPEC: AC-004] ログアウトボタンをクリックすると signOut が呼ばれる', async () => {
			const { authClient } = await import('$lib/auth-client');
			render(Header);
			const logoutButton = page.getByTestId('header-logout-button');
			await logoutButton.click();
			expect(authClient.signOut).toHaveBeenCalledTimes(1);
		});

		it('[SPEC: AC-004] ログアウト完了後に /login へリダイレクトされる', async () => {
			const { goto } = await import('$app/navigation');
			render(Header);
			const logoutButton = page.getByTestId('header-logout-button');
			await logoutButton.click();
			await vi.waitFor(() => {
				expect(goto).toHaveBeenCalledWith('/login');
			});
		});
	});
});
