/**
 * @file テスト: レシピ一覧画面
 * @module src/routes/recipes/page.svelte.test.ts
 * @testType unit
 *
 * @target ./+page.svelte
 * @spec specs/recipes/spec.md
 * @covers AC-115
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import Page from './+page.svelte';

afterEach(() => {
	vi.unstubAllGlobals();
});

const mockData = {
	items: [],
	total: 0,
	page: 1,
	limit: 20
};

describe('+page.svelte - AI 献立相談ウィジェット', () => {
	it('[SPEC: AC-115] AI 相談欄が空欄のまま送信ボタンをクリックすると「質問を入力してください」が表示される', async () => {
		render(Page, { data: mockData });

		// 入力欄を空のままボタンをクリック
		await page.getByTestId('recipes-ask-button').click();

		await expect.element(page.getByText('質問を入力してください')).toBeVisible();
	});

	it('[SPEC: AC-115] エラー表示中にサーバー通信は発生しない', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		render(Page, { data: mockData });

		await page.getByTestId('recipes-ask-button').click();

		// fetch が呼ばれていないことを確認（フロント完結）
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
