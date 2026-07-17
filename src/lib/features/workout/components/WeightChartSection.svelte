<!--
  @file コンポーネント: WeightChartSection
  @module src/lib/features/workout/components/WeightChartSection.svelte
  @feature workout

  @description
  種目別重量推移グラフカード。種目・期間（月間/年間）セレクトと WorkoutChart の表示を担う。
  データ取得（fetch）・期間状態の所有権は親（WorkoutPage.svelte）が持ち、
  このコンポーネントは bindable props と onToggleMode/onPeriodChange コールバックで連携する。

  @props
  - exerciseOptions: Snippet - 種目セレクトの中身（カテゴリ optgroup + その他）
  - exerciseId: string ($bindable) - 選択中の種目ID
  - mode: 'month' | 'year' - 期間モード
  - year: string ($bindable) - 選択中の年
  - month: string ($bindable) - 選択中の月
  - yearOptions: { value: string; label: string }[] - 年セレクトの選択肢
  - months: { value: string; label: string }[] - 月セレクトの選択肢
  - data: ChartData | null - チャートデータ
  - loading: boolean - 取得中フラグ
  - error: string - エラーメッセージ
  - onToggleMode: () => void - 年間/月間切り替え時のコールバック
  - onPeriodChange: () => void - 年・月セレクト変更時のコールバック
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Select from '$lib/components/Select.svelte';
	import Checkbox from '$lib/components/Checkbox.svelte';
	import WorkoutChart from './WorkoutChart.svelte';
	import type { ChartData } from '../types';

	let {
		exerciseOptions,
		exerciseId = $bindable(),
		mode,
		year = $bindable(),
		month = $bindable(),
		yearOptions,
		months,
		data,
		loading,
		error,
		onToggleMode,
		onPeriodChange
	}: {
		exerciseOptions: Snippet;
		exerciseId: string;
		mode: 'month' | 'year';
		year: string;
		month: string;
		yearOptions: { value: string; label: string }[];
		months: { value: string; label: string }[];
		data: ChartData | null;
		loading: boolean;
		error: string;
		onToggleMode: () => void;
		onPeriodChange: () => void;
	} = $props();
</script>

<div class="rounded-3xl bg-bg-card p-5 shadow-md">
	<h2 class="mb-3 text-sm font-medium text-secondary">重量推移グラフ</h2>
	<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
		<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
			<Select data-testid="workout-chart-exercise-select" bind:value={exerciseId} class="text-sm">
				{@render exerciseOptions()}
			</Select>
			<Select
				data-testid="workout-chart-year-select"
				bind:value={year}
				disabled={mode !== 'month'}
				onchange={onPeriodChange}
				class="text-sm {mode !== 'month' ? 'opacity-40' : ''}"
			>
				{#each yearOptions as opt (opt.value)}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</Select>
			<Select
				data-testid="workout-chart-month-select"
				bind:value={month}
				disabled={mode !== 'month'}
				onchange={onPeriodChange}
				class="text-sm {mode !== 'month' ? 'opacity-40' : ''}"
			>
				{#each months as m (m.value)}
					<option value={m.value}>{m.label}</option>
				{/each}
			</Select>
			<Checkbox
				data-testid="workout-chart-year-mode"
				checked={mode === 'year'}
				onchange={onToggleMode}
			>
				年間
			</Checkbox>
			{#if data}
				<div class="ml-auto flex flex-col items-end gap-1 text-xs text-label">
					<span class="flex items-center gap-1.5">
						{data.exercise.name}
						<svg width="20" height="10" class="shrink-0">
							<line x1="0" y1="5" x2="20" y2="5" stroke="var(--color-accent)" stroke-width="2" />
						</svg>
					</span>
					<span class="flex items-center gap-1.5">
						体重
						<svg width="20" height="10" class="shrink-0">
							<line
								x1="0"
								y1="5"
								x2="20"
								y2="5"
								stroke="var(--color-success)"
								stroke-width="2"
								stroke-dasharray="6 3"
							/>
						</svg>
					</span>
				</div>
			{/if}
		</div>
	</div>
	{#if error}
		<p role="alert" class="py-4 text-center text-sm text-destructive">{error}</p>
	{:else if data}
		<div class={loading ? 'opacity-40 transition-opacity duration-150' : ''}>
			<WorkoutChart exercisePoints={data.exercisePoints} bodyWeightPoints={data.bodyWeightPoints} />
		</div>
	{:else if loading}
		<p class="py-8 text-center text-sm text-secondary">読み込み中...</p>
	{/if}
</div>
