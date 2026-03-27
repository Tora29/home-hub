/**
 * @file テスト: Input コンポーネント
 * @module src/lib/components/Input.svelte.test.ts
 * @testType unit
 *
 * @target ./Input.svelte
 * @covers AC-001, AC-002, AC-003, AC-004, AC-005
 */
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { describe, it, expect } from 'vitest';
import Input from './Input.svelte';

describe('Input', () => {
	describe('size prop', () => {
		it('[SPEC: AC-001] size="sm" で py-1.5 text-xs が付与される', async () => {
			render(Input, { size: 'sm', 'data-testid': 'input' });
			const el = page.getByTestId('input');
			await expect.element(el).toHaveClass('py-1.5');
			await expect.element(el).toHaveClass('text-xs');
		});

		it('[SPEC: AC-002] size="md" で py-2 text-sm が付与される', async () => {
			render(Input, { size: 'md', 'data-testid': 'input' });
			const el = page.getByTestId('input');
			await expect.element(el).toHaveClass('py-2');
			await expect.element(el).toHaveClass('text-sm');
		});

		it('[SPEC: AC-003] size="lg" で py-3 px-4 が付与される', async () => {
			render(Input, { size: 'lg', 'data-testid': 'input' });
			const el = page.getByTestId('input');
			await expect.element(el).toHaveClass('py-3');
			await expect.element(el).toHaveClass('px-4');
		});
	});

	describe('value binding', () => {
		it('[SPEC: AC-004] bind:value で値が同期する', async () => {
			render(Input, { value: 'initial', 'data-testid': 'input' });
			const el = page.getByTestId('input');
			await expect.element(el).toHaveValue('initial');
		});
	});

	describe('class prop', () => {
		it('[SPEC: AC-005] class prop が追加される', async () => {
			render(Input, { class: 'w-full', 'data-testid': 'input' });
			const el = page.getByTestId('input');
			await expect.element(el).toHaveClass('w-full');
		});
	});
});
