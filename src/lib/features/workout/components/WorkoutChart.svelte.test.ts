/**
 * @file テスト: WorkoutChart
 * @module src/lib/features/workout/components/WorkoutChart.svelte.test.ts
 * @testType unit
 *
 * @target ./WorkoutChart.svelte
 */
import { describe, test, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import WorkoutChart from './WorkoutChart.svelte';
import type { BodyWeightPoint, ChartPoint } from '../types';

const exercisePoints: ChartPoint[] = [
	{ date: '2026-09-01', maxWeight: 60 },
	{ date: '2026-09-05', maxWeight: 62.5 },
	{ date: '2026-09-10', maxWeight: 65 }
];
const bodyWeightPoints: BodyWeightPoint[] = [
	{ date: '2026-09-01', weight: 70 },
	{ date: '2026-09-03', weight: 69.5 }
];

function svg(): SVGSVGElement {
	return page.getByTestId('workout-chart-svg').element() as unknown as SVGSVGElement;
}

/** 実線（種目）と破線（体重）の path を区別して返す */
function paths() {
	const all = Array.from(svg().querySelectorAll('path'));
	return {
		exercise: all.filter((p) => !p.hasAttribute('stroke-dasharray')),
		bodyWeight: all.filter((p) => p.hasAttribute('stroke-dasharray'))
	};
}

function xAxisLabels(): string[] {
	return Array.from(svg().querySelectorAll('text'))
		.map((t) => t.textContent?.trim() ?? '')
		.filter((t) => /^\d{2}-\d{2}$/.test(t));
}

describe('WorkoutChart', () => {
	test('種目・体重ともにデータが 0 件の場合、「記録がありません」が表示されグラフは描画されない', async () => {
		await render(WorkoutChart, { exercisePoints: [], bodyWeightPoints: [] });
		await expect.element(page.getByText('記録がありません')).toBeVisible();
		await expect.element(page.getByTestId('workout-chart-svg')).not.toBeInTheDocument();
	});

	test('種目と体重のデータがある場合、種目の実線・データ点と体重の破線を描画できる', async () => {
		await render(WorkoutChart, { exercisePoints, bodyWeightPoints });
		await expect.element(page.getByTestId('workout-chart-svg')).toBeInTheDocument();
		const { exercise, bodyWeight } = paths();
		expect(exercise).toHaveLength(1);
		expect(bodyWeight).toHaveLength(1);
		// データ点は種目の記録日ぶん（体重は線のみ）
		expect(svg().querySelectorAll('circle')).toHaveLength(3);
	});

	test('X軸には種目と体重の日付を合わせた日付（MM-DD）が昇順で表示される', async () => {
		await render(WorkoutChart, { exercisePoints, bodyWeightPoints });
		await expect.element(page.getByTestId('workout-chart-svg')).toBeInTheDocument();
		expect(xAxisLabels()).toEqual(['09-01', '09-03', '09-05', '09-10']);
	});

	test('種目データのみの場合、体重の破線は描画されない', async () => {
		await render(WorkoutChart, { exercisePoints, bodyWeightPoints: [] });
		await expect.element(page.getByTestId('workout-chart-svg')).toBeInTheDocument();
		const { exercise, bodyWeight } = paths();
		expect(exercise).toHaveLength(1);
		expect(bodyWeight).toHaveLength(0);
		expect(svg().querySelectorAll('circle')).toHaveLength(3);
	});

	test('体重データのみの場合、グラフを描画し種目の実線・データ点は描画されない', async () => {
		await render(WorkoutChart, { exercisePoints: [], bodyWeightPoints });
		await expect.element(page.getByTestId('workout-chart-svg')).toBeInTheDocument();
		await expect.element(page.getByText('記録がありません')).not.toBeInTheDocument();
		const { exercise, bodyWeight } = paths();
		expect(exercise).toHaveLength(0);
		expect(bodyWeight).toHaveLength(1);
		expect(svg().querySelectorAll('circle')).toHaveLength(0);
	});

	test('種目データが 1 件の場合、データ点 1 つと日付ラベル・重量の目盛りを描画できる', async () => {
		await render(WorkoutChart, {
			exercisePoints: [{ date: '2026-09-10', maxWeight: 60 }],
			bodyWeightPoints: []
		});
		await expect.element(page.getByTestId('workout-chart-svg')).toBeInTheDocument();
		expect(svg().querySelectorAll('circle')).toHaveLength(1);
		expect(xAxisLabels()).toEqual(['09-10']);
		await expect.element(page.getByText('60', { exact: true })).toBeInTheDocument();
	});

	test('Y軸の目盛りは記録の最小値〜最大値を含む範囲で表示される', async () => {
		await render(WorkoutChart, { exercisePoints, bodyWeightPoints });
		await expect.element(page.getByTestId('workout-chart-svg')).toBeInTheDocument();
		const ticks = Array.from(svg().querySelectorAll('text'))
			.map((t) => t.textContent?.trim() ?? '')
			.filter((t) => /^\d+(\.\d+)?$/.test(t))
			.map(Number);
		expect(Math.min(...ticks)).toBeLessThanOrEqual(60);
		expect(Math.max(...ticks)).toBeGreaterThanOrEqual(70);
	});
});
