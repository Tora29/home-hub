<!--
  @file コンポーネント: WeeklyVolumeChart
  @module src/lib/features/workout/components/WeeklyVolumeChart.svelte
  @feature workout

  @description
  週間ボリューム（重量×回数合計）を棒グラフで表示するSVGコンポーネント。
  Y軸グリッド・X軸ラベルの描画は `ChartAxes.svelte` に委譲する。

  @props
  - points: WeeklyVolumePoint[] - 週ごとのボリュームデータ
  - onBarClick: (weekStart: string) => void - バークリック時のコールバック（省略可）
-->
<script lang="ts">
	import ChartAxes from './ChartAxes.svelte';
	import type { WeeklyVolumePoint } from '../types';

	let {
		points = [],
		onBarClick
	}: { points: WeeklyVolumePoint[]; onBarClick?: (weekStart: string) => void } = $props();

	const WIDTH = 600;
	const HEIGHT = 300;
	const PADDING = { top: 20, right: 20, bottom: 40, left: 60 };
	const chartWidth = WIDTH - PADDING.left - PADDING.right;
	const chartHeight = HEIGHT - PADDING.top - PADDING.bottom;

	const maxVolume = $derived(points.length > 0 ? Math.max(...points.map((p) => p.volume)) : 0);

	const yMax = $derived.by(() => {
		if (maxVolume === 0) return 1000;
		const step = maxVolume <= 1000 ? 200 : maxVolume <= 5000 ? 1000 : 2000;
		return Math.ceil(maxVolume / step) * step;
	});

	const yStep = $derived.by(() => {
		return yMax <= 1000 ? 200 : yMax <= 5000 ? 1000 : 2000;
	});

	function toY(v: number): number {
		return chartHeight - (v / yMax) * chartHeight;
	}

	const barWidth = $derived(points.length > 0 ? Math.max(4, chartWidth / points.length - 4) : 0);

	function toX(i: number): number {
		if (points.length <= 1) return chartWidth / 2 - barWidth / 2;
		return (i / points.length) * chartWidth;
	}

	const xLabels = $derived.by(() => {
		if (points.length === 0) return [];
		const maxLabels = 6;
		const labelStep = Math.max(1, Math.floor(points.length / maxLabels));
		return points
			.map((p, i) => ({ key: p.weekStart, x: toX(i) + barWidth / 2, label: p.weekStart.slice(5) }))
			.filter((_, i) => i % labelStep === 0 || i === points.length - 1);
	});

	const yTicks = $derived.by(() => {
		const ticks = [];
		for (let v = 0; v <= yMax; v += yStep) {
			ticks.push({ value: v, y: toY(v) });
		}
		return ticks;
	});
</script>

{#if points.length === 0}
	<p class="py-8 text-center text-sm text-secondary">記録がありません</p>
{:else}
	<svg
		data-testid="workout-volume-svg"
		viewBox="0 0 {WIDTH} {HEIGHT}"
		width="100%"
		height="auto"
		class="overflow-visible"
	>
		<g transform="translate({PADDING.left},{PADDING.top})">
			<ChartAxes {chartWidth} {chartHeight} {yTicks} {xLabels} labelClass="fill-secondary" />

			<!-- 棒グラフ -->
			{#each points as p, i (p.weekStart)}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<!-- role="button" のとき tabindex={0} はフォーカス管理に必要な正しいパターン -->
				<rect
					x={toX(i)}
					y={toY(p.volume)}
					width={barWidth}
					height={chartHeight - toY(p.volume)}
					fill="var(--color-accent)"
					opacity="0.8"
					rx="2"
					role={onBarClick ? 'button' : undefined}
					tabindex={onBarClick ? 0 : undefined}
					style={onBarClick ? 'cursor: pointer' : undefined}
					onclick={() => onBarClick?.(p.weekStart)}
					onkeydown={(e) => e.key === 'Enter' && onBarClick?.(p.weekStart)}
				/>
			{/each}
		</g>
	</svg>
{/if}
