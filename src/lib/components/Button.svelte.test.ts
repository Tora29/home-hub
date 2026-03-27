/**
 * @file テスト: Button コンポーネント
 * @module src/lib/components/Button.svelte.test.ts
 * @testType unit
 *
 * @target ./Button.svelte
 * @covers AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009
 */
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { describe, it, expect } from 'vitest';
import { createRawSnippet } from 'svelte';
import Button from './Button.svelte';

function makeLabel(text: string) {
	return createRawSnippet(() => ({
		render: () => `<span>${text}</span>`,
		setup: () => {}
	}));
}

describe('Button', () => {
	describe('size prop', () => {
		it('[SPEC: AC-001] size="sm" で py-1.5 text-xs が付与される', async () => {
			render(Button, {
				size: 'sm',
				'data-testid': 'button',
				children: makeLabel('Click')
			});
			const el = page.getByTestId('button');
			await expect.element(el).toHaveClass('py-1.5');
			await expect.element(el).toHaveClass('text-xs');
		});

		it('[SPEC: AC-002] size="md" で py-2 text-sm が付与される', async () => {
			render(Button, {
				size: 'md',
				'data-testid': 'button',
				children: makeLabel('Click')
			});
			const el = page.getByTestId('button');
			await expect.element(el).toHaveClass('py-2');
			await expect.element(el).toHaveClass('text-sm');
		});

		it('[SPEC: AC-003] size="lg" で py-3 が付与される', async () => {
			render(Button, {
				size: 'lg',
				'data-testid': 'button',
				children: makeLabel('Click')
			});
			const el = page.getByTestId('button');
			await expect.element(el).toHaveClass('py-3');
		});
	});

	describe('variant prop', () => {
		it('[SPEC: AC-004] variant="primary" で bg-accent が付与される', async () => {
			render(Button, {
				variant: 'primary',
				'data-testid': 'button',
				children: makeLabel('Click')
			});
			const el = page.getByTestId('button');
			await expect.element(el).toHaveClass('bg-accent');
		});

		it('[SPEC: AC-005] variant="secondary" で border-separator が付与される', async () => {
			render(Button, {
				variant: 'secondary',
				'data-testid': 'button',
				children: makeLabel('Click')
			});
			const el = page.getByTestId('button');
			await expect.element(el).toHaveClass('border-separator');
		});

		it('[SPEC: AC-006] variant="destructive" で bg-destructive が付与される', async () => {
			render(Button, {
				variant: 'destructive',
				'data-testid': 'button',
				children: makeLabel('Click')
			});
			const el = page.getByTestId('button');
			await expect.element(el).toHaveClass('bg-destructive');
		});

		it('[SPEC: AC-007] variant="ghost-destructive" で bg-destructive/10 が付与される', async () => {
			render(Button, {
				variant: 'ghost-destructive',
				'data-testid': 'button',
				children: makeLabel('Click')
			});
			const el = page.getByTestId('button');
			await expect.element(el).toHaveClass('bg-destructive/10');
		});
	});

	describe('disabled prop', () => {
		it('[SPEC: AC-008] disabled 時に disabled 属性が付与される', async () => {
			render(Button, {
				disabled: true,
				'data-testid': 'button',
				children: makeLabel('Click')
			});
			const el = page.getByTestId('button');
			await expect.element(el).toBeDisabled();
		});
	});

	describe('children', () => {
		it('[SPEC: AC-009] children が描画される', async () => {
			render(Button, {
				'data-testid': 'button',
				children: makeLabel('ボタンテキスト')
			});
			const el = page.getByTestId('button');
			await expect.element(el).toHaveTextContent('ボタンテキスト');
		});
	});
});
