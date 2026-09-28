/**
 * @file テスト: Sidebar
 * @module src/lib/components/Sidebar.svelte.test.ts
 * @testType unit
 *
 * @target ./Sidebar.svelte
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { flushSync } from 'svelte';
import { sidebarState } from '$lib/stores/sidebar.svelte';
import Sidebar from './Sidebar.svelte';

const mockKitPage = vi.hoisted(() => ({
	url: new URL('http://localhost/'),
	data: { userRole: null as string | null }
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

// サイドバー内リンクのクリックで実際に遷移しないようにする（Sidebar 自身の onclick は先に実行される）
function preventNavigation(e: MouseEvent) {
	if ((e.target as HTMLElement).closest('a')) e.preventDefault();
}

let main: HTMLElement;

beforeEach(async () => {
	await page.viewport(1280, 800);
	mockKitPage.url = new URL('http://localhost/');
	mockKitPage.data = { userRole: null };
	sidebarState.mobileOpen = false;
	localStorage.removeItem('sidebar-open');
	main = document.createElement('main');
	document.body.appendChild(main);
	document.addEventListener('click', preventNavigation);
});

afterEach(async () => {
	document.removeEventListener('click', preventNavigation);
	main.remove();
	sidebarState.mobileOpen = false;
	localStorage.removeItem('sidebar-open');
	document.documentElement.removeAttribute('data-sidebar-open');
	await page.viewport(1280, 800);
});

describe('Sidebar', () => {
	test('生活カテゴリと家計簿リンクを表示できる', async () => {
		await render(Sidebar);
		await expect
			.element(page.getByRole('navigation', { name: 'メインナビゲーション' }))
			.toBeVisible();
		await expect.element(page.getByRole('button', { name: '生活' })).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: '家計簿' }))
			.toHaveAttribute('href', '/expenses');
	});

	test('userRole が main の場合、筋トレ系メニューを表示できる', async () => {
		mockKitPage.data = { userRole: 'main' };
		await render(Sidebar);
		await expect.element(page.getByRole('button', { name: '筋トレ系' })).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: '記録' }))
			.toHaveAttribute('href', '/workout');
	});

	test.each([{ role: 'partner' }, { role: null }])(
		'userRole が $role の場合、筋トレ系メニューが表示されない',
		async ({ role }) => {
			mockKitPage.data = { userRole: role };
			await render(Sidebar);
			await expect.element(page.getByRole('button', { name: '生活' })).toBeVisible();
			await expect.element(page.getByTestId('sidebar-category-workout')).not.toBeInTheDocument();
			await expect.element(page.getByTestId('sidebar-item-workout')).not.toBeInTheDocument();
		}
	);

	test('現在のパスに一致するリンクに aria-current="page" が付く', async () => {
		mockKitPage.url = new URL('http://localhost/expenses');
		mockKitPage.data = { userRole: 'main' };
		await render(Sidebar);
		await expect
			.element(page.getByRole('link', { name: '家計簿' }))
			.toHaveAttribute('aria-current', 'page');
		await expect
			.element(page.getByRole('link', { name: '記録' }))
			.not.toHaveAttribute('aria-current');
	});

	test('カテゴリボタンでメニューの展開状態を切り替えられる', async () => {
		await render(Sidebar);
		const category = page.getByRole('button', { name: '生活' });
		await expect.element(category).toHaveAttribute('aria-expanded', 'true');
		(category.element() as HTMLElement).click();
		flushSync();
		await expect.element(category).toHaveAttribute('aria-expanded', 'false');
		(category.element() as HTMLElement).click();
		flushSync();
		await expect.element(category).toHaveAttribute('aria-expanded', 'true');
	});

	test('デスクトップでトグルボタンによりサイドバーを閉じ、状態を保存できる', async () => {
		await render(Sidebar);
		const nav = page.getByTestId('sidebar');
		await expect.element(nav).not.toHaveAttribute('inert');
		(page.getByRole('button', { name: 'サイドバーを閉じる' }).element() as HTMLElement).click();
		flushSync();
		await expect.element(page.getByRole('button', { name: 'サイドバーを開く' })).toBeVisible();
		await expect.element(nav).toHaveAttribute('inert');
		expect(localStorage.getItem('sidebar-open')).toBe('false');
		expect(document.documentElement.getAttribute('data-sidebar-open')).toBe('false');
	});

	test('デスクトップで閉じた状態が保存されている場合、閉じた状態で表示される', async () => {
		localStorage.setItem('sidebar-open', 'false');
		await render(Sidebar);
		await expect.element(page.getByRole('button', { name: 'サイドバーを開く' })).toBeVisible();
		await expect.element(page.getByTestId('sidebar')).toHaveAttribute('inert');
	});

	test('モバイルの初期表示ではサイドバーが閉じている', async () => {
		await page.viewport(375, 812);
		await render(Sidebar);
		await expect.element(page.getByTestId('sidebar')).toHaveAttribute('inert');
		expect(main.hasAttribute('inert')).toBe(false);
	});

	test('モバイルで開いた場合、サイドバーが操作可能になり背後の main が inert になる', async () => {
		await page.viewport(375, 812);
		await render(Sidebar);
		sidebarState.mobileOpen = true;
		flushSync();
		await expect.element(page.getByTestId('sidebar')).not.toHaveAttribute('inert');
		expect(main.hasAttribute('inert')).toBe(true);
	});

	test('モバイルでオーバーレイをタップするとサイドバーを閉じられる', async () => {
		await page.viewport(375, 812);
		await render(Sidebar);
		sidebarState.mobileOpen = true;
		flushSync();
		page
			.getByTestId('sidebar-overlay')
			.element()
			.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		flushSync();
		expect(sidebarState.mobileOpen).toBe(false);
		expect(main.hasAttribute('inert')).toBe(false);
		await expect.element(page.getByTestId('sidebar')).toHaveAttribute('inert');
	});

	test('モバイルでメニュー項目をタップするとサイドバーを閉じられる', async () => {
		await page.viewport(375, 812);
		await render(Sidebar);
		sidebarState.mobileOpen = true;
		flushSync();
		(page.getByRole('link', { name: '家計簿' }).element() as HTMLElement).click();
		flushSync();
		expect(sidebarState.mobileOpen).toBe(false);
	});

	test('デスクトップでメニュー項目をクリックした場合、モバイル開閉状態は変わらない', async () => {
		await render(Sidebar);
		sidebarState.mobileOpen = true;
		flushSync();
		(page.getByRole('link', { name: '家計簿' }).element() as HTMLElement).click();
		flushSync();
		expect(sidebarState.mobileOpen).toBe(true);
	});
});
