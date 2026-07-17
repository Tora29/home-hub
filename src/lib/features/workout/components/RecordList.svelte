<!--
  @file コンポーネント: RecordList
  @module src/lib/features/workout/components/RecordList.svelte
  @feature workout

  @description
  筋トレ記録一覧カード。種目フィルタ・日付グループ化・件数プレビュー展開・削除操作を担う。
  記録データ自体（records）と種目フィルタの所有権は親（WorkoutPage.svelte）が持ち、
  日付グループの展開状態・プレビュー件数はこのコンポーネント内のローカル表示状態として保持する。

  @props
  - records: WorkoutRecord[] - 記録一覧（親の state）
  - filterExerciseId: string | null - フィルタ中の種目ID
  - exerciseOptions: Snippet - フィルタセレクトの中身（カテゴリ optgroup + その他）
  - onFilterChange: (e: Event) => void - フィルタセレクト変更時のコールバック
  - onDeleteRequest: (record: WorkoutRecord) => void - 削除ボタン押下時のコールバック
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import Select from '$lib/components/Select.svelte';
	import Button from '$lib/components/Button.svelte';
	import type { WorkoutRecord } from '../types';

	let {
		records,
		filterExerciseId,
		exerciseOptions,
		onFilterChange,
		onDeleteRequest
	}: {
		records: WorkoutRecord[];
		filterExerciseId: string | null;
		exerciseOptions: Snippet;
		onFilterChange: (e: Event) => void;
		onDeleteRequest: (record: WorkoutRecord) => void;
	} = $props();

	const recordsByDate = $derived.by(() => {
		const map = new SvelteMap<string, WorkoutRecord[]>();
		for (const r of records) {
			const list = map.get(r.date) ?? [];
			list.push(r);
			map.set(r.date, list);
		}
		return Array.from(map.entries()).map(([date, recs]) => ({ date, records: recs }));
	});

	const RECORDS_PREVIEW_COUNT = 1;
	let showAllRecords = $state(false);
	const visibleRecordsByDate = $derived.by(() =>
		showAllRecords ? recordsByDate : recordsByDate.slice(0, RECORDS_PREVIEW_COUNT)
	);

	const GROUP_PREVIEW_COUNT = 3;
	let expandedGroups = new SvelteMap<string, boolean>();

	function estimatedOneRM(weight: number, reps: number): number {
		if (reps === 1) return weight;
		return Math.floor(weight / (1.0278 - 0.0278 * reps));
	}
</script>

<div class="rounded-3xl bg-bg-card p-5 shadow-md">
	<div class="mb-3 flex items-center gap-2">
		<h2 class="flex-1 text-sm font-medium text-secondary">記録一覧</h2>
		<Select
			data-testid="workout-filter-exercise-select"
			value={filterExerciseId ?? ''}
			onchange={onFilterChange}
			class="text-sm"
		>
			<option value="">すべての種目</option>
			{@render exerciseOptions()}
		</Select>
	</div>

	{#if records.length === 0}
		<p class="py-8 text-center text-sm text-secondary">記録がありません</p>
	{:else}
		<div data-testid="workout-record-list" class="flex flex-col gap-3">
			{#each visibleRecordsByDate as group (group.date)}
				{@const isExpanded = expandedGroups.get(group.date)}
				<div>
					<div class="mb-1 flex items-center gap-2">
						<span class="text-xs font-medium text-secondary">{group.date}</span>
						<div class="h-px flex-1 bg-separator"></div>
					</div>
					<ul class="flex flex-col gap-0.5">
						{#each isExpanded ? group.records : group.records.slice(0, GROUP_PREVIEW_COUNT) as record (record.id)}
							<li
								data-testid="workout-record-item"
								class="flex items-center gap-2 rounded-xl px-3 py-1.5 hover:bg-bg"
							>
								{#if !filterExerciseId}
									<span class="w-28 min-w-0 shrink-0 truncate text-sm font-medium text-label"
										>{record.exerciseName}</span
									>
								{/if}
								{#if record.isBodyWeight}
									<span
										class="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
										>自重</span
									>
								{/if}
								<span class="shrink-0 text-sm font-medium text-label">{record.weight}kg</span>
								<span class="shrink-0 text-xs text-secondary">×{record.reps}回</span>
								<span
									data-testid="workout-record-estimated-1rm"
									class="shrink-0 text-xs text-tertiary"
								>
									1RM≈{estimatedOneRM(record.weight, record.reps)}kg
								</span>
								<span class="flex-1"></span>
								<Button
									data-testid="workout-record-delete-button"
									variant="ghost-destructive"
									size="sm"
									onclick={() => onDeleteRequest(record)}
									aria-label="削除"
									type="button"
								>
									×
								</Button>
							</li>
						{/each}
					</ul>
					{#if group.records.length > GROUP_PREVIEW_COUNT}
						<button
							type="button"
							onclick={() => expandedGroups.set(group.date, !isExpanded)}
							class="mt-0.5 w-full py-1 text-xs text-secondary hover:text-label"
						>
							{isExpanded
								? '折りたたむ ▲'
								: `残り ${group.records.length - GROUP_PREVIEW_COUNT} 件 ▼`}
						</button>
					{/if}
				</div>
			{/each}
		</div>
		{#if recordsByDate.length > RECORDS_PREVIEW_COUNT}
			<button
				onclick={() => (showAllRecords = !showAllRecords)}
				class="mt-1 w-full py-1.5 text-xs text-secondary hover:text-label"
			>
				{showAllRecords
					? '折りたたむ ▲'
					: `もっと見る（残り ${recordsByDate.length - RECORDS_PREVIEW_COUNT} 日分）▼`}
			</button>
		{/if}
	{/if}
</div>
