<!--
  @file コンポーネント: WorkoutChart
  @module src/routes/workout/components/WorkoutChart.svelte
  @feature workout

  @description
  種目別重量推移と体重推移を重ね書きするSVGグラフコンポーネント。
  実線（accent色）が種目の日別最大重量、破線（success色）が体重を表す。

  @props
  - exercisePoints: ChartPoint[] - 種目の日別最大重量データ
  - bodyWeightPoints: BodyWeightPoint[] - 体重データ
  - exerciseName: string - 種目名（凡例表示用）
-->
<script lang="ts">
	type ChartPoint = { date: string; maxWeight: number };
	type BodyWeightPoint = { date: string; weight: number };

	let {
		exercisePoints = [],
		bodyWeightPoints = [],
		exerciseName: _exerciseName = ''
	}: {
		exercisePoints: ChartPoint[];
		bodyWeightPoints: BodyWeightPoint[];
		exerciseName: string;
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

	const yMin = $derived(() => {
		if (allValues.length === 0) return 0;
		const range = Math.max(...allValues) - Math.min(...allValues);
		const step = range <= 30 ? 5 : range <= 60 ? 10 : range <= 120 ? 20 : 25;
		return Math.floor(Math.min(...allValues) / step) * step;
	});

	const yMax = $derived(() => {
		if (allValues.length === 0) return 100;
		const range = Math.max(...allValues) - Math.min(...allValues);
		const step = range <= 30 ? 5 : range <= 60 ? 10 : range <= 120 ? 20 : 25;
		return Math.ceil(Math.max(...allValues) / step) * step;
	});

	const step = $derived(() => {
		const range = yMax() - yMin();
		return range <= 30 ? 5 : range <= 60 ? 10 : range <= 120 ? 20 : 25;
	});

	function toY(v: number): number {
		const mn = yMin();
		const mx = yMax();
		if (mx === mn) return chartHeight / 2;
		return chartHeight - ((v - mn) / (mx - mn)) * chartHeight;
	}

	const allDates = $derived(() => {
		const dates = new Set([
			...exercisePoints.map((p) => p.date),
			...bodyWeightPoints.map((p) => p.date)
		]);
		return Array.from(dates).sort();
	});

	function toX(date: string): number {
		const dates = allDates();
		if (dates.length <= 1) return chartWidth / 2;
		const idx = dates.indexOf(date);
		return (idx / (dates.length - 1)) * chartWidth;
	}

	const exercisePath = $derived(() => {
		if (exercisePoints.length === 0) return '';
		return exercisePoints
			.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.date)} ${toY(p.maxWeight)}`)
			.join(' ');
	});

	const bodyWeightPath = $derived(() => {
		if (bodyWeightPoints.length === 0) return '';
		return bodyWeightPoints
			.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.date)} ${toY(p.weight)}`)
			.join(' ');
	});

	const xLabels = $derived(() => {
		const dates = allDates();
		if (dates.length === 0) return [];
		const maxLabels = 6;
		const step = Math.max(1, Math.floor(dates.length / maxLabels));
		return dates
			.filter((_, i) => i % step === 0 || i === dates.length - 1)
			.map((d) => ({
				date: d,
				x: toX(d),
				label: d.slice(5) // MM-DD
			}));
	});

	const yTicks = $derived(() => {
		const mn = yMin();
		const mx = yMax();
		const s = step();
		const ticks = [];
		for (let v = mn; v <= mx; v += s) {
			ticks.push({ v, y: toY(v) });
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
			<!-- Y軸グリッドとラベル -->
			{#each yTicks() as tick (tick.v)}
				<line
					x1="0"
					y1={tick.y}
					x2={chartWidth}
					y2={tick.y}
					stroke="var(--color-separator)"
					stroke-width="1"
				/>
				<text x="-6" y={tick.y + 4} text-anchor="end" class="fill-secondary text-xs" font-size="11">
					{tick.v}
				</text>
			{/each}

			<!-- X軸ラベル -->
			{#each xLabels() as label (label.date)}
				<text
					x={label.x}
					y={chartHeight + 20}
					text-anchor="middle"
					class="fill-secondary text-xs"
					font-size="11"
				>
					{label.label}
				</text>
			{/each}

			<!-- 種目重量ライン（実線・accent色） -->
			{#if exercisePath()}
				<path
					d={exercisePath()}
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
			{#if bodyWeightPath()}
				<path
					d={bodyWeightPath()}
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
