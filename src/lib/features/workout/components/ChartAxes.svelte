<!--
  @file コンポーネント: ChartAxes
  @module src/lib/features/workout/components/ChartAxes.svelte
  @feature workout

  @description
  SVG グラフの Y軸グリッド線・ラベルと X軸ラベルを描画する共通パーツ。
  WorkoutChart（重量推移）と WeeklyVolumeChart（週間ボリューム）で共通利用する。
  呼び出し元の `<g transform="translate(...)">` の内側に配置して使う。

  @props
  - chartWidth: number - プロット領域の幅（Y軸グリッド線の長さ）
  - chartHeight: number - プロット領域の高さ（X軸ラベルの Y座標算出に使用）
  - yTicks: { value: number; y: number }[] - Y軸目盛り（値とY座標）
  - xLabels: { key: string; x: number; label: string }[] - X軸ラベル（キー・X座標・表示文字列）
  - labelClass: string - ラベルテキストの Tailwind クラス（省略時 'fill-secondary text-xs'）
-->
<script lang="ts">
	interface Props {
		chartWidth: number;
		chartHeight: number;
		yTicks: { value: number; y: number }[];
		xLabels: { key: string; x: number; label: string }[];
		labelClass?: string;
	}

	let {
		chartWidth,
		chartHeight,
		yTicks,
		xLabels,
		labelClass = 'fill-secondary text-xs'
	}: Props = $props();
</script>

<!-- Y軸グリッドとラベル -->
{#each yTicks as tick (tick.value)}
	<line
		x1="0"
		y1={tick.y}
		x2={chartWidth}
		y2={tick.y}
		stroke="var(--color-separator)"
		stroke-width="1"
	/>
	<text x="-6" y={tick.y + 4} text-anchor="end" class={labelClass} font-size="11">
		{tick.value}
	</text>
{/each}

<!-- X軸ラベル -->
{#each xLabels as label (label.key)}
	<text x={label.x} y={chartHeight + 20} text-anchor="middle" class={labelClass} font-size="11">
		{label.label}
	</text>
{/each}
