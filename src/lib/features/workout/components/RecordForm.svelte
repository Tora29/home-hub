<!--
  @file コンポーネント: RecordForm
  @module src/lib/features/workout/components/RecordForm.svelte
  @feature workout

  @description
  筋トレセット記録の登録フォーム。種目・日付・重量（または自重）・回数を入力する。
  状態の所有権は親（WorkoutPage.svelte）が持ち、bindable props と onSubmit コールバックで連携する。
  種目セレクトの中身（カテゴリ optgroup）は親から渡される Snippet で描画する。

  @props
  - exercises: { items: Exercise[] } - 種目一覧
  - date: string ($bindable) - 記録日
  - exerciseId: string ($bindable) - 選択中の種目ID
  - weight: string ($bindable) - 重量入力値
  - reps: string ($bindable) - 回数
  - isBodyWeight: boolean ($bindable) - 自重フラグ
  - bestRecord: { weight: number; reps: number } | null - 選択種目の過去MAX
  - error: string - エラーメッセージ
  - loading: boolean - 送信中フラグ
  - onSubmit: () => void - 追加ボタン押下時のコールバック
  - exerciseOptions: Snippet - 種目セレクトの中身（カテゴリ optgroup + その他）
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import Button from '$lib/components/Button.svelte';
	import Checkbox from '$lib/components/Checkbox.svelte';
	import type { Exercise } from '../types';

	let {
		exercises,
		date = $bindable(),
		exerciseId = $bindable(),
		weight = $bindable(),
		reps = $bindable(),
		isBodyWeight = $bindable(),
		bestRecord,
		error,
		loading,
		onSubmit,
		exerciseOptions
	}: {
		exercises: { items: Exercise[] };
		date: string;
		exerciseId: string;
		weight: string;
		reps: string;
		isBodyWeight: boolean;
		bestRecord: { weight: number; reps: number } | null;
		error: string;
		loading: boolean;
		onSubmit: () => void;
		exerciseOptions: Snippet;
	} = $props();
</script>

<div class="rounded-3xl bg-bg-card p-5 shadow-md">
	<h2 class="mb-3 text-sm font-medium text-secondary">セット記録</h2>
	{#if exercises.items.length === 0}
		<p class="text-sm text-secondary">
			<a href="/workout/exercises" class="text-accent hover:underline">種目管理</a
			>から種目を追加してください。
		</p>
	{:else}
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
			<input
				data-testid="workout-form-date"
				type="date"
				bind:value={date}
				class="col-span-2 rounded-2xl border border-separator bg-bg px-3 py-2 text-sm text-label focus:ring-2 focus:ring-accent focus:outline-none sm:col-span-1"
			/>
			<Select
				data-testid="workout-form-exercise-select"
				bind:value={exerciseId}
				class="col-span-2 sm:col-span-1"
			>
				<option value="">種目を選択</option>
				{@render exerciseOptions()}
			</Select>
			<div class="flex items-center gap-2">
				{#if isBodyWeight}
					<div
						class="flex min-w-0 flex-1 items-center rounded-2xl border border-separator bg-bg px-3 py-2 text-sm text-secondary"
					>
						自重
					</div>
				{:else}
					<Input
						data-testid="workout-form-weight-input"
						type="number"
						step="0.5"
						min="0"
						max="999"
						bind:value={weight}
						placeholder="重量 (kg)"
						class="min-w-0 flex-1"
					/>
				{/if}
				<Checkbox
					data-testid="workout-form-bodyweight-checkbox"
					checked={isBodyWeight}
					onchange={() => {
						isBodyWeight = !isBodyWeight;
						if (isBodyWeight) weight = '';
					}}
				>
					自重
				</Checkbox>
			</div>
			<Select data-testid="workout-form-reps-select" bind:value={reps} class="w-full">
				{#each Array.from({ length: 10 }, (_, i) => i + 1) as n (n)}
					<option value={String(n)}>{n}回</option>
				{/each}
			</Select>
		</div>
		{#if bestRecord}
			<p data-testid="workout-form-prev-record-hint" class="mt-2 text-xs text-secondary">
				過去のMAX: {bestRecord.weight}kg × {bestRecord.reps}回
			</p>
		{/if}
		{#if error}
			<p role="alert" class="mt-2 text-xs text-destructive">{error}</p>
		{/if}
		<div class="mt-3 flex justify-end">
			<Button
				data-testid="workout-form-add-button"
				variant="primary"
				size="md"
				onclick={onSubmit}
				disabled={loading}
				type="button"
			>
				{loading ? '追加中...' : '追加'}
			</Button>
		</div>
	{/if}
</div>
