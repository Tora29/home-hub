/**
 * @file テスト: Dialog
 * @module src/lib/components/Dialog.svelte.test.ts
 * @testType unit
 *
 * @target ./Dialog.svelte
 */
import { describe, test, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { createRawSnippet, flushSync } from 'svelte';
import Dialog from './Dialog.svelte';

const body = createRawSnippet(() => ({
	render: () =>
		'<div data-testid="card"><p>ダイアログ本文</p><button type="button">OK</button></div>'
}));

function makeProps(overrides: Record<string, unknown> = {}) {
	return {
		open: true,
		onClose: vi.fn(),
		'aria-label': '支出を登録',
		children: body,
		...overrides
	};
}

afterEach(() => {
	document.querySelectorAll('[data-test-trigger]').forEach((el) => el.remove());
});

/**
 * Escape キー押下を再現する（ブラウザは Escape でモーダル <dialog> に cancel イベントを発火する）。
 * userEvent.keyboard は CDP 経由でナビゲーション待機が入り全体実行時に不安定になるため使わない（testing.md）。
 * 実キーでの挙動は e2e/expenses.e2e.ts「キーボード・モーダル操作」で検証している。
 */
function pressEscape(): void {
	document.querySelector('dialog[open]')?.dispatchEvent(new Event('cancel', { cancelable: true }));
	flushSync();
}

describe('Dialog', () => {
	test('open=false の場合、ダイアログが描画されない', async () => {
		await render(Dialog, makeProps({ open: false }));
		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
		await expect.element(page.getByText('ダイアログ本文')).not.toBeInTheDocument();
	});

	test('open=true の場合、children と role・aria-label 付きでモーダル表示できる', async () => {
		await render(Dialog, makeProps());
		const dialog = page.getByRole('dialog', { name: '支出を登録' });
		await expect.element(dialog).toBeVisible();
		await expect.element(page.getByText('ダイアログ本文')).toBeVisible();
		expect((dialog.element() as HTMLDialogElement).open).toBe(true);
	});

	test('role="alertdialog" を指定した場合、alertdialog として表示できる', async () => {
		await render(Dialog, makeProps({ role: 'alertdialog', 'aria-label': '削除確認' }));
		await expect.element(page.getByRole('alertdialog', { name: '削除確認' })).toBeVisible();
	});

	test('Escape キーで onClose を呼び出せる', async () => {
		const onClose = vi.fn();
		await render(Dialog, makeProps({ onClose }));
		await expect.element(page.getByRole('dialog')).toBeVisible();
		pressEscape();
		await vi.waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		// open の所有者は親のため、Escape だけではダイアログは閉じない
		expect((page.getByRole('dialog').element() as HTMLDialogElement).open).toBe(true);
	});

	test('disabled の場合、Escape キーを押しても onClose が呼ばれない', async () => {
		const onClose = vi.fn();
		await render(Dialog, makeProps({ onClose, disabled: true }));
		await expect.element(page.getByRole('dialog')).toBeVisible();
		pressEscape();
		await new Promise((r) => setTimeout(r, 100));
		expect(onClose).not.toHaveBeenCalled();
	});

	test('backdrop（カード外）クリックで onClose を呼び出せる', async () => {
		const onClose = vi.fn();
		await render(Dialog, makeProps({ onClose }));
		page
			.getByRole('dialog')
			.element()
			.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		flushSync();
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	test('カード内クリックの場合、onClose が呼ばれない', async () => {
		const onClose = vi.fn();
		await render(Dialog, makeProps({ onClose }));
		(page.getByRole('button', { name: 'OK' }).element() as HTMLElement).click();
		flushSync();
		expect(onClose).not.toHaveBeenCalled();
	});

	test('closeOnBackdrop=false の場合、backdrop クリックで onClose が呼ばれない', async () => {
		const onClose = vi.fn();
		await render(Dialog, makeProps({ onClose, closeOnBackdrop: false }));
		page
			.getByRole('dialog')
			.element()
			.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		flushSync();
		expect(onClose).not.toHaveBeenCalled();
	});

	test('閉じたとき、開く前にフォーカスしていた要素へフォーカスを戻せる', async () => {
		const trigger = document.createElement('button');
		trigger.textContent = '開く';
		trigger.setAttribute('data-test-trigger', '');
		document.body.appendChild(trigger);
		trigger.focus();

		const { rerender } = await render(Dialog, makeProps({ open: false }));
		await rerender({ open: true });
		await expect.element(page.getByRole('dialog')).toBeVisible();
		// showModal() でダイアログ内へフォーカスが移る
		expect(document.activeElement).not.toBe(trigger);

		await rerender({ open: false });
		await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
		expect(document.activeElement).toBe(trigger);
	});
});
