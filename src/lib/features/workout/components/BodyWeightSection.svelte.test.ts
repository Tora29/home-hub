/**
 * @file テスト: BodyWeightSection
 * @module src/lib/features/workout/components/BodyWeightSection.svelte.test.ts
 * @testType unit
 *
 * @target ./BodyWeightSection.svelte
 */
import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { flushSync } from 'svelte';
import BodyWeightSectionWrapper from './BodyWeightSection.test-wrapper.svelte';

function click(locator: ReturnType<typeof page.getByRole>): void {
	(locator.element() as HTMLElement).click();
}

function changeValue(testId: string, value: string): void {
	const el = page.getByTestId(testId).element() as HTMLInputElement;
	el.value = value;
	el.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

describe('BodyWeightSection', () => {
	test('本日分が記録済みの場合、本日の体重を表示してフォームが無効化される', async () => {
		await render(BodyWeightSectionWrapper, { todayBodyWeight: 65.5 });

		await expect.element(page.getByTestId('workout-body-weight-input')).toHaveValue(65.5);
		await expect.element(page.getByTestId('workout-body-weight-input')).toBeDisabled();
		await expect.element(page.getByTestId('workout-body-weight-date')).toHaveValue('2026-09-27');
		await expect.element(page.getByTestId('workout-body-weight-date')).toBeDisabled();
		await expect.element(page.getByRole('button', { name: '記録済み' })).toBeDisabled();
	});

	test('本日分が未記録の場合、日付と体重を入力して記録できる', async () => {
		const onSubmit = vi.fn();
		await render(BodyWeightSectionWrapper, { onSubmit });

		await expect.element(page.getByTestId('workout-body-weight-input')).toBeEnabled();
		changeValue('workout-body-weight-date', '2026-09-26');
		changeValue('workout-body-weight-input', '64.2');
		click(page.getByRole('button', { name: '記録' }));
		flushSync();

		expect(onSubmit).toHaveBeenCalledWith({ date: '2026-09-26', input: '64.2' });
	});

	test('送信中の場合、記録ボタンが「記録中...」で無効化される', async () => {
		await render(BodyWeightSectionWrapper, { loading: true });

		await expect.element(page.getByRole('button', { name: '記録中...' })).toBeDisabled();
	});

	test('エラーがある場合、エラーメッセージが表示される', async () => {
		await render(BodyWeightSectionWrapper, { error: '体重は必須です' });

		await expect.element(page.getByRole('alert')).toHaveTextContent('体重は必須です');
	});

	test('本日分が記録済みの場合、エラーメッセージは表示されない', async () => {
		await render(BodyWeightSectionWrapper, { todayBodyWeight: 65, error: 'エラー' });

		await expect.element(page.getByRole('button', { name: '記録済み' })).toBeVisible();
		await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
	});
});
