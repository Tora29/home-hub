/**
 * @file テスト: ConfirmDialog
 * @module src/lib/components/ConfirmDialog.svelte.test.ts
 * @testType unit
 *
 * @target ./ConfirmDialog.svelte
 */
import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { flushSync } from 'svelte';
import ConfirmDialog from './ConfirmDialog.svelte';

function makeProps(overrides: Record<string, unknown> = {}) {
	return {
		open: true,
		title: '支出を削除',
		description: 'この操作は取り消せません。',
		onConfirm: vi.fn(),
		onCancel: vi.fn(),
		...overrides
	};
}

/**
 * Escape キー押下を再現する（ブラウザは Escape でモーダル <dialog> に cancel イベントを発火する）。
 * userEvent.keyboard は CDP 経由でナビゲーション待機が入り全体実行時に不安定になるため使わない（testing.md）。
 * 実キーでの挙動は e2e/expenses.e2e.ts「キーボード・モーダル操作」で検証している。
 */
function pressEscape(): void {
	document.querySelector('dialog[open]')?.dispatchEvent(new Event('cancel', { cancelable: true }));
	flushSync();
}

describe('ConfirmDialog', () => {
	test('open の場合、タイトル・説明文・既定ラベルのボタンを alertdialog として表示できる', async () => {
		await render(ConfirmDialog, makeProps());
		await expect.element(page.getByRole('alertdialog', { name: '支出を削除' })).toBeVisible();
		await expect.element(page.getByRole('heading', { name: '支出を削除' })).toBeVisible();
		await expect.element(page.getByText('この操作は取り消せません。')).toBeVisible();
		await expect.element(page.getByRole('button', { name: '確定' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: 'キャンセル' })).toBeVisible();
	});

	test('open=false の場合、ダイアログが描画されない', async () => {
		await render(ConfirmDialog, makeProps({ open: false }));
		await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
	});

	test('confirmLabel を指定した場合、確認ボタンのラベルを変更できる', async () => {
		await render(ConfirmDialog, makeProps({ confirmLabel: '削除する' }));
		await expect.element(page.getByRole('button', { name: '削除する' })).toBeVisible();
		await expect.element(page.getByRole('button', { name: '確定' })).not.toBeInTheDocument();
	});

	test('確認ボタンで onConfirm を呼び出せる', async () => {
		const props = makeProps();
		await render(ConfirmDialog, props);
		(page.getByRole('button', { name: '確定' }).element() as HTMLElement).click();
		flushSync();
		expect(props.onConfirm).toHaveBeenCalledTimes(1);
		expect(props.onCancel).not.toHaveBeenCalled();
	});

	test('キャンセルボタンで onCancel を呼び出せる', async () => {
		const props = makeProps();
		await render(ConfirmDialog, props);
		(page.getByRole('button', { name: 'キャンセル' }).element() as HTMLElement).click();
		flushSync();
		expect(props.onCancel).toHaveBeenCalledTimes(1);
		expect(props.onConfirm).not.toHaveBeenCalled();
	});

	test('Escape キーで onCancel を呼び出せる', async () => {
		const props = makeProps();
		await render(ConfirmDialog, props);
		await expect.element(page.getByRole('alertdialog')).toBeVisible();
		pressEscape();
		await vi.waitFor(() => expect(props.onCancel).toHaveBeenCalledTimes(1));
	});

	test('loading の場合、両ボタンが無効になりクリックしてもコールバックが呼ばれない', async () => {
		const props = makeProps({ loading: true });
		await render(ConfirmDialog, props);
		const confirm = page.getByRole('button', { name: '確定' });
		const cancel = page.getByRole('button', { name: 'キャンセル' });
		await expect.element(confirm).toBeDisabled();
		await expect.element(cancel).toBeDisabled();
		(confirm.element() as HTMLElement).click();
		(cancel.element() as HTMLElement).click();
		flushSync();
		expect(props.onConfirm).not.toHaveBeenCalled();
		expect(props.onCancel).not.toHaveBeenCalled();
	});

	test('loading の場合、Escape キーを押しても onCancel が呼ばれない', async () => {
		const props = makeProps({ loading: true });
		await render(ConfirmDialog, props);
		await expect.element(page.getByRole('alertdialog')).toBeVisible();
		pressEscape();
		await new Promise((r) => setTimeout(r, 100));
		expect(props.onCancel).not.toHaveBeenCalled();
	});

	test('error を指定した場合、role="alert" でエラーメッセージが表示される', async () => {
		await render(ConfirmDialog, makeProps({ error: '削除に失敗しました' }));
		await expect.element(page.getByRole('alert')).toHaveTextContent('削除に失敗しました');
	});

	test('error が空の場合、エラーメッセージが表示されない', async () => {
		await render(ConfirmDialog, makeProps());
		await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
	});

	test('confirmTestid / cancelTestid を指定した場合、各ボタンに data-testid が付く', async () => {
		await render(
			ConfirmDialog,
			makeProps({ confirmTestid: 'delete-confirm', cancelTestid: 'delete-cancel' })
		);
		await expect.element(page.getByTestId('delete-confirm')).toHaveAccessibleName('確定');
		await expect.element(page.getByTestId('delete-cancel')).toHaveAccessibleName('キャンセル');
	});
});
