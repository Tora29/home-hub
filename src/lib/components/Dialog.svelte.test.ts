/**
 * @file テスト: Dialog コンポーネント
 * @module src/lib/components/Dialog.svelte.test.ts
 * @testType unit
 *
 * @target ./Dialog.svelte
 * @spec specs/expenses/spec.md
 * @covers AC-021, AC-022, AC-023, AC-024, AC-025, AC-026
 */

import { describe, test, expect, vi, afterEach } from 'vitest';
import { flushSync, createRawSnippet } from 'svelte';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import Dialog from './Dialog.svelte';

afterEach(() => {
	vi.clearAllMocks();
});

const children = createRawSnippet(() => ({
	render: () => '<span data-testid="dialog-content">ダイアログの中身</span>'
}));

describe('Dialog', () => {
	test('[SPEC: AC-021] open=false のとき描画されない // spec:689036b7', async () => {
		render(Dialog, { open: false, onClose: vi.fn(), children });

		await expect.element(page.getByTestId('dialog-content')).not.toBeInTheDocument();
	});

	test('[SPEC: AC-022] open=true のとき children が描画される // spec:689036b7', async () => {
		render(Dialog, { open: true, onClose: vi.fn(), children });

		await expect.element(page.getByTestId('dialog-content')).toBeInTheDocument();
	});

	test('[SPEC: AC-023] Escape キーを押すと onClose が呼ばれる // spec:689036b7', async () => {
		const onClose = vi.fn();
		render(Dialog, { open: true, onClose, children });

		// onkeydown はバックドロップ div に設定されているため直接ディスパッチ
		const backdrop = page
			.getByTestId('dialog-content')
			.element()
			.closest('[aria-modal="true"]') as HTMLElement;
		backdrop?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		flushSync();

		expect(onClose).toHaveBeenCalled();
	});

	test('[SPEC: AC-024] backdrop をクリックすると onClose が呼ばれる（closeOnBackdrop=true デフォルト）// spec:689036b7', async () => {
		const onClose = vi.fn();
		render(Dialog, { open: true, onClose, closeOnBackdrop: true, children });

		// onclick は e.target === e.currentTarget のときのみ発火するため、バックドロップ div を直接クリック
		const backdrop = page
			.getByTestId('dialog-content')
			.element()
			.closest('[aria-modal="true"]') as HTMLElement;
		backdrop?.click();
		flushSync();

		expect(onClose).toHaveBeenCalled();
	});

	test('[SPEC: AC-025] closeOnBackdrop=false のとき backdrop クリックで onClose が呼ばれない // spec:689036b7', async () => {
		const onClose = vi.fn();
		render(Dialog, { open: true, onClose, closeOnBackdrop: false, children });

		const backdrop = page
			.getByTestId('dialog-content')
			.element()
			.closest('[aria-modal="true"]') as HTMLElement;
		backdrop?.click();
		flushSync();

		expect(onClose).not.toHaveBeenCalled();
	});

	test('[SPEC: AC-026] disabled=true のとき Escape キーで onClose が呼ばれない // spec:689036b7', async () => {
		const onClose = vi.fn();
		render(Dialog, { open: true, onClose, disabled: true, children });

		const backdrop = page
			.getByTestId('dialog-content')
			.element()
			.closest('[aria-modal="true"]') as HTMLElement;
		backdrop?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		flushSync();

		expect(onClose).not.toHaveBeenCalled();
	});
});
