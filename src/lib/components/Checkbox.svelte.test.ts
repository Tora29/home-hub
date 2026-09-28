/**
 * @file テスト: Checkbox
 * @module src/lib/components/Checkbox.svelte.test.ts
 * @testType unit
 *
 * @target ./Checkbox.svelte
 */
import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { createRawSnippet, flushSync } from 'svelte';
import Checkbox from './Checkbox.svelte';

const label = createRawSnippet(() => ({ render: () => '<span>確認済み</span>' }));

describe('Checkbox', () => {
	test('未チェックの場合、role="checkbox" で aria-checked=false として表示される', async () => {
		await render(Checkbox, { children: label });
		const checkbox = page.getByRole('checkbox', { name: '確認済み' });
		await expect.element(checkbox).toBeVisible();
		await expect.element(checkbox).not.toBeChecked();
	});

	test('checked の場合、aria-checked=true として表示される', async () => {
		await render(Checkbox, { children: label, checked: true });
		await expect.element(page.getByRole('checkbox', { name: '確認済み' })).toBeChecked();
	});

	test('クリックで onchange を呼び出し、checked の更新でチェック状態を切り替えられる', async () => {
		const onchange = vi.fn();
		const { rerender } = await render(Checkbox, { children: label, onchange });
		const checkbox = page.getByRole('checkbox', { name: '確認済み' });
		(checkbox.element() as HTMLElement).click();
		flushSync();
		expect(onchange).toHaveBeenCalledTimes(1);
		await rerender({ checked: true });
		await expect.element(checkbox).toBeChecked();
	});

	test('disabled の場合、クリックしても onchange が呼ばれない', async () => {
		const onchange = vi.fn();
		await render(Checkbox, { children: label, onchange, disabled: true });
		const checkbox = page.getByRole('checkbox', { name: '確認済み' });
		await expect.element(checkbox).toBeDisabled();
		(checkbox.element() as HTMLElement).click();
		flushSync();
		expect(onchange).not.toHaveBeenCalled();
	});

	test('aria-label と data-testid を checkbox に透過できる', async () => {
		await render(Checkbox, { 'aria-label': '支出を選択', 'data-testid': 'expense-check' });
		await expect
			.element(page.getByRole('checkbox', { name: '支出を選択' }))
			.toHaveAttribute('data-testid', 'expense-check');
	});
});
