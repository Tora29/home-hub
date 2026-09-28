/**
 * @file テスト: WeeklyVolumeChart
 * @module src/lib/features/workout/components/WeeklyVolumeChart.svelte.test.ts
 * @testType unit
 *
 * @target ./WeeklyVolumeChart.svelte
 */
import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { flushSync } from 'svelte';
import WeeklyVolumeChart from './WeeklyVolumeChart.svelte';
import type { WeeklyVolumePoint } from '../types';

const points: WeeklyVolumePoint[] = [
	{ weekStart: '2026-09-07', volume: 12345 },
	{ weekStart: '2026-09-14', volume: 800 },
	{ weekStart: '2026-09-21', volume: 4000 }
];

function svg(): SVGSVGElement {
	return page.getByTestId('workout-volume-svg').element() as unknown as SVGSVGElement;
}

function pressKey(el: Element, key: string): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
	el.dispatchEvent(event);
	flushSync();
	return event;
}

describe('WeeklyVolumeChart', () => {
	test('データが空の場合、「記録がありません」が表示されグラフは描画されない', async () => {
		await render(WeeklyVolumeChart, { points: [] });
		await expect.element(page.getByText('記録がありません')).toBeVisible();
		await expect.element(page.getByTestId('workout-volume-svg')).not.toBeInTheDocument();
	});

	test('週ごとのバーをデータ数ぶん描画し、X軸に週の開始日（MM-DD）を表示できる', async () => {
		await render(WeeklyVolumeChart, { points });
		await expect.element(page.getByTestId('workout-volume-svg')).toBeInTheDocument();
		expect(svg().querySelectorAll('rect')).toHaveLength(3);
		await expect.element(page.getByText('09-07')).toBeInTheDocument();
		await expect.element(page.getByText('09-14')).toBeInTheDocument();
		await expect.element(page.getByText('09-21')).toBeInTheDocument();
		await expect.element(page.getByText('記録がありません')).not.toBeInTheDocument();
	});

	test('週数が多い場合、X軸ラベルは間引かれ最終週のラベルは必ず表示される', async () => {
		const many = Array.from({ length: 12 }, (_, i) => ({
			weekStart: `2026-${String(Math.floor(i / 4) + 6).padStart(2, '0')}-${String((i % 4) * 7 + 1).padStart(2, '0')}`,
			volume: 1000 + i
		}));
		await render(WeeklyVolumeChart, { points: many });
		await expect.element(page.getByTestId('workout-volume-svg')).toBeInTheDocument();
		expect(svg().querySelectorAll('rect')).toHaveLength(12);
		const labels = Array.from(svg().querySelectorAll('text'))
			.map((t) => t.textContent?.trim() ?? '')
			.filter((t) => /^\d{2}-\d{2}$/.test(t));
		expect(labels.length).toBeLessThan(12);
		expect(labels).toContain(many[11].weekStart.slice(5));
		expect(labels).toContain(many[0].weekStart.slice(5));
	});

	test('onBarClick 未指定の場合、バーは操作対象（ボタン）にならない', async () => {
		await render(WeeklyVolumeChart, { points });
		await expect.element(page.getByTestId('workout-volume-svg')).toBeInTheDocument();
		expect(page.getByRole('button').elements()).toHaveLength(0);
		for (const rect of svg().querySelectorAll('rect')) {
			expect(rect.hasAttribute('tabindex')).toBe(false);
			expect(rect.hasAttribute('aria-label')).toBe(false);
		}
	});

	test('onBarClick 指定の場合、各バーが週とボリュームを読み上げるボタンになる', async () => {
		await render(WeeklyVolumeChart, { points, onBarClick: vi.fn() });
		await expect
			.element(
				page.getByRole('button', { name: '2026-09-07 の週 ボリューム 12,345（内訳を表示）' })
			)
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: '2026-09-14 の週 ボリューム 800（内訳を表示）' }))
			.toBeInTheDocument();
		expect(page.getByRole('button').elements()).toHaveLength(3);
		await expect
			.element(page.getByRole('button', { name: /2026-09-21 の週/ }))
			.toHaveAttribute('tabindex', '0');
	});

	test('バーをクリックした場合、その週の開始日で onBarClick を呼び出せる', async () => {
		const onBarClick = vi.fn();
		await render(WeeklyVolumeChart, { points, onBarClick });
		const bar = page.getByRole('button', { name: /2026-09-14 の週/ });
		await expect.element(bar).toBeInTheDocument();
		bar.element().dispatchEvent(new MouseEvent('click', { bubbles: true }));
		flushSync();
		expect(onBarClick).toHaveBeenCalledTimes(1);
		expect(onBarClick).toHaveBeenCalledWith('2026-09-14');
	});

	test('バーにフォーカスして Enter キーを押した場合、onBarClick を呼び出せる', async () => {
		const onBarClick = vi.fn();
		await render(WeeklyVolumeChart, { points, onBarClick });
		const bar = page.getByRole('button', { name: /2026-09-21 の週/ });
		await expect.element(bar).toBeInTheDocument();
		pressKey(bar.element(), 'Enter');
		expect(onBarClick).toHaveBeenCalledTimes(1);
		expect(onBarClick).toHaveBeenCalledWith('2026-09-21');
	});

	test('バーにフォーカスして Space キーを押した場合、onBarClick を呼び出しページスクロールを抑止できる', async () => {
		const onBarClick = vi.fn();
		await render(WeeklyVolumeChart, { points, onBarClick });
		const bar = page.getByRole('button', { name: /2026-09-07 の週/ });
		await expect.element(bar).toBeInTheDocument();
		const event = pressKey(bar.element(), ' ');
		expect(onBarClick).toHaveBeenCalledTimes(1);
		expect(onBarClick).toHaveBeenCalledWith('2026-09-07');
		expect(event.defaultPrevented).toBe(true);
	});

	test('Enter / Space 以外のキーの場合、onBarClick は呼ばれない', async () => {
		const onBarClick = vi.fn();
		await render(WeeklyVolumeChart, { points, onBarClick });
		const bar = page.getByRole('button', { name: /2026-09-07 の週/ });
		await expect.element(bar).toBeInTheDocument();
		const event = pressKey(bar.element(), 'a');
		pressKey(bar.element(), 'Tab');
		expect(onBarClick).not.toHaveBeenCalled();
		expect(event.defaultPrevented).toBe(false);
	});
});
