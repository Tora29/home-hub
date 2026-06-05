<!--
  @file 画面: 筋トレ記録
  @module src/routes/workout/+page.svelte
  @feature workout

  @description
  筋トレ記録の登録・一覧・グラフ確認を行う画面。
  role === 'main' のユーザーのみアクセス可能。

  @navigation
  - 遷移先: /workout/exercises - 種目管理画面

  @api
  - GET /workout（SSR load） - 記録一覧・種目一覧取得
  - POST /workout → 201 WorkoutRecord - 記録追加
  - DELETE /workout/[id] → 204 - 記録削除
  - POST /workout/body-weight → 200 - 体重登録
  - GET /workout/chart → 200 ChartData - グラフデータ取得（CSR）
  - GET /workout/volume → 200 WeeklyVolumePoint[] - 週間ボリューム取得（CSR）
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
	import WorkoutChart from './components/WorkoutChart.svelte';
	import WeeklyVolumeChart from './components/WeeklyVolumeChart.svelte';

	type Exercise = { id: string; name: string };
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

	let { data } = $props();

	// --- 今日の日付（クライアントローカル時刻）
	function todayStr(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	// --- 体重フォーム
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
		} catch {
			bodyWeightError = '通信エラーが発生しました';
		} finally {
			bodyWeightLoading = false;
		}
	}

	// --- 記録フォーム
	let formDate = $state(todayStr());
	let formExerciseId = $state('');
	let formWeight = $state('');
	let formReps = $state('5');
	let formError = $state('');
	let formLoading = $state(false);

	// 記録を日付でグループ化
	const recordsByDate = $derived(() => {
		const map = new SvelteMap<string, WorkoutRecord[]>();
		for (const r of data.records as WorkoutRecord[]) {
			const list = map.get(r.date) ?? [];
			list.push(r);
			map.set(r.date, list);
		}
		return Array.from(map.entries()).map(([date, records]) => ({ date, records }));
	});

	// 前回記録ヒント
	const prevRecord = $derived(() => {
		if (!formExerciseId) return null;
		const rec = data.records.find((r: WorkoutRecord) => r.exerciseId === formExerciseId);
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
		} catch {
			formError = '通信エラーが発生しました';
		} finally {
			formLoading = false;
		}
	}

	// --- 記録フィルタ
	async function handleFilterChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		const val = select.value;
		await goto(val ? `/workout?exerciseId=${val}` : '/workout', {
			keepFocus: true,
			replaceState: true
		});
	}

	// --- 記録削除
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
		} catch {
			deleteError = '通信エラーが発生しました';
		} finally {
			deleteLoading = false;
		}
	}

	// --- グラフ
	let chartExerciseId = $state(untrack(() => data.exercises.items[0]?.id ?? ''));
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

	// chartExerciseId 変更時のみ再取得（mode/year/month の変更は各ハンドラが明示的に呼ぶ）
	$effect(() => {
		const id = chartExerciseId;
		if (id) {
			untrack(() => void fetchChartData());
		}
	});

	// --- 週間ボリューム
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

	// Brzycki 式で推定1RM を計算
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
	<!-- ヘッダー -->
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

	<!-- 体重入力フォーム -->
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

	<!-- 記録追加フォーム -->
	<div class="rounded-3xl bg-bg-card p-5 shadow-md">
		<h2 class="mb-3 text-sm font-medium text-secondary">セット記録</h2>
		{#if data.exercises.items.length === 0}
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
					{#each data.exercises.items as ex (ex.id)}
						<option value={ex.id}>{ex.name}</option>
					{/each}
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
			{#if prevRecord()}
				<p data-testid="workout-form-prev-record-hint" class="mt-2 text-xs text-secondary">
					前回: {prevRecord()?.weight}kg × {prevRecord()?.reps}回
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

	<!-- 記録一覧 -->
	<div class="rounded-3xl bg-bg-card p-5 shadow-md">
		<div class="mb-3 flex items-center gap-2">
			<h2 class="flex-1 text-sm font-medium text-secondary">記録一覧</h2>
			<Select
				data-testid="workout-filter-exercise-select"
				value={data.filterExerciseId ?? ''}
				onchange={handleFilterChange}
				class="text-sm"
			>
				<option value="">すべての種目</option>
				{#each data.exercises.items as ex (ex.id)}
					<option value={ex.id}>{ex.name}</option>
				{/each}
			</Select>
		</div>

		{#if data.records.length === 0}
			<p class="py-8 text-center text-sm text-secondary">記録がありません</p>
		{:else}
			<div data-testid="workout-record-list" class="flex flex-col gap-3">
				{#each recordsByDate() as group (group.date)}
					<div>
						<!-- 日付ヘッダー -->
						<div class="mb-1 flex items-center gap-2">
							<span class="text-xs font-medium text-secondary">{group.date}</span>
							<div class="h-px flex-1 bg-separator"></div>
						</div>
						<!-- その日のセット一覧 -->
						<ul class="flex flex-col gap-0.5">
							{#each group.records as record (record.id)}
								<li
									data-testid="workout-record-item"
									class="flex items-center gap-2 rounded-xl px-3 py-1.5 hover:bg-bg"
								>
									{#if !data.filterExerciseId}
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
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- グラフセクション（種目別推移） -->
	{#if data.exercises.items.length > 0}
		<div class="rounded-3xl bg-bg-card p-5 shadow-md">
			<h2 class="mb-3 text-sm font-medium text-secondary">重量推移グラフ</h2>
			<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
				<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
					<Select
						data-testid="workout-chart-exercise-select"
						bind:value={chartExerciseId}
						class="text-sm"
					>
						{#each data.exercises.items as ex (ex.id)}
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

		<!-- 週間ボリュームグラフ -->
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
					<WeeklyVolumeChart points={volumeData} />
				</div>
			{:else if volumeLoading}
				<p class="py-8 text-center text-sm text-secondary">読み込み中...</p>
			{:else}
				<WeeklyVolumeChart points={volumeData} />
			{/if}
		</div>
	{/if}
</div>

<!-- 記録削除確認ダイアログ -->
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
