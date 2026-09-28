<!--
  @file コンポーネント: ChartAxes テスト用ラッパー
  @module src/lib/features/workout/components/ChartAxes.test-wrapper.svelte
  @feature workout

  @description
  ChartAxes は `<svg><g>` の内側に置く前提のため、テスト用に SVG ルートで包んで描画するラッパー。

  @props
  - chartWidth: number - プロット領域の幅
  - chartHeight: number - プロット領域の高さ
  - yTicks: { value: number; y: number }[] - Y軸目盛り
  - xLabels: { key: string; x: number; label: string }[] - X軸ラベル
  - labelClass: string - ラベルテキストのクラス（省略可）
-->
<script lang="ts">
	import ChartAxes from './ChartAxes.svelte';

	let {
		chartWidth,
		chartHeight,
		yTicks,
		xLabels,
		labelClass
	}: {
		chartWidth: number;
		chartHeight: number;
		yTicks: { value: number; y: number }[];
		xLabels: { key: string; x: number; label: string }[];
		labelClass?: string;
	} = $props();
</script>

<svg data-testid="chart-axes-root" viewBox="0 0 600 300">
	<g>
		<ChartAxes {chartWidth} {chartHeight} {yTicks} {xLabels} {labelClass} />
	</g>
</svg>
