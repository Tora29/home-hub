/**
 * @file テスト: レシピ一覧画面
 * @module src/routes/recipes/page.svelte.test.ts
 * @testType unit
 *
 * @target ./+page.svelte
 * @spec specs/recipes/spec.md
 * @covers AC-115
 */

import { describe, test, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import Page from './+page.svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost/') }
}));

const mockData = {
	items: [],
	total: 0,
	page: 1,
	limit: 20
};

describe('+page.svelte - AI 献立相談ウィジェット', () => {
	test('[SPEC: AC-115] AI 相談欄が空欄のまま送信ボタンをクリックすると「質問を入力してください」が表示される', async () => {
		render(Page, { data: mockData });

		// 入力欄を空のままボタンをクリック
		(page.getByRole('button', { name: '送信' }).element() as HTMLElement).click();
		flushSync();

		await expect.element(page.getByText('質問を入力してください')).toBeVisible();
	});
});
