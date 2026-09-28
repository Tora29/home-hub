/**
 * @file テスト: ChartAxes
 * @module src/lib/features/workout/components/ChartAxes.svelte.test.ts
 * @testType unit
 *
 * @target ./ChartAxes.svelte
 */
import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ChartAxesWrapper from './ChartAxes.test-wrapper.svelte';

const yTicks = [
	{ value: 0, y: 240 },
	{ value: 50, y: 120 },
	{ value: 100, y: 0 }
];
const xLabels = [
	{ key: '2026-09-01', x: 0, label: '09-01' },
	{ key: '2026-09-08', x: 260, label: '09-08' }
];

function root(): SVGSVGElement {
	return page.getByTestId('chart-axes-root').element() as unknown as SVGSVGElement;
}

describe('ChartAxes', () => {
	test('Y軸目盛りの数だけグリッド線と目盛りラベルを描画できる', async () => {
		await render(ChartAxesWrapper, { chartWidth: 520, chartHeight: 240, yTicks, xLabels: [] });
		await expect.element(page.getByTestId('chart-axes-root')).toBeInTheDocument();
		const svg = root();
		expect(svg.querySelectorAll('line')).toHaveLength(3);
		const labels = Array.from(svg.querySelectorAll('text')).map((t) => t.textContent?.trim());
		expect(labels).toEqual(['0', '50', '100']);
	});

	test('X軸ラベルの表示文字列を描画できる', async () => {
		await render(ChartAxesWrapper, { chartWidth: 520, chartHeight: 240, yTicks: [], xLabels });
		await expect.element(page.getByText('09-01')).toBeInTheDocument();
		await expect.element(page.getByText('09-08')).toBeInTheDocument();
		expect(root().querySelectorAll('line')).toHaveLength(0);
	});

	test('目盛り・ラベルを SVG 要素として描画できる（HTML 要素になると表示されないため）', async () => {
		await render(ChartAxesWrapper, { chartWidth: 520, chartHeight: 240, yTicks, xLabels });
		await expect.element(page.getByText('09-08')).toBeInTheDocument();
		const svg = root();
		for (const el of svg.querySelectorAll('line, text')) {
			expect(el).toBeInstanceOf(SVGElement);
		}
	});

	test('labelClass 未指定の場合、既定クラスがラベルに適用され、指定した場合は置き換えられる', async () => {
		const { rerender } = await render(ChartAxesWrapper, {
			chartWidth: 520,
			chartHeight: 240,
			yTicks,
			xLabels
		});
		await expect.element(page.getByText('09-01')).toHaveClass('fill-secondary', 'text-xs');

		await rerender({ labelClass: 'fill-label' });
		await expect.element(page.getByText('09-01')).toHaveClass('fill-label');
		await expect.element(page.getByText('09-01')).not.toHaveClass('text-xs');
	});
});
