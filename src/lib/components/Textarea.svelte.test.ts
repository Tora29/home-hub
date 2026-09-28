/**
 * @file テスト: Textarea
 * @module src/lib/components/Textarea.svelte.test.ts
 * @testType unit
 *
 * @target ./Textarea.svelte
 */
import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { flushSync } from 'svelte';
import Textarea from './Textarea.svelte';
import FormField from './FormField.test-wrapper.svelte';

describe('Textarea', () => {
	test('入力した値を bind:value で親に反映できる', async () => {
		await render(FormField, { kind: 'textarea' });
		const el = page.getByRole('textbox', { name: '対象' }).element() as HTMLTextAreaElement;
		el.value = '1行目\n2行目';
		el.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();
		await expect.element(page.getByTestId('parent-value')).toHaveTextContent('1行目 2行目');
	});

	test('親で値を変更するとテキストエリアに反映できる', async () => {
		await render(FormField, { kind: 'textarea', initial: 'メモ', next: '新しいメモ' });
		const textarea = page.getByRole('textbox', { name: '対象' });
		await expect.element(textarea).toHaveValue('メモ');
		(page.getByRole('button', { name: '親から更新' }).element() as HTMLElement).click();
		flushSync();
		await expect.element(textarea).toHaveValue('新しいメモ');
	});

	test('placeholder・aria-label・data-testid・rows を textarea に透過できる', async () => {
		await render(Textarea, {
			placeholder: 'メモを入力',
			'aria-label': 'メモ',
			'data-testid': 'memo-input',
			rows: 5
		});
		const textarea = page.getByRole('textbox', { name: 'メモ' });
		await expect.element(textarea).toHaveAttribute('placeholder', 'メモを入力');
		await expect.element(textarea).toHaveAttribute('data-testid', 'memo-input');
		await expect.element(textarea).toHaveAttribute('rows', '5');
	});

	test('disabled の場合、テキストエリアが無効になる', async () => {
		await render(Textarea, { 'aria-label': 'メモ', disabled: true });
		await expect.element(page.getByRole('textbox', { name: 'メモ' })).toBeDisabled();
	});
});
