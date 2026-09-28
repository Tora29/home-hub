/**
 * @file テスト: Select
 * @module src/lib/components/Select.svelte.test.ts
 * @testType unit
 *
 * @target ./Select.svelte
 */
import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { createRawSnippet, flushSync } from 'svelte';
import Select from './Select.svelte';
import FormField from './FormField.test-wrapper.svelte';

const options = createRawSnippet(() => ({
	render: () =>
		'<optgroup label="種別"><option value="a">A</option><option value="b">B</option></optgroup>'
}));

function choose(el: Element, value: string) {
	(el as HTMLSelectElement).value = value;
	el.dispatchEvent(new Event('change', { bubbles: true }));
	flushSync();
}

describe('Select', () => {
	test('children の選択肢を表示し、初期値が選択される', async () => {
		await render(FormField, { kind: 'select', initial: 'daily' });
		const select = page.getByRole('combobox', { name: '対象' });
		await expect.element(select).toHaveValue('daily');
		expect(
			page
				.getByRole('option')
				.elements()
				.map((o) => o.textContent)
		).toEqual(['食費', '日用品', '家賃']);
	});

	test('選択を変更すると bind:value で親に反映できる', async () => {
		await render(FormField, { kind: 'select', initial: 'food' });
		choose(page.getByRole('combobox', { name: '対象' }).element(), 'rent');
		await expect.element(page.getByTestId('parent-value')).toHaveTextContent('rent');
	});

	test('親で値を変更すると選択状態に反映できる', async () => {
		await render(FormField, { kind: 'select', initial: 'food', next: 'rent' });
		(page.getByRole('button', { name: '親から更新' }).element() as HTMLElement).click();
		flushSync();
		await expect.element(page.getByRole('combobox', { name: '対象' })).toHaveValue('rent');
	});

	test('onchange・aria-label・data-testid を select に透過できる', async () => {
		const onchange = vi.fn();
		await render(Select, {
			children: options,
			onchange,
			'aria-label': '種別',
			'data-testid': 'kind-select'
		});
		const select = page.getByRole('combobox', { name: '種別' });
		await expect.element(select).toHaveAttribute('data-testid', 'kind-select');
		choose(select.element(), 'b');
		expect(onchange).toHaveBeenCalledTimes(1);
	});

	test('disabled の場合、セレクトが無効になる', async () => {
		await render(Select, { children: options, 'aria-label': '種別', disabled: true });
		await expect.element(page.getByRole('combobox', { name: '種別' })).toBeDisabled();
	});
});
