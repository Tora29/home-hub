/**
 * @file テスト: グローバルレイアウト
 * @module src/routes/layout.svelte.test.ts
 * @testType unit
 *
 * @target ./+layout.svelte
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { createRawSnippet } from 'svelte';
import Layout from './+layout.svelte';

// vi.hoisted で宣言することでモックファクトリ内から参照できる
const mockKitPage = vi.hoisted(() => ({
	url: new URL('http://localhost/'),
	data: { userRole: 'main' as string | null }
}));

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
	authClient: { signOut: vi.fn() }
}));

// Service Worker 登録はテスト対象外
vi.mock('virtual:pwa-register', () => ({
	registerSW: vi.fn()
}));

const children = createRawSnippet(() => ({
	render: () => '<p data-testid="page-content">ページ本文</p>'
}));

beforeEach(() => {
	mockKitPage.url = new URL('http://localhost/');
	mockKitPage.data = { userRole: 'main' };
});

describe('+layout.svelte（グローバルレイアウト）', () => {
	test('ログイン後の画面では、ヘッダー・サイドバーを表示し、ページ本文をメイン領域に描画する', async () => {
		mockKitPage.url = new URL('http://localhost/expenses');
		await render(Layout, { children });

		await expect.element(page.getByRole('banner')).toBeVisible();
		await expect
			.element(page.getByRole('navigation', { name: 'メインナビゲーション' }))
			.toBeVisible();
		await expect
			.element(page.getByRole('main').getByTestId('page-content'))
			.toHaveTextContent('ページ本文');
	});

	test('ログイン画面では、ヘッダー・サイドバーを表示せずページ本文のみ描画する', async () => {
		mockKitPage.url = new URL('http://localhost/login');
		await render(Layout, { children });

		await expect.element(page.getByTestId('page-content')).toBeVisible();
		await expect.element(page.getByRole('banner')).not.toBeInTheDocument();
		await expect
			.element(page.getByRole('navigation', { name: 'メインナビゲーション' }))
			.not.toBeInTheDocument();
		await expect.element(page.getByRole('main')).not.toBeInTheDocument();
	});

	test('userRole が main の場合、サイドバーに筋トレ記録メニューが表示される', async () => {
		await render(Layout, { children });
		await expect.element(page.getByRole('link', { name: '家計簿' })).toBeVisible();
		await expect.element(page.getByRole('link', { name: '記録' })).toBeVisible();
	});

	test('userRole が partner の場合、サイドバーに筋トレ記録メニューが表示されない', async () => {
		mockKitPage.data = { userRole: 'partner' };
		await render(Layout, { children });
		await expect.element(page.getByRole('link', { name: '家計簿' })).toBeVisible();
		await expect.element(page.getByRole('link', { name: '記録' })).not.toBeInTheDocument();
	});
});
