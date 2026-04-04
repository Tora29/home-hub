/**
 * @file テスト: ConfirmDialog
 * @module src/lib/components/ConfirmDialog.svelte.test.ts
 * @testType unit
 *
 * @target ./ConfirmDialog.svelte
 * @spec specs/expenses/spec.md
 * @covers AC-027, AC-028, AC-029, AC-030, AC-031
 */

import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ConfirmDialog from './ConfirmDialog.svelte';

const defaultProps = {
	open: true,
	title: 'テストタイトル',
	description: 'テスト説明文',
	onConfirm: vi.fn(),
	onCancel: vi.fn()
};

describe('ConfirmDialog', () => {
	test('[SPEC: AC-027] title と description が表示される', async () => {
		render(ConfirmDialog, defaultProps);

		await expect.element(page.getByRole('heading', { name: 'テストタイトル' })).toBeVisible();
		await expect.element(page.getByText('テスト説明文')).toBeVisible();
	});

	test('[SPEC: AC-028] キャンセルボタンを押すと onCancel が呼ばれる', async () => {
		const onCancel = vi.fn();
		render(ConfirmDialog, { ...defaultProps, onCancel });

		(page.getByRole('button', { name: 'キャンセル' }).element() as HTMLElement).click();

		expect(onCancel).toHaveBeenCalledOnce();
	});

	test('[SPEC: AC-029] 確認ボタンを押すと onConfirm が呼ばれる', async () => {
		const onConfirm = vi.fn();
		render(ConfirmDialog, { ...defaultProps, onConfirm, confirmLabel: '削除する' });

		(page.getByRole('button', { name: '削除する' }).element() as HTMLElement).click();

		expect(onConfirm).toHaveBeenCalledOnce();
	});

	test('[SPEC: AC-030] loading=true のときキャンセルボタンが disabled になる', async () => {
		render(ConfirmDialog, { ...defaultProps, loading: true });

		await expect.element(page.getByRole('button', { name: 'キャンセル' })).toBeDisabled();
	});

	test('[SPEC: AC-030] loading=true のとき確認ボタンが disabled になる', async () => {
		render(ConfirmDialog, { ...defaultProps, loading: true, confirmLabel: '確定する' });

		await expect.element(page.getByRole('button', { name: '確定する' })).toBeDisabled();
	});

	test('[SPEC: AC-031] error を渡すとエラーメッセージが表示される', async () => {
		render(ConfirmDialog, { ...defaultProps, error: '削除に失敗しました' });

		await expect.element(page.getByText('削除に失敗しました')).toBeVisible();
	});

	test('[SPEC: AC-031] error が空のときエラーメッセージは表示されない', async () => {
		render(ConfirmDialog, { ...defaultProps });

		await expect.element(page.getByText('削除に失敗しました')).not.toBeInTheDocument();
	});
});
