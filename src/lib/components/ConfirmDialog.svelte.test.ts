/**
 * @file テスト: ConfirmDialog コンポーネント
 * @module src/lib/components/ConfirmDialog.svelte.test.ts
 * @testType unit
 *
 * @target ./ConfirmDialog.svelte
 * @spec specs/expenses/spec.md
 * @covers AC-027, AC-028, AC-029, AC-030, AC-031
 */

import { describe, test, expect, vi, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ConfirmDialog from './ConfirmDialog.svelte';

afterEach(() => {
	vi.clearAllMocks();
});

describe('ConfirmDialog', () => {
	test('[SPEC: AC-027] title と description が表示される // spec:3852ab60', async () => {
		render(ConfirmDialog, {
			open: true,
			title: '削除の確認',
			description: 'この支出を削除してもよいですか？',
			onConfirm: vi.fn(),
			onCancel: vi.fn()
		});

		await expect.element(page.getByText('削除の確認')).toBeVisible();
		await expect.element(page.getByText('この支出を削除してもよいですか？')).toBeVisible();
	});

	test('[SPEC: AC-028] キャンセルボタンを押すと onCancel が呼ばれる // spec:3852ab60', async () => {
		const onCancel = vi.fn();
		render(ConfirmDialog, {
			open: true,
			title: '削除の確認',
			description: '削除しますか？',
			onConfirm: vi.fn(),
			onCancel
		});

		(page.getByRole('button', { name: 'キャンセル' }).element() as HTMLElement).click();
		flushSync();

		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	test('[SPEC: AC-029] 確認ボタンを押すと onConfirm が呼ばれる // spec:3852ab60', async () => {
		const onConfirm = vi.fn();
		render(ConfirmDialog, {
			open: true,
			title: '削除の確認',
			description: '削除しますか？',
			onConfirm,
			onCancel: vi.fn()
		});

		(page.getByRole('button', { name: '確定' }).element() as HTMLElement).click();
		flushSync();

		expect(onConfirm).toHaveBeenCalledTimes(1);
	});

	test('[SPEC: AC-030] loading=true のとき両ボタンが disabled になる // spec:3852ab60', async () => {
		render(ConfirmDialog, {
			open: true,
			title: '処理中',
			description: 'お待ちください',
			onConfirm: vi.fn(),
			onCancel: vi.fn(),
			loading: true
		});

		const cancelBtn = page
			.getByRole('button', { name: 'キャンセル' })
			.element() as HTMLButtonElement;
		const confirmBtn = page.getByRole('button', { name: '確定' }).element() as HTMLButtonElement;

		expect(cancelBtn.disabled).toBe(true);
		expect(confirmBtn.disabled).toBe(true);
	});

	test('[SPEC: AC-031] error を渡すとエラーメッセージが表示される // spec:3852ab60', async () => {
		render(ConfirmDialog, {
			open: true,
			title: '削除の確認',
			description: '削除しますか？',
			onConfirm: vi.fn(),
			onCancel: vi.fn(),
			error: 'サーバーエラーが発生しました'
		});

		await expect.element(page.getByText('サーバーエラーが発生しました')).toBeVisible();
	});
});
