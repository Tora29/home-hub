/**
 * @file テスト: Dialog
 * @module src/lib/components/Dialog.svelte.test.ts
 * @testType unit
 *
 * @target ./Dialog.svelte
 * @spec specs/expenses/spec.md
 * @covers AC-021, AC-022, AC-023, AC-024, AC-025, AC-026
 *
 * @note
 * Dialog は children: Snippet を受け取るため TypeScript から直接インスタンス化できない。
 * Dialog を内部で使う ConfirmDialog（closeOnBackdrop=false 固定）と
 * ExpenseFormDialog（closeOnBackdrop=true デフォルト）を検証手段として使う。
 * - AC-021〜023, AC-025, AC-026: ConfirmDialog 経由
 * - AC-024（backdrop クリックで閉じる）: ExpenseFormDialog 経由
 */

import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ConfirmDialog from './ConfirmDialog.svelte';
import ExpenseFormDialog from '../../routes/expenses/components/ExpenseFormDialog.svelte';

const mockCategory = { id: 'cat-1', userId: 'u1', name: '食費', createdAt: new Date() };

const confirmProps = {
	title: 'テスト確認',
	description: 'テスト説明',
	onConfirm: vi.fn(),
	onCancel: vi.fn()
};

describe('Dialog', () => {
	test('[SPEC: AC-021] open=false のとき描画されない', async () => {
		render(ConfirmDialog, { ...confirmProps, open: false });

		await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
	});

	test('[SPEC: AC-022] open=true のとき children が描画される', async () => {
		render(ConfirmDialog, { ...confirmProps, open: true });

		await expect.element(page.getByRole('alertdialog')).toBeVisible();
	});

	test('[SPEC: AC-023] Escape キーで onClose が呼ばれる', async () => {
		const onCancel = vi.fn();
		render(ConfirmDialog, { ...confirmProps, open: true, onCancel });

		// キャンセルボタンから KeyboardEvent を dispatch してバブリングで Dialog に届ける
		const cancelBtn = page.getByRole('button', { name: 'キャンセル' }).element();
		cancelBtn.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
		);

		expect(onCancel).toHaveBeenCalledOnce();
	});

	test('[SPEC: AC-024] backdrop クリックで onClose が呼ばれる（closeOnBackdrop=true デフォルト）', async () => {
		// ExpenseFormDialog は Dialog を closeOnBackdrop=true（デフォルト）で使用する
		const onCancel = vi.fn();
		render(ExpenseFormDialog, {
			open: true,
			mode: 'create',
			categories: [mockCategory],
			onSuccess: vi.fn(),
			onCancel
		});

		const dialogEl = page.getByRole('dialog').element();
		dialogEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

		expect(onCancel).toHaveBeenCalledOnce();
	});

	test('[SPEC: AC-025] closeOnBackdrop=false のとき backdrop クリックで onClose が呼ばれない', async () => {
		// ConfirmDialog は closeOnBackdrop=false 固定
		const onCancel = vi.fn();
		render(ConfirmDialog, { ...confirmProps, open: true, onCancel });

		const dialogEl = page.getByRole('alertdialog').element();
		dialogEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

		expect(onCancel).not.toHaveBeenCalled();
	});

	test('[SPEC: AC-026] disabled=true のとき Escape キーで onClose が呼ばれない', async () => {
		// ConfirmDialog の loading=true が Dialog の disabled=true に対応する
		const onCancel = vi.fn();
		render(ConfirmDialog, { ...confirmProps, open: true, loading: true, onCancel });

		const cancelBtn = page.getByRole('button', { name: 'キャンセル' }).element();
		cancelBtn.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
		);

		expect(onCancel).not.toHaveBeenCalled();
	});
});
