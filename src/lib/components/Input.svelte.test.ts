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
import { describe, test, expect } from 'vitest';
import Input from './Input.svelte';

describe('Input', () => {
	describe('size prop', () => {
		test('[SPEC: AC-001] size="sm" で py-1.5 text-xs が付与される', async () => {
			render(Input, { size: 'sm' });
			const el = page.getByRole('textbox');
			await expect.element(el).toHaveClass('py-1.5');
			await expect.element(el).toHaveClass('text-xs');
		});

		test('[SPEC: AC-002] size="md" で py-2 text-sm が付与される', async () => {
			render(Input, { size: 'md' });
			const el = page.getByRole('textbox');
			await expect.element(el).toHaveClass('py-2');
			await expect.element(el).toHaveClass('text-sm');
		});

		test('[SPEC: AC-003] size="lg" で py-3 px-4 が付与される', async () => {
			render(Input, { size: 'lg' });
			const el = page.getByRole('textbox');
			await expect.element(el).toHaveClass('py-3');
			await expect.element(el).toHaveClass('px-4');
		});
	});

	describe('value binding', () => {
		test('[SPEC: AC-004] bind:value で値が同期する', async () => {
			render(Input, { value: 'initial' });
			const el = page.getByRole('textbox');
			await expect.element(el).toHaveValue('initial');
		});
	});

	describe('class prop', () => {
		test('[SPEC: AC-005] class prop が追加される', async () => {
			render(Input, { class: 'w-full' });
			const el = page.getByRole('textbox');
			await expect.element(el).toHaveClass('w-full');
		});
	});
});
