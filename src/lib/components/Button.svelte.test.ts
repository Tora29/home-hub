/**
 * @file テスト: Button
 * @module src/lib/components/Button.svelte.test.ts
 * @testType unit
 *
 * @target ./Button.svelte
 */
import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { createRawSnippet, flushSync } from 'svelte';
import Button from './Button.svelte';

function text(label: string) {
	return createRawSnippet(() => ({ render: () => `<span>${label}</span>` }));
}

describe('Button', () => {
	test('children に渡したラベルでボタンを表示できる', async () => {
		await render(Button, { children: text('保存') });
		await expect.element(page.getByRole('button', { name: '保存' })).toBeVisible();
	});

	test('type 未指定の場合、type="button" で描画される（意図しないフォーム送信を防ぐ）', async () => {
		await render(Button, { children: text('保存') });
		await expect
			.element(page.getByRole('button', { name: '保存' }))
			.toHaveAttribute('type', 'button');
	});

	test('type="submit" を指定した場合、送信ボタンとして描画できる', async () => {
		await render(Button, { children: text('送信'), type: 'submit' });
		await expect
			.element(page.getByRole('button', { name: '送信' }))
			.toHaveAttribute('type', 'submit');
	});

	test('クリックで onclick を呼び出せる', async () => {
		const onclick = vi.fn();
		await render(Button, { children: text('保存'), onclick });
		(page.getByRole('button', { name: '保存' }).element() as HTMLElement).click();
		flushSync();
		expect(onclick).toHaveBeenCalledTimes(1);
	});

	test('disabled の場合、クリックしても onclick が呼ばれない', async () => {
		const onclick = vi.fn();
		await render(Button, { children: text('保存'), onclick, disabled: true });
		const button = page.getByRole('button', { name: '保存' });
		await expect.element(button).toBeDisabled();
		(button.element() as HTMLElement).click();
		flushSync();
		expect(onclick).not.toHaveBeenCalled();
	});

	test('data-testid と aria-* 属性をボタンに透過できる', async () => {
		await render(Button, {
			children: text('×'),
			'data-testid': 'close-button',
			'aria-label': '閉じる',
			'aria-expanded': true
		});
		const button = page.getByTestId('close-button');
		await expect.element(button).toHaveAccessibleName('閉じる');
		await expect.element(button).toHaveAttribute('aria-expanded', 'true');
	});

	test.each([
		{ variant: 'ghost', size: 'icon' },
		{ variant: 'menu-item', size: 'menu' },
		{ variant: 'menu-item-destructive', size: 'menu' }
	] as const)(
		'variant=$variant / size=$size でボタンを描画しクリックできる',
		async ({ variant, size }) => {
			const onclick = vi.fn();
			await render(Button, { children: text('操作'), variant, size, onclick });
			const button = page.getByRole('button', { name: '操作' });
			await expect.element(button).toBeVisible();
			(button.element() as HTMLElement).click();
			flushSync();
			expect(onclick).toHaveBeenCalledTimes(1);
		}
	);
});
