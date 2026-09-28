/**
 * @file テスト: Input
 * @module src/lib/components/Input.svelte.test.ts
 * @testType unit
 *
 * @target ./Input.svelte
 */
import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { flushSync } from 'svelte';
import Input from './Input.svelte';
import FormField from './FormField.test-wrapper.svelte';

function typeInto(el: Element, value: string) {
	(el as HTMLInputElement).value = value;
	el.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

describe('Input', () => {
	test('入力した値を bind:value で親に反映できる', async () => {
		await render(FormField, { kind: 'input' });
		typeInto(page.getByRole('textbox', { name: '対象' }).element(), '牛乳');
		await expect.element(page.getByTestId('parent-value')).toHaveTextContent('牛乳');
	});

	test('親で値を変更すると入力欄に反映できる', async () => {
		await render(FormField, { kind: 'input', initial: '初期値', next: '更新後' });
		const input = page.getByRole('textbox', { name: '対象' });
		await expect.element(input).toHaveValue('初期値');
		(page.getByRole('button', { name: '親から更新' }).element() as HTMLElement).click();
		flushSync();
		await expect.element(input).toHaveValue('更新後');
	});

	test('placeholder・aria-label・data-testid を input に透過できる', async () => {
		await render(Input, {
			placeholder: '金額を入力',
			'aria-label': '金額',
			'data-testid': 'amount-input'
		});
		const input = page.getByRole('textbox', { name: '金額' });
		await expect.element(input).toHaveAttribute('placeholder', '金額を入力');
		await expect.element(input).toHaveAttribute('data-testid', 'amount-input');
	});

	test('disabled の場合、入力欄が無効になる', async () => {
		await render(Input, { 'aria-label': '金額', disabled: true });
		await expect.element(page.getByRole('textbox', { name: '金額' })).toBeDisabled();
	});
});
