/**
 * @file テスト: Header コンポーネント
 * @module src/lib/components/Header.svelte.test.ts
 * @testType unit
 *
 * @target ./Header.svelte
 * @spec specs/header/spec.md
 * @covers AC-001, AC-002, AC-003, AC-004, AC-201
 */
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Header from './Header.svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$lib/auth-client', () => ({
	authClient: {
		signOut: vi.fn().mockResolvedValue(undefined)
	}
}));

vi.mock('$lib/stores/sidebar', () => ({
	mobileOpen: { update: vi.fn(), subscribe: vi.fn(), set: vi.fn() }
}));

// モック済みモジュールを import して参照する
import { goto } from '$app/navigation';
import { authClient } from '$lib/auth-client';

describe('Header', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
		document.documentElement.classList.remove('dark');
	});

	afterEach(() => {
		document.documentElement.classList.remove('dark');
		localStorage.clear();
	});

	describe('ロゴ', () => {
		it('[SPEC: AC-001] ロゴのhrefが "/" である', async () => {
			render(Header);
			const logo = page.getByTestId('header-logo');
			await expect.element(logo).toHaveAttribute('href', '/');
		});

		it('[SPEC: AC-001] ロゴに aria-label="ホームへ戻る" が付与されている', async () => {
			render(Header);
			const logo = page.getByTestId('header-logo');
			await expect.element(logo).toHaveAttribute('aria-label', 'ホームへ戻る');
		});
	});

	describe('ダークモード切替', () => {
		it('[SPEC: AC-002] ライトモード時にボタンをクリックすると dark クラスが付与される', async () => {
			render(Header);
			const toggle = page.getByTestId('header-dark-toggle');
			await toggle.click();
			expect(document.documentElement.classList.contains('dark')).toBe(true);
		});

		it('[SPEC: AC-002] ダークモード時にボタンをクリックすると dark クラスが除去される', async () => {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
			render(Header);
			const toggle = page.getByTestId('header-dark-toggle');
			await toggle.click();
			expect(document.documentElement.classList.contains('dark')).toBe(false);
		});

		it('[SPEC: AC-002] ライトモード時のボタンの aria-label が "ダークモードに切り替える" である', async () => {
			render(Header);
			const toggle = page.getByTestId('header-dark-toggle');
			await expect.element(toggle).toHaveAttribute('aria-label', 'ダークモードに切り替える');
		});

		it('[SPEC: AC-002] ダークモード時のボタンの aria-label が "ライトモードに切り替える" である', async () => {
			localStorage.setItem('theme', 'dark');
			render(Header);
			const toggle = page.getByTestId('header-dark-toggle');
			await expect.element(toggle).toHaveAttribute('aria-label', 'ライトモードに切り替える');
		});

		it('[SPEC: AC-003] ダークモードに切り替えると localStorage に "dark" が保存される', async () => {
			render(Header);
			const toggle = page.getByTestId('header-dark-toggle');
			await toggle.click();
			expect(localStorage.getItem('theme')).toBe('dark');
		});

		it('[SPEC: AC-003] ライトモードに切り替えると localStorage に "light" が保存される', async () => {
			localStorage.setItem('theme', 'dark');
			document.documentElement.classList.add('dark');
			render(Header);
			const toggle = page.getByTestId('header-dark-toggle');
			await toggle.click();
			expect(localStorage.getItem('theme')).toBe('light');
		});

		it('[SPEC: AC-003] localStorage に "dark" が設定されている場合、ダークモードで初期化される', async () => {
			localStorage.setItem('theme', 'dark');
			render(Header);
			const toggle = page.getByTestId('header-dark-toggle');
			await expect.element(toggle).toHaveAttribute('aria-label', 'ライトモードに切り替える');
		});

		it('[SPEC: AC-003] localStorage に "light" が設定されている場合、ライトモードで初期化される', async () => {
			localStorage.setItem('theme', 'light');
			render(Header);
			const toggle = page.getByTestId('header-dark-toggle');
			await expect.element(toggle).toHaveAttribute('aria-label', 'ダークモードに切り替える');
		});

		it('[SPEC: AC-201] localStorage に theme が未設定かつ html に dark クラスがない場合、ライトモードになる', async () => {
			render(Header);
			const toggle = page.getByTestId('header-dark-toggle');
			await expect.element(toggle).toHaveAttribute('aria-label', 'ダークモードに切り替える');
		});

		it('[SPEC: AC-201] localStorage に theme が未設定かつ html に dark クラスがある場合、ダークモードになる', async () => {
			document.documentElement.classList.add('dark');
			render(Header);
			const toggle = page.getByTestId('header-dark-toggle');
			await expect.element(toggle).toHaveAttribute('aria-label', 'ライトモードに切り替える');
		});
	});

	describe('ログアウト', () => {
		it('[SPEC: AC-004] ログアウトボタンをクリックすると signOut が呼び出される', async () => {
			render(Header);
			const logoutButton = page.getByTestId('header-logout-button');
			await logoutButton.click();
			expect(authClient.signOut).toHaveBeenCalledTimes(1);
		});

		it('[SPEC: AC-004] ログアウトボタンをクリックすると /login へ遷移する', async () => {
			render(Header);
			const logoutButton = page.getByTestId('header-logout-button');
			await logoutButton.click();
			expect(goto).toHaveBeenCalledWith('/login');
		});

		it('[SPEC: AC-004] ログアウトボタンに aria-label="ログアウト" が付与されている', async () => {
			render(Header);
			const logoutButton = page.getByTestId('header-logout-button');
			await expect.element(logoutButton).toHaveAttribute('aria-label', 'ログアウト');
		});
	});
});
