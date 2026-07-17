<!--
  @file コンポーネント: VolumeChartSection
  @module src/lib/features/workout/components/VolumeChartSection.svelte
  @feature workout

  @description
  週間ボリューム（重量×回数合計）グラフカード。期間（月間/年間）セレクトと
  WeeklyVolumeChart の表示、バークリック時の種目別内訳ダイアログ表示を担う。
  期間状態・ボリュームデータ取得の所有権は親（WorkoutPage.svelte）が持ち、
  内訳ダイアログの取得状態はバークリックに閉じたローカル関心のためこのコンポーネントが保持する。

  @props
  - mode: 'month' | 'year' - 期間モード
  - year: string ($bindable) - 選択中の年
  - month: string ($bindable) - 選択中の月
  - yearOptions: { value: string; label: string }[] - 年セレクトの選択肢
  - months: { value: string; label: string }[] - 月セレクトの選択肢
  - data: WeeklyVolumePoint[] - 週間ボリュームデータ
  - loading: boolean - 取得中フラグ
  - error: string - エラーメッセージ
  - onToggleMode: () => void - 年間/月間切り替え時のコールバック
  - onPeriodChange: () => void - 年・月セレクト変更時のコールバック
-->
<script lang="ts">
	import Select from '$lib/components/Select.svelte';
	import Checkbox from '$lib/components/Checkbox.svelte';
	import Dialog from '$lib/components/Dialog.svelte';
	import WeeklyVolumeChart from './WeeklyVolumeChart.svelte';
	import type { WeeklyVolumeBreakdownItem, WeeklyVolumePoint } from '../types';

	let {
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
		mode: 'month' | 'year';
		year: string;
		month: string;
		yearOptions: { value: string; label: string }[];
		months: { value: string; label: string }[];
		data: WeeklyVolumePoint[];
		loading: boolean;
		error: string;
		onToggleMode: () => void;
		onPeriodChange: () => void;
	} = $props();

	let breakdownWeekStart = $state<string | null>(null);
	let breakdownItems = $state<WeeklyVolumeBreakdownItem[]>([]);
	let breakdownLoading = $state(false);
	let breakdownError = $state('');

	function weekStartLabel(weekStart: string): string {
		const [y, m, d] = weekStart.split('-');
		return `${y}/${m}/${d} 〜`;
	}

	async function handleVolumeBarClick(weekStart: string) {
		breakdownWeekStart = weekStart;
		breakdownItems = [];
		breakdownLoading = true;
		breakdownError = '';
		try {
			const res = await fetch(`/workout/volume?weekStart=${weekStart}`);
			if (!res.ok) {
				breakdownError = '取得に失敗しました';
				return;
			}
			breakdownItems = (await res.json()) as WeeklyVolumeBreakdownItem[];
		} catch {
			breakdownError = '通信エラーが発生しました';
		} finally {
			breakdownLoading = false;
		}
	}
</script>

<div class="rounded-3xl bg-bg-card p-5 shadow-md">
	<h2 class="mb-3 text-sm font-medium text-secondary">週間ボリューム</h2>
	<div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
		<Select
			data-testid="workout-volume-year-select"
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
			data-testid="workout-volume-month-select"
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
			data-testid="workout-volume-year-mode"
			checked={mode === 'year'}
			onchange={onToggleMode}
		>
			年間
		</Checkbox>
	</div>
	{#if error}
		<p role="alert" class="py-4 text-center text-sm text-destructive">{error}</p>
	{:else if data.length > 0}
		<div class={loading ? 'opacity-40 transition-opacity duration-150' : ''}>
			<WeeklyVolumeChart points={data} onBarClick={handleVolumeBarClick} />
		</div>
	{:else if loading}
		<p class="py-8 text-center text-sm text-secondary">読み込み中...</p>
	{:else}
		<WeeklyVolumeChart points={data} onBarClick={handleVolumeBarClick} />
	{/if}
</div>

<Dialog
	open={breakdownWeekStart !== null}
	onClose={() => (breakdownWeekStart = null)}
	aria-label="週間ボリューム内訳"
>
	<div class="w-full max-w-sm rounded-3xl bg-bg-card p-6 shadow-lg">
		<h2 class="mb-4 text-base font-medium text-label">
			{breakdownWeekStart ? weekStartLabel(breakdownWeekStart) : ''} 内訳
		</h2>
		{#if breakdownLoading}
			<p class="py-4 text-center text-sm text-secondary">読み込み中...</p>
		{:else if breakdownError}
			<p role="alert" class="text-sm text-destructive">{breakdownError}</p>
		{:else if breakdownItems.length === 0}
			<p class="text-sm text-secondary">データがありません</p>
		{:else}
			<ul class="flex flex-col gap-2">
				{#each breakdownItems as item (item.exerciseName)}
					<li class="flex items-center justify-between gap-4">
						<span class="min-w-0 truncate text-sm text-label">{item.exerciseName}</span>
						<span class="shrink-0 text-sm font-medium text-label"
							>{item.volume.toLocaleString()}</span
						>
					</li>
				{/each}
			</ul>
			<div class="mt-3 border-t border-separator pt-3">
				<div class="flex items-center justify-between">
					<span class="text-xs text-secondary">合計</span>
					<span class="text-sm font-medium text-accent">
						{breakdownItems.reduce((s, i) => s + i.volume, 0).toLocaleString()}
					</span>
				</div>
			</div>
		{/if}
		<div class="mt-4 flex justify-end">
			<button
				onclick={() => (breakdownWeekStart = null)}
				class="text-sm text-secondary hover:text-label"
			>
				閉じる
			</button>
		</div>
	</div>
</Dialog>
