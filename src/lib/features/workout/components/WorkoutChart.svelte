<!--
  @file コンポーネント: WorkoutChart
  @module src/lib/features/workout/components/WorkoutChart.svelte
  @feature workout

  @description
  種目別重量推移と体重推移を重ね書きするSVGグラフコンポーネント。
  実線（accent色）が種目の日別最大重量、破線（success色）が体重を表す。
  Y軸グリッド・X軸ラベルの描画は `ChartAxes.svelte` に委譲する。

  @props
  - exercisePoints: ChartPoint[] - 種目の日別最大重量データ
  - bodyWeightPoints: BodyWeightPoint[] - 体重データ
-->
<script lang="ts">
	import ChartAxes from './ChartAxes.svelte';
	import type { ChartPoint, BodyWeightPoint } from '../types';

	let {
		exercisePoints = [],
		bodyWeightPoints = []
	}: {
		exercisePoints: ChartPoint[];
		bodyWeightPoints: BodyWeightPoint[];
	} = $props();

	const WIDTH = 600;
	const HEIGHT = 300;
	const PADDING = { top: 20, right: 20, bottom: 40, left: 50 };
	const chartWidth = WIDTH - PADDING.left - PADDING.right;
	const chartHeight = HEIGHT - PADDING.top - PADDING.bottom;

	const allValues = $derived([
		...exercisePoints.map((p) => p.maxWeight),
		...bodyWeightPoints.map((p) => p.weight)
	]);

	const yMin = $derived.by(() => {
		if (allValues.length === 0) return 0;
		const range = Math.max(...allValues) - Math.min(...allValues);
		const step = range <= 30 ? 5 : range <= 60 ? 10 : range <= 120 ? 20 : 25;
		return Math.floor(Math.min(...allValues) / step) * step;
	});

	const yMax = $derived.by(() => {
		if (allValues.length === 0) return 100;
		const range = Math.max(...allValues) - Math.min(...allValues);
		const step = range <= 30 ? 5 : range <= 60 ? 10 : range <= 120 ? 20 : 25;
		return Math.ceil(Math.max(...allValues) / step) * step;
	});

	const step = $derived.by(() => {
		const range = yMax - yMin;
		return range <= 30 ? 5 : range <= 60 ? 10 : range <= 120 ? 20 : 25;
	});

	function toY(v: number): number {
		if (yMax === yMin) return chartHeight / 2;
		return chartHeight - ((v - yMin) / (yMax - yMin)) * chartHeight;
	}

	const allDates = $derived.by(() => {
		const dates = new Set([
			...exercisePoints.map((p) => p.date),
			...bodyWeightPoints.map((p) => p.date)
		]);
		return Array.from(dates).sort();
	});

	function toX(date: string): number {
		if (allDates.length <= 1) return chartWidth / 2;
		const idx = allDates.indexOf(date);
		return (idx / (allDates.length - 1)) * chartWidth;
	}

	const exercisePath = $derived.by(() => {
		if (exercisePoints.length === 0) return '';
		return exercisePoints
			.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.date)} ${toY(p.maxWeight)}`)
			.join(' ');
	});

	const bodyWeightPath = $derived.by(() => {
		if (bodyWeightPoints.length === 0) return '';
		return bodyWeightPoints
			.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.date)} ${toY(p.weight)}`)
			.join(' ');
	});

	const xLabels = $derived.by(() => {
		if (allDates.length === 0) return [];
		const maxLabels = 6;
		const labelStep = Math.max(1, Math.floor(allDates.length / maxLabels));
		return allDates
			.filter((_, i) => i % labelStep === 0 || i === allDates.length - 1)
			.map((d) => ({
				key: d,
				x: toX(d),
				label: d.slice(5) // MM-DD
			}));
	});

	const yTicks = $derived.by(() => {
		const ticks = [];
		for (let v = yMin; v <= yMax; v += step) {
			ticks.push({ value: v, y: toY(v) });
		}
		return ticks;
	});

	const hasData = $derived(exercisePoints.length > 0 || bodyWeightPoints.length > 0);
</script>

{#if !hasData}
	<p class="py-8 text-center text-sm text-secondary">記録がありません</p>
{:else}
	<svg
		data-testid="workout-chart-svg"
		viewBox="0 0 {WIDTH} {HEIGHT}"
		width="100%"
		height="auto"
		class="overflow-visible"
	>
		<g transform="translate({PADDING.left},{PADDING.top})">
			<ChartAxes {chartWidth} {chartHeight} {yTicks} {xLabels} />

			<!-- 種目重量ライン（実線・accent色） -->
			{#if exercisePath}
				<path
					d={exercisePath}
					fill="none"
					stroke="var(--color-accent)"
					stroke-width="2"
					stroke-linejoin="round"
					stroke-linecap="round"
				/>
				{#each exercisePoints as p (p.date)}
					<circle cx={toX(p.date)} cy={toY(p.maxWeight)} r="3" fill="var(--color-accent)" />
				{/each}
			{/if}

			<!-- 体重ライン（破線・success色） -->
			{#if bodyWeightPath}
				<path
					d={bodyWeightPath}
					fill="none"
					stroke="var(--color-success)"
					stroke-width="2"
					stroke-dasharray="6 3"
					stroke-linejoin="round"
					stroke-linecap="round"
				/>
			{/if}
		</g>
	</svg>
{/if}
