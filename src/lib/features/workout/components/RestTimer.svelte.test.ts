/**
 * @file テスト: RestTimer
 * @module src/lib/features/workout/components/RestTimer.svelte.test.ts
 * @testType unit
 *
 * @target ./RestTimer.svelte
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import { flushSync } from 'svelte';
import RestTimer from './RestTimer.svelte';

function click(locator: ReturnType<typeof page.getByRole>): void {
	(locator.element() as HTMLElement).click();
}

describe('RestTimer', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	test('初期表示はタイマーアイコンと90sが表示される', async () => {
		render(RestTimer);
		await expect.element(page.getByText('90s')).toBeVisible();
	});

	test('ボタンをタップすると残り秒数のカウントダウンが始まる', async () => {
		render(RestTimer);
		click(page.getByRole('button', { name: '90秒インターバルタイマー' }));
		flushSync();

		await vi.advanceTimersByTimeAsync(1000);
		await expect.element(page.getByText('89')).toBeVisible();
	});

	test('90秒経過すると一瞬通常表示以外に切り替わり、その後90s表示に自動で戻る', async () => {
		render(RestTimer);
		click(page.getByRole('button', { name: '90秒インターバルタイマー' }));
		flushSync();

		await vi.advanceTimersByTimeAsync(90_000);
		await expect.element(page.getByText('90s')).not.toBeInTheDocument();

		await vi.advanceTimersByTimeAsync(800);
		await expect.element(page.getByText('90s')).toBeVisible();
	});

	test('実行中に再タップすると90秒にリセットして再スタートする', async () => {
		render(RestTimer);
		const button = page.getByRole('button', { name: '90秒インターバルタイマー' });

		click(button);
		flushSync();
		await vi.advanceTimersByTimeAsync(30_000);
		await expect.element(page.getByText('60')).toBeVisible();

		click(button);
		flushSync();
		await vi.advanceTimersByTimeAsync(1000);
		await expect.element(page.getByText('89')).toBeVisible();
	});
});
