<!--
  @file コンポーネント: WeeklyVolumeChart
  @module src/lib/features/workout/components/WeeklyVolumeChart.svelte
  @feature workout

  @description
  週間ボリューム（重量×回数合計）を棒グラフで表示するSVGコンポーネント。

  @props
  - points: WeeklyVolumePoint[] - 週ごとのボリュームデータ
  - onBarClick: (weekStart: string) => void - バークリック時のコールバック（省略可）
-->
<script lang="ts">
	type WeeklyVolumePoint = { weekStart: string; volume: number };

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

	const yMax = $derived(() => {
		if (maxVolume === 0) return 1000;
		const step = maxVolume <= 1000 ? 200 : maxVolume <= 5000 ? 1000 : 2000;
		return Math.ceil(maxVolume / step) * step;
	});

	const yStep = $derived(() => {
		const mx = yMax();
		return mx <= 1000 ? 200 : mx <= 5000 ? 1000 : 2000;
	});

	function toY(v: number): number {
		const mx = yMax();
		return chartHeight - (v / mx) * chartHeight;
	}

	const barWidth = $derived(points.length > 0 ? Math.max(4, chartWidth / points.length - 4) : 0);

	function toX(i: number): number {
		if (points.length <= 1) return chartWidth / 2 - barWidth / 2;
		return (i / points.length) * chartWidth;
	}

	const xLabels = $derived(() => {
		if (points.length === 0) return [];
		const maxLabels = 6;
		const step = Math.max(1, Math.floor(points.length / maxLabels));
		return points
			.filter((_, i) => i % step === 0 || i === points.length - 1)
			.map((p, _i, _arr) => {
				const idx = points.indexOf(p);
				return { label: p.weekStart.slice(5), x: toX(idx) + barWidth / 2 };
			});
	});

	const yTicks = $derived(() => {
		const mx = yMax();
		const s = yStep();
		const ticks = [];
		for (let v = 0; v <= mx; v += s) {
			ticks.push({ v, y: toY(v) });
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
				<text x="-6" y={tick.y + 4} text-anchor="end" class="fill-secondary" font-size="11">
					{tick.v}
				</text>
			{/each}

			<!-- X軸ラベル -->
			{#each xLabels() as label (label.label)}
				<text
					x={label.x}
					y={chartHeight + 20}
					text-anchor="middle"
					class="fill-secondary"
					font-size="11"
				>
					{label.label}
				</text>
			{/each}

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
