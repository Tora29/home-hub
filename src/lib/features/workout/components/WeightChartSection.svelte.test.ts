/**
 * @file テスト: WeightChartSection
 * @module src/lib/features/workout/components/WeightChartSection.svelte.test.ts
 * @testType unit
 *
 * @target ./WeightChartSection.svelte
 */
import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { flushSync } from 'svelte';
import WeightChartSectionWrapper from './WeightChartSection.test-wrapper.svelte';
import type { ChartData } from '../types';

const chartData: ChartData = {
	exercise: { id: 'ex-1', name: 'ベンチプレス' },
	exercisePoints: [
		{ date: '2026-09-20', maxWeight: 60 },
		{ date: '2026-09-27', maxWeight: 62.5 }
	],
	bodyWeightPoints: [{ date: '2026-09-27', weight: 65 }]
};

function click(locator: ReturnType<typeof page.getByRole>): void {
	(locator.element() as HTMLElement).click();
}

function selectValue(testId: string, value: string): void {
	const el = page.getByTestId(testId).element() as HTMLSelectElement;
	el.value = value;
	el.dispatchEvent(new Event('change', { bubbles: true }));
	flushSync();
}

describe('WeightChartSection', () => {
	test('種目を選択すると、選択後の種目IDが親に反映された状態で onExerciseChange が呼ばれる', async () => {
		const onExerciseChange = vi.fn();
		await render(WeightChartSectionWrapper, { onExerciseChange });

		selectValue('workout-chart-exercise-select', 'ex-2');

		expect(onExerciseChange).toHaveBeenCalledWith('ex-2');
	});

	test('年・月を選択すると、選択後の年月が親に反映された状態で onPeriodChange が呼ばれる', async () => {
		const onPeriodChange = vi.fn();
		await render(WeightChartSectionWrapper, { onPeriodChange });

		selectValue('workout-chart-month-select', '08');
		expect(onPeriodChange).toHaveBeenLastCalledWith({ year: '2026', month: '08' });

		selectValue('workout-chart-year-select', '2025');
		expect(onPeriodChange).toHaveBeenLastCalledWith({ year: '2025', month: '08' });
	});

	test('年間にチェックすると onToggleMode が呼ばれる', async () => {
		const onToggleMode = vi.fn();
		await render(WeightChartSectionWrapper, { onToggleMode });

		await expect.element(page.getByRole('checkbox', { name: '年間' })).not.toBeChecked();
		click(page.getByRole('checkbox', { name: '年間' }));
		flushSync();

		expect(onToggleMode).toHaveBeenCalledTimes(1);
	});

	test('年間モードの場合、年・月セレクトが無効化される', async () => {
		await render(WeightChartSectionWrapper, { mode: 'year' });

		await expect.element(page.getByRole('checkbox', { name: '年間' })).toBeChecked();
		await expect.element(page.getByTestId('workout-chart-year-select')).toBeDisabled();
		await expect.element(page.getByTestId('workout-chart-month-select')).toBeDisabled();
		await expect.element(page.getByTestId('workout-chart-exercise-select')).toBeEnabled();
	});

	test('月間モードの場合、年・月セレクトを操作できる', async () => {
		await render(WeightChartSectionWrapper, { mode: 'month' });

		await expect.element(page.getByTestId('workout-chart-year-select')).toBeEnabled();
		await expect.element(page.getByTestId('workout-chart-month-select')).toBeEnabled();
	});

	test('データがある場合、グラフと種目名・体重の凡例が表示される', async () => {
		await render(WeightChartSectionWrapper, { data: chartData });

		await expect.element(page.getByTestId('workout-chart-svg')).toBeVisible();
		await expect.element(page.getByText('体重', { exact: true })).toBeVisible();
		await expect.element(page.getByText('ベンチプレス', { exact: true }).last()).toBeVisible();
	});

	test('データ未取得で取得中の場合、読み込み中が表示される', async () => {
		await render(WeightChartSectionWrapper, { data: null, loading: true });

		await expect.element(page.getByText('読み込み中...')).toBeVisible();
		await expect.element(page.getByTestId('workout-chart-svg')).not.toBeInTheDocument();
	});

	test('データ取得済みで再取得中の場合、読み込み中表示に替えずグラフを表示し続ける', async () => {
		await render(WeightChartSectionWrapper, { data: chartData, loading: true });

		await expect.element(page.getByTestId('workout-chart-svg')).toBeVisible();
		await expect.element(page.getByText('読み込み中...')).not.toBeInTheDocument();
	});

	test('エラーがある場合、エラーメッセージが表示されグラフは表示されない', async () => {
		await render(WeightChartSectionWrapper, {
			data: chartData,
			error: 'グラフデータの取得に失敗しました'
		});

		await expect
			.element(page.getByRole('alert'))
			.toHaveTextContent('グラフデータの取得に失敗しました');
		await expect.element(page.getByTestId('workout-chart-svg')).not.toBeInTheDocument();
	});
});
