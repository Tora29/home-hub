/**
 * @file テスト: Textarea コンポーネント
 * @module src/lib/components/Textarea.svelte.test.ts
 * @testType unit
 *
 * @target ./Textarea.svelte
 * @covers AC-001, AC-002, AC-003, AC-004, AC-005
 */
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { describe, it, expect } from 'vitest';
import Textarea from './Textarea.svelte';

describe('Textarea', () => {
	describe('size prop', () => {
		it('[SPEC: AC-001] size="sm" で py-1.5 text-xs が付与される', async () => {
			render(Textarea, { size: 'sm', 'data-testid': 'textarea' });
			const el = page.getByTestId('textarea');
			await expect.element(el).toHaveClass('py-1.5');
			await expect.element(el).toHaveClass('text-xs');
		});

		it('[SPEC: AC-002] size="md" で py-2 text-sm が付与される', async () => {
			render(Textarea, { size: 'md', 'data-testid': 'textarea' });
			const el = page.getByTestId('textarea');
			await expect.element(el).toHaveClass('py-2');
			await expect.element(el).toHaveClass('text-sm');
		});

		it('[SPEC: AC-003] size="lg" で py-3 px-4 が付与される', async () => {
			render(Textarea, { size: 'lg', 'data-testid': 'textarea' });
			const el = page.getByTestId('textarea');
			await expect.element(el).toHaveClass('py-3');
			await expect.element(el).toHaveClass('px-4');
		});
	});

	describe('resize-none', () => {
		it('[SPEC: AC-004] resize-none が常に付与される', async () => {
			render(Textarea, { 'data-testid': 'textarea' });
			const el = page.getByTestId('textarea');
			await expect.element(el).toHaveClass('resize-none');
		});
	});

	describe('value binding', () => {
		it('[SPEC: AC-004] bind:value で値が同期する', async () => {
			render(Textarea, { value: 'hello', 'data-testid': 'textarea' });
			const el = page.getByTestId('textarea');
			await expect.element(el).toHaveValue('hello');
		});
	});

	describe('class prop', () => {
		it('[SPEC: AC-005] class prop が追加される', async () => {
			render(Textarea, { class: 'flex-1', 'data-testid': 'textarea' });
			const el = page.getByTestId('textarea');
			await expect.element(el).toHaveClass('flex-1');
		});
	});
});
