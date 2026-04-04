/**
 * @file テスト: Select コンポーネント
 * @module src/lib/components/Select.svelte.test.ts
 * @testType unit
 *
 * @target ./Select.svelte
 * @covers AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007
 */
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { describe, test, expect, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import Select from './Select.svelte';

function makeOption(value: string, label: string) {
	return createRawSnippet(() => ({
		render: () => `<option value="${value}">${label}</option>`,
		setup: () => {}
	}));
}

describe('Select', () => {
	describe('size prop', () => {
		test('[SPEC: AC-001] size="sm" で py-1.5 text-xs が付与される', async () => {
			render(Select, {
				size: 'sm',
				children: makeOption('a', 'A')
			});
			const el = page.getByRole('combobox');
			await expect.element(el).toHaveClass('py-1.5');
			await expect.element(el).toHaveClass('text-xs');
		});

		test('[SPEC: AC-002] size="md" で py-2 text-sm が付与される', async () => {
			render(Select, {
				size: 'md',
				children: makeOption('a', 'A')
			});
			const el = page.getByRole('combobox');
			await expect.element(el).toHaveClass('py-2');
			await expect.element(el).toHaveClass('text-sm');
		});

		test('[SPEC: AC-003] size="lg" で py-3 が付与される', async () => {
			render(Select, {
				size: 'lg',
				children: makeOption('a', 'A')
			});
			const el = page.getByRole('combobox');
			await expect.element(el).toHaveClass('py-3');
		});
	});

	describe('children', () => {
		test('[SPEC: AC-004] children の option が描画される', async () => {
			const { container } = render(Select, {
				children: makeOption('foo', 'Foo')
			});
			const options = container.querySelectorAll('option');
			expect(options.length).toBeGreaterThan(0);
			expect(options[0].value).toBe('foo');
		});
	});

	describe('value binding', () => {
		test('[SPEC: AC-005] bind:value で値が同期する', async () => {
			render(Select, {
				value: 'bar',
				children: makeOption('bar', 'Bar')
			});
			const el = page.getByRole('combobox');
			await expect.element(el).toHaveValue('bar');
		});
	});

	describe('onchange', () => {
		test('[SPEC: AC-006] onchange が呼ばれる', async () => {
			const onchange = vi.fn();
			const { container } = render(Select, {
				onchange,
				children: makeOption('a', 'A')
			});
			const select = container.querySelector('select')!;
			select.dispatchEvent(new Event('change', { bubbles: true }));
			expect(onchange).toHaveBeenCalled();
		});
	});

	describe('ChevronDown icon', () => {
		test('[SPEC: AC-007] ChevronDown が描画される', async () => {
			const { container } = render(Select, {
				children: makeOption('a', 'A')
			});
			const svg = container.querySelector('svg');
			expect(svg).not.toBeNull();
		});
	});
});
