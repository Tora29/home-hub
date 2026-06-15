<!--
  @file コンポーネント: WorkoutPage
  @module src/lib/features/workout/components/WorkoutPage.svelte
  @feature workout

  @description
  筋トレ記録の登録・一覧・グラフ確認を行う画面コンポーネント。
  role === 'main' のユーザーのみアクセス可能。

  @props
  - records: WorkoutRecord[] - 記録一覧
  - exercises: { items: Exercise[] } - 種目一覧
  - filterExerciseId: string | null - フィルタ中の種目ID
-->
<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { onMount, untrack } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { Dumbbell, ListChecks } from '@lucide/svelte';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Checkbox from '$lib/components/Checkbox.svelte';
	import Dialog from '$lib/components/Dialog.svelte';
	import WorkoutChart from './WorkoutChart.svelte';
	import WeeklyVolumeChart from './WeeklyVolumeChart.svelte';

	type Exercise = { id: string; name: string; category: { id: string; name: string } | null };
	type WorkoutRecord = {
		id: string;
		exerciseId: string;
		exerciseName: string;
		date: string;
		weight: number;
		reps: number;
	};
	type ChartPoint = { date: string; maxWeight: number };
	type BodyWeightPoint = { date: string; weight: number };
	type WeeklyVolumePoint = { weekStart: string; volume: number };

	let {
		records,
		exercises,
		filterExerciseId
	}: {
		records: WorkoutRecord[];
		exercises: { items: Exercise[] };
		filterExerciseId: string | null;
	} = $props();

	function todayStr(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	let bodyWeightDate = $state(todayStr());
	let bodyWeightInput = $state('');
	let bodyWeightError = $state('');
	let bodyWeightLoading = $state(false);

	async function handleBodyWeightSubmit() {
		bodyWeightError = '';
		const w = parseFloat(bodyWeightInput);
		if (!bodyWeightInput || isNaN(w)) {
			bodyWeightError = '体重を入力してください';
			return;
		}
		bodyWeightLoading = true;
		try {
			const res = await fetch('/workout/body-weight', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ date: bodyWeightDate, weight: w })
			});
			if (!res.ok) {
				const err = (await res.json()) as { message?: string };
				bodyWeightError = err.message ?? 'エラーが発生しました';
				return;
			}
			bodyWeightInput = '';
			await fetchChartData();
		} catch {
			bodyWeightError = '通信エラーが発生しました';
		} finally {
			bodyWeightLoading = false;
		}
	}

	let formDate = $state(todayStr());
	let formExerciseId = $state('');
	let formWeight = $state('');
	let formReps = $state('5');
	let formError = $state('');
	let formLoading = $state(false);

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

	const uniqueCategories = $derived([
		...new Map(
			exercises.items.filter((ex) => ex.category).map((ex) => [ex.category!.id, ex.category!])
		).values()
	]);

	const prevRecord = $derived.by(() => {
		if (!formExerciseId) return null;
		const rec = records.find((r) => r.exerciseId === formExerciseId);
		return rec ?? null;
	});

	async function handleAddRecord() {
		formError = '';
		const w = parseFloat(formWeight);
		const r = parseInt(formReps);
		if (!formExerciseId) {
			formError = '種目を選択してください';
			return;
		}
		if (!formWeight || isNaN(w) || w <= 0) {
			formError = '重量を入力してください';
			return;
		}
		formLoading = true;
		try {
			const res = await fetch('/workout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ exerciseId: formExerciseId, date: formDate, weight: w, reps: r })
			});
			if (!res.ok) {
				const err = (await res.json()) as { message?: string };
				formError = err.message ?? 'エラーが発生しました';
				return;
			}
			formWeight = '';
			await invalidateAll();
			await Promise.all([fetchChartData(), fetchVolumeData()]);
		} catch {
			formError = '通信エラーが発生しました';
		} finally {
			formLoading = false;
		}
	}

	async function handleFilterChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		const val = select.value;
		await goto(val ? `/workout?exerciseId=${val}` : '/workout', {
			keepFocus: true,
			replaceState: true
		});
	}

	let deletingRecord = $state<WorkoutRecord | null>(null);
	let deleteLoading = $state(false);
	let deleteError = $state('');

	async function handleDeleteConfirm() {
		if (!deletingRecord) return;
		deleteLoading = true;
		deleteError = '';
		try {
			const res = await fetch(`/workout/${deletingRecord.id}`, { method: 'DELETE' });
			if (!res.ok) {
				const err = (await res.json()) as { message?: string };
				deleteError = err.message ?? 'エラーが発生しました';
				return;
			}
			deletingRecord = null;
			await invalidateAll();
			await Promise.all([fetchChartData(), fetchVolumeData()]);
		} catch {
			deleteError = '通信エラーが発生しました';
		} finally {
			deleteLoading = false;
		}
	}

	let chartExerciseId = $state(untrack(() => exercises.items[0]?.id ?? ''));
	let chartMode = $state<'month' | 'year' | 'all'>('month');
	let chartYear = $state(new Date().getFullYear().toString());
	let chartMonth = $state(String(new Date().getMonth() + 1).padStart(2, '0'));
	let chartData = $state<{
		exercise: Exercise;
		exercisePoints: ChartPoint[];
		bodyWeightPoints: BodyWeightPoint[];
	} | null>(null);
	let chartLoading = $state(false);
	let chartError = $state('');
	let chartFetchSeq = 0;

	function chartQueryParams() {
		if (chartMode === 'month') return `period=1m&month=${chartYear}-${chartMonth}`;
		if (chartMode === 'year') return `period=year&month=${chartYear}-01`;
		return 'period=all';
	}

	async function fetchChartData() {
		if (!chartExerciseId) return;
		chartLoading = true;
		chartError = '';
		const seq = ++chartFetchSeq;
		try {
			const res = await fetch(`/workout/chart?exerciseId=${chartExerciseId}&${chartQueryParams()}`);
			if (!res.ok) {
				if (seq === chartFetchSeq) chartError = 'グラフデータの取得に失敗しました';
				return;
			}
			if (seq === chartFetchSeq) {
				chartData = await res.json();
			}
		} catch {
			if (seq === chartFetchSeq) chartError = '通信エラーが発生しました';
		} finally {
			if (seq === chartFetchSeq) chartLoading = false;
		}
	}

	$effect(() => {
		const id = chartExerciseId;
		if (id) {
			untrack(() => void fetchChartData());
		}
	});

	let volumeMode = $state<'month' | 'year' | 'all'>('month');
	let volumeYear = $state(new Date().getFullYear().toString());
	let volumeMonth = $state(String(new Date().getMonth() + 1).padStart(2, '0'));
	let volumeData = $state<WeeklyVolumePoint[]>([]);
	let volumeLoading = $state(false);
	let volumeError = $state('');
	let volumeFetchSeq = 0;

	function volumeQueryParams() {
		if (volumeMode === 'month') return `period=1m&month=${volumeYear}-${volumeMonth}`;
		if (volumeMode === 'year') return `period=year&month=${volumeYear}-01`;
		return 'period=all';
	}

	async function fetchVolumeData() {
		volumeLoading = true;
		volumeError = '';
		const seq = ++volumeFetchSeq;
		try {
			const res = await fetch(`/workout/volume?${volumeQueryParams()}`);
			if (!res.ok) {
				if (seq === volumeFetchSeq) volumeError = 'ボリュームデータの取得に失敗しました';
				return;
			}
			if (seq === volumeFetchSeq) {
				volumeData = await res.json();
			}
		} catch {
			if (seq === volumeFetchSeq) volumeError = '通信エラーが発生しました';
		} finally {
			if (seq === volumeFetchSeq) volumeLoading = false;
		}
	}

	onMount(() => void fetchVolumeData());

	type BreakdownItem = { exerciseName: string; volume: number };
	let breakdownWeekStart = $state<string | null>(null);
	let breakdownItems = $state<BreakdownItem[]>([]);
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
			breakdownItems = (await res.json()) as BreakdownItem[];
		} catch {
			breakdownError = '通信エラーが発生しました';
		} finally {
			breakdownLoading = false;
		}
	}

	function estimatedOneRM(weight: number, reps: number): number {
		if (reps === 1) return weight;
		return Math.floor(weight / (1.0278 - 0.0278 * reps));
	}

	function yearOptions(): { value: string; label: string }[] {
		const cur = new Date().getFullYear();
		return Array.from({ length: 5 }, (_, i) => {
			const y = String(cur - i);
			return { value: y, label: `${y}年` };
		});
	}

	const MONTHS = Array.from({ length: 12 }, (_, i) => ({
		value: String(i + 1).padStart(2, '0'),
		label: `${i + 1}月`
	}));
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<div class="flex items-center gap-3">
		<Dumbbell size={24} class="text-accent" />
		<h1 class="flex-1 text-2xl font-medium text-label">筋トレ記録</h1>
		<a
			href="/workout/exercises"
			class="inline-flex items-center gap-1.5 rounded-2xl border border-separator px-3 py-2 text-sm text-secondary hover:text-label"
		>
			<ListChecks size={14} />
			<span>種目管理</span>
		</a>
	</div>

	<div class="rounded-3xl bg-bg-card p-5 shadow-md">
		<h2 class="mb-3 text-sm font-medium text-secondary">体重記録</h2>
		<div class="flex items-start gap-2">
			<input
				data-testid="workout-body-weight-date"
				type="date"
				bind:value={bodyWeightDate}
				class="rounded-2xl border border-separator bg-bg px-3 py-2 text-sm text-label focus:ring-2 focus:ring-accent focus:outline-none"
			/>
			<div class="min-w-0 flex-1">
				<Input
					data-testid="workout-body-weight-input"
					type="number"
					step="0.1"
					min="0"
					max="300"
					bind:value={bodyWeightInput}
					placeholder="体重 (kg)"
					class="w-full"
				/>
			</div>
			<Button
				data-testid="workout-body-weight-submit-button"
				variant="secondary"
				size="md"
				onclick={() => void handleBodyWeightSubmit()}
				disabled={bodyWeightLoading}
				type="button"
			>
				{bodyWeightLoading ? '記録中...' : '記録'}
			</Button>
		</div>
		{#if bodyWeightError}
			<p role="alert" class="mt-2 text-xs text-destructive">{bodyWeightError}</p>
		{/if}
	</div>

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
					bind:value={formDate}
					class="col-span-2 rounded-2xl border border-separator bg-bg px-3 py-2 text-sm text-label focus:ring-2 focus:ring-accent focus:outline-none sm:col-span-1"
				/>
				<Select
					data-testid="workout-form-exercise-select"
					bind:value={formExerciseId}
					class="col-span-2 sm:col-span-1"
				>
					<option value="">種目を選択</option>
					{#if uniqueCategories.length > 0}
						{#each uniqueCategories as cat (cat.id)}
							<optgroup label={cat.name}>
								{#each exercises.items.filter((ex) => ex.category?.id === cat.id) as ex (ex.id)}
									<option value={ex.id}>{ex.name}</option>
								{/each}
							</optgroup>
						{/each}
						{#if exercises.items.some((ex) => !ex.category)}
							<optgroup label="その他">
								{#each exercises.items.filter((ex) => !ex.category) as ex (ex.id)}
									<option value={ex.id}>{ex.name}</option>
								{/each}
							</optgroup>
						{/if}
					{:else}
						{#each exercises.items as ex (ex.id)}
							<option value={ex.id}>{ex.name}</option>
						{/each}
					{/if}
				</Select>
				<Input
					data-testid="workout-form-weight-input"
					type="number"
					step="0.5"
					min="0"
					max="999"
					bind:value={formWeight}
					placeholder="重量 (kg)"
					class="w-full"
				/>
				<Select data-testid="workout-form-reps-select" bind:value={formReps} class="w-full">
					{#each Array.from({ length: 10 }, (_, i) => i + 1) as n (n)}
						<option value={String(n)}>{n}回</option>
					{/each}
				</Select>
			</div>
			{#if prevRecord}
				<p data-testid="workout-form-prev-record-hint" class="mt-2 text-xs text-secondary">
					前回: {prevRecord?.weight}kg × {prevRecord?.reps}回
				</p>
			{/if}
			{#if formError}
				<p role="alert" class="mt-2 text-xs text-destructive">{formError}</p>
			{/if}
			<div class="mt-3 flex justify-end">
				<Button
					data-testid="workout-form-add-button"
					variant="primary"
					size="md"
					onclick={() => void handleAddRecord()}
					disabled={formLoading}
					type="button"
				>
					{formLoading ? '追加中...' : '追加'}
				</Button>
			</div>
		{/if}
	</div>

	<div class="rounded-3xl bg-bg-card p-5 shadow-md">
		<div class="mb-3 flex items-center gap-2">
			<h2 class="flex-1 text-sm font-medium text-secondary">記録一覧</h2>
			<Select
				data-testid="workout-filter-exercise-select"
				value={filterExerciseId ?? ''}
				onchange={handleFilterChange}
				class="text-sm"
			>
				<option value="">すべての種目</option>
				{#each exercises.items as ex (ex.id)}
					<option value={ex.id}>{ex.name}</option>
				{/each}
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
										onclick={() => (deletingRecord = record)}
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

	{#if exercises.items.length > 0}
		<div class="rounded-3xl bg-bg-card p-5 shadow-md">
			<h2 class="mb-3 text-sm font-medium text-secondary">重量推移グラフ</h2>
			<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
				<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
					<Select
						data-testid="workout-chart-exercise-select"
						bind:value={chartExerciseId}
						class="text-sm"
					>
						{#each exercises.items as ex (ex.id)}
							<option value={ex.id}>{ex.name}</option>
						{/each}
					</Select>
					<Select
						data-testid="workout-chart-year-select"
						bind:value={chartYear}
						disabled={chartMode !== 'month'}
						onchange={() => void fetchChartData()}
						class="text-sm {chartMode !== 'month' ? 'opacity-40' : ''}"
					>
						{#each yearOptions() as opt (opt.value)}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</Select>
					<Select
						data-testid="workout-chart-month-select"
						bind:value={chartMonth}
						disabled={chartMode !== 'month'}
						onchange={() => void fetchChartData()}
						class="text-sm {chartMode !== 'month' ? 'opacity-40' : ''}"
					>
						{#each MONTHS as m (m.value)}
							<option value={m.value}>{m.label}</option>
						{/each}
					</Select>
					<Checkbox
						data-testid="workout-chart-year-mode"
						checked={chartMode === 'year'}
						disabled={chartMode === 'all'}
						onchange={() => {
							chartMode = chartMode === 'year' ? 'month' : 'year';
							void fetchChartData();
						}}
					>
						年間
					</Checkbox>
					<Checkbox
						data-testid="workout-chart-all-mode"
						checked={chartMode === 'all'}
						disabled={chartMode === 'year'}
						onchange={() => {
							chartMode = chartMode === 'all' ? 'month' : 'all';
							void fetchChartData();
						}}
					>
						全期間
					</Checkbox>
					{#if chartData}
						<div class="ml-auto flex flex-col items-end gap-1 text-xs text-label">
							<span class="flex items-center gap-1.5">
								{chartData.exercise.name}
								<svg width="20" height="10" class="shrink-0">
									<line
										x1="0"
										y1="5"
										x2="20"
										y2="5"
										stroke="var(--color-accent)"
										stroke-width="2"
									/>
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
			{#if chartError}
				<p role="alert" class="py-4 text-center text-sm text-destructive">{chartError}</p>
			{:else if chartData}
				<div class={chartLoading ? 'opacity-40 transition-opacity duration-150' : ''}>
					<WorkoutChart
						exercisePoints={chartData.exercisePoints}
						bodyWeightPoints={chartData.bodyWeightPoints}
						exerciseName={chartData.exercise.name}
					/>
				</div>
			{:else if chartLoading}
				<p class="py-8 text-center text-sm text-secondary">読み込み中...</p>
			{/if}
		</div>

		<div class="rounded-3xl bg-bg-card p-5 shadow-md">
			<h2 class="mb-3 text-sm font-medium text-secondary">週間ボリューム</h2>
			<div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
				<Select
					data-testid="workout-volume-year-select"
					bind:value={volumeYear}
					disabled={volumeMode !== 'month'}
					onchange={() => void fetchVolumeData()}
					class="text-sm {volumeMode !== 'month' ? 'opacity-40' : ''}"
				>
					{#each yearOptions() as opt (opt.value)}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</Select>
				<Select
					data-testid="workout-volume-month-select"
					bind:value={volumeMonth}
					disabled={volumeMode !== 'month'}
					onchange={() => void fetchVolumeData()}
					class="text-sm {volumeMode !== 'month' ? 'opacity-40' : ''}"
				>
					{#each MONTHS as m (m.value)}
						<option value={m.value}>{m.label}</option>
					{/each}
				</Select>
				<Checkbox
					data-testid="workout-volume-year-mode"
					checked={volumeMode === 'year'}
					disabled={volumeMode === 'all'}
					onchange={() => {
						volumeMode = volumeMode === 'year' ? 'month' : 'year';
						void fetchVolumeData();
					}}
				>
					年間
				</Checkbox>
				<Checkbox
					data-testid="workout-volume-all-mode"
					checked={volumeMode === 'all'}
					disabled={volumeMode === 'year'}
					onchange={() => {
						volumeMode = volumeMode === 'all' ? 'month' : 'all';
						void fetchVolumeData();
					}}
				>
					全期間
				</Checkbox>
			</div>
			{#if volumeError}
				<p role="alert" class="py-4 text-center text-sm text-destructive">{volumeError}</p>
			{:else if volumeData.length > 0}
				<div class={volumeLoading ? 'opacity-40 transition-opacity duration-150' : ''}>
					<WeeklyVolumeChart points={volumeData} onBarClick={handleVolumeBarClick} />
				</div>
			{:else if volumeLoading}
				<p class="py-8 text-center text-sm text-secondary">読み込み中...</p>
			{:else}
				<WeeklyVolumeChart points={volumeData} onBarClick={handleVolumeBarClick} />
			{/if}
		</div>
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

<ConfirmDialog
	open={deletingRecord !== null}
	title="記録を削除しますか？"
	description={deletingRecord
		? `${deletingRecord.date} ${deletingRecord.exerciseName} ${deletingRecord.weight}kg × ${deletingRecord.reps}回 を削除します。`
		: ''}
	confirmLabel="削除する"
	confirmVariant="destructive"
	loading={deleteLoading}
	error={deleteError}
	onConfirm={() => void handleDeleteConfirm()}
	onCancel={() => {
		deletingRecord = null;
		deleteError = '';
	}}
/>
