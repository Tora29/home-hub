<!--
  @file コンポーネント: WeightChartSection テスト用ラッパー
  @module src/lib/features/workout/components/WeightChartSection.test-wrapper.svelte
  @feature workout

  @description
  WeightChartSection の bindable props（種目・年・月）を親側 state で保持し、
  各コールバック発火時点の親側の値を検証するためのテスト専用ラッパー。

  @props
  - mode: 'month' | 'year' - 期間モード
  - data: ChartData | null - チャートデータ
  - loading: boolean - 取得中フラグ
  - error: string - エラーメッセージ
  - onToggleMode: () => void - 年間/月間切り替え時のコールバック
  - onExerciseChange: (exerciseId: string) => void - 種目変更時点の親側の種目IDを受け取る
  - onPeriodChange: (period: { year: string; month: string }) => void - 期間変更時点の親側の年月を受け取る
-->
<script lang="ts">
	import WeightChartSection from './WeightChartSection.svelte';
	import type { ChartData } from '../types';

	let {
		mode = 'month',
		data = null,
		loading = false,
		error = '',
		onToggleMode = () => {},
		onExerciseChange = () => {},
		onPeriodChange = () => {}
	}: {
		mode?: 'month' | 'year';
		data?: ChartData | null;
		loading?: boolean;
		error?: string;
		onToggleMode?: () => void;
		onExerciseChange?: (exerciseId: string) => void;
		onPeriodChange?: (period: { year: string; month: string }) => void;
	} = $props();

	let exerciseId = $state('ex-1');
	let year = $state('2026');
	let month = $state('09');

	const yearOptions = [
		{ value: '2026', label: '2026年' },
		{ value: '2025', label: '2025年' }
	];
	const months = [
		{ value: '08', label: '8月' },
		{ value: '09', label: '9月' }
	];
</script>

{#snippet exerciseOptions()}
	<option value="ex-1">ベンチプレス</option>
	<option value="ex-2">スクワット</option>
{/snippet}

<WeightChartSection
	{exerciseOptions}
	bind:exerciseId
	{mode}
	bind:year
	bind:month
	{yearOptions}
	{months}
	{data}
	{loading}
	{error}
	{onToggleMode}
	onExerciseChange={() => onExerciseChange(exerciseId)}
	onPeriodChange={() => onPeriodChange({ year, month })}
/>
