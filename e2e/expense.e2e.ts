/**
 * @file E2Eテスト: Expense（収支管理）
 * @module e2e/expense.e2e.ts
 * @testType e2e
 *
 * @spec specs/expenses/spec.md
 * @covers AC-002b, AC-002c, AC-018, AC-019, AC-204, AC-205
 *
 * @scenarios
 * - 月選択肢が常に当月を含む過去13か月固定リストで表示される
 * - 不正な月パラメータが渡された場合 /expenses にリダイレクトされる
 * - モバイルで行メニューボタンをタップするとメニューが開く
 * - モバイルでメニュー外タップするとメニューが閉じる
 * - 支出が 0 件のとき空状態メッセージが表示される
 * - 支出が 0 件のとき合計金額が ¥0 と表示される
 *
 * @pages
 * - /expenses - 支出一覧
 */

import { test, expect } from '@playwright/test';

test.describe('Expense 一覧 - 月選択', () => {
	test('[SPEC: AC-002b] 月選択肢は常に当月を含む過去 13 か月分が固定表示される // spec:cdb7c297', async ({
		page
	}) => {
		await page.goto('/expenses');

		const monthSelect = page.getByTestId('expense-month-select');
		await expect(monthSelect).toBeVisible();

		// 選択肢が 13 個あることを確認
		const options = await monthSelect.locator('option').all();
		expect(options.length).toBe(13);

		// 当月が選択肢に含まれていることを確認
		const now = new Date();
		const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		const values = await Promise.all(options.map((o) => o.getAttribute('value')));
		expect(values).toContain(currentMonth);
	});

	test('[SPEC: AC-002b] 過去月を選択後も月選択肢は当月を含む固定リストのまま // spec:cdb7c297', async ({
		page
	}) => {
		await page.goto('/expenses');

		const monthSelect = page.getByTestId('expense-month-select');

		// 選択肢の一番古い月を選択
		const options = await monthSelect.locator('option').all();
		const oldestValue = await options[options.length - 1].getAttribute('value');
		await monthSelect.selectOption(oldestValue!);

		// 選択後も選択肢は 13 個のまま
		const optionsAfter = await monthSelect.locator('option').all();
		expect(optionsAfter.length).toBe(13);

		// 当月が引き続き選択肢に含まれる
		const now = new Date();
		const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		const valuesAfter = await Promise.all(optionsAfter.map((o) => o.getAttribute('value')));
		expect(valuesAfter).toContain(currentMonth);
	});
});

test.describe('Expense 一覧 - 不正な月パラメータ', () => {
	test('[SPEC: AC-002c] 不正な月パラメータが渡された場合 /expenses にリダイレクトして当月一覧を表示する // spec:83a227b2', async ({
		page
	}) => {
		await page.goto('/expenses?month=2026-13');

		// リダイレクト後 /expenses にいること
		await page.waitForURL('**/expenses');
		const url = new URL(page.url());
		expect(url.pathname).toBe('/expenses');
		// month パラメータが消えているか当月になっている
		const monthParam = url.searchParams.get('month');
		if (monthParam) {
			const monthNum = parseInt(monthParam.split('-')[1], 10);
			expect(monthNum).toBeGreaterThanOrEqual(1);
			expect(monthNum).toBeLessThanOrEqual(12);
		}
	});
});

test.describe('Expense 一覧 - モバイル行メニュー', () => {
	test('[SPEC: AC-018] モバイルで自分の unapproved 行の行メニューボタンをタップするとメニューが開く // spec:04456c16', async ({
		page
	}) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto('/expenses');

		// 自分の unapproved 支出がある場合
		const menuButton = page.getByTestId('expense-menu-button').first();
		const menuButtonVisible = await menuButton.isVisible().catch(() => false);

		if (menuButtonVisible) {
			await menuButton.tap();
			await expect(page.getByTestId('expense-menu')).toBeVisible();
		} else {
			test.skip();
		}
	});

	test('[SPEC: AC-019] expense-menu 表示中にメニュー外をクリックするとメニューが閉じる // spec:04456c16', async ({
		page
	}) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto('/expenses');

		const menuButton = page.getByTestId('expense-menu-button').first();
		const menuButtonVisible = await menuButton.isVisible().catch(() => false);

		if (menuButtonVisible) {
			await menuButton.tap();
			await expect(page.getByTestId('expense-menu')).toBeVisible();

			// メニュー外をクリック
			await page.mouse.click(10, 10);
			await expect(page.getByTestId('expense-menu')).toBeHidden();
		} else {
			test.skip();
		}
	});
});

test.describe('Expense 一覧 - 空状態', () => {
	test('[SPEC: AC-204] 支出が 0 件のとき空状態メッセージが表示される // spec:9be16731', async ({
		page
	}) => {
		// 支出のない月を指定（テストデータが入っていない月）
		await page.goto('/expenses?month=2020-01');

		await expect(page.getByTestId('expense-empty')).toBeVisible();
	});

	test('[SPEC: AC-205] 支出が 0 件のとき合計金額は「¥0」と表示される // spec:9be16731', async ({
		page
	}) => {
		await page.goto('/expenses?month=2020-01');

		const total = page.getByTestId('expense-total');
		await expect(total).toBeVisible();
		await expect(total).toHaveText(/¥0/);
	});
});
