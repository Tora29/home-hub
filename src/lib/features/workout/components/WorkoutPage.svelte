<!--
  @file コンポーネント: WorkoutPage
  @module src/lib/features/workout/components/WorkoutPage.svelte
  @feature workout

  @description
  筋トレ記録の登録・一覧・グラフ確認を行う画面コンポーネント。
  role === 'main' のユーザーのみアクセス可能。
  体重記録・記録フォーム・記録一覧・重量グラフ・週間ボリュームの各カードは
  サブコンポーネント（BodyWeightSection / RecordForm / RecordList / WeightChartSection /
  VolumeChartSection）に分割し、このコンポーネントは状態の所有権とデータ取得を担う。
  種目セレクトの中身（カテゴリ optgroup）は Snippet（exerciseOptions）として各サブ
  コンポーネントに渡す。

  @props
  - records: WorkoutRecord[] - 記録一覧
  - exercises: { items: Exercise[] } - 種目一覧
  - filterExerciseId: string | null - フィルタ中の種目ID
  - todayBodyWeight: number | null - 本日記録済みの体重（null = 未記録）
-->
<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { onMount, untrack } from 'svelte';
	import { Dumbbell, ListChecks } from '@lucide/svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import BodyWeightSection from './BodyWeightSection.svelte';
	import RecordForm from './RecordForm.svelte';
	import RecordList from './RecordList.svelte';
	import WeightChartSection from './WeightChartSection.svelte';
	import VolumeChartSection from './VolumeChartSection.svelte';
	import type { ChartData, Exercise, WeeklyVolumePoint, WorkoutRecord } from '../types';

	let {
		records,
		exercises,
		filterExerciseId,
		todayBodyWeight
	}: {
		records: WorkoutRecord[];
		exercises: { items: Exercise[] };
		filterExerciseId: string | null;
		todayBodyWeight: number | null;
	} = $props();

	function todayStr(): string {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	const today = todayStr();

	/**
	 * 期間モード（月間/年間）に応じたクエリ文字列を生成する。
	 * chart・volume の両エンドポイントで共通利用する。
	 */
	function periodQueryParams(mode: 'month' | 'year', year: string, month: string): string {
		return mode === 'month' ? `period=1m&month=${year}-${month}` : `period=year&month=${year}-01`;
	}

	/**
	 * fetchSeq による競合回避付きの fetch 実行ガードを生成する。
	 * 呼び出しごとに採番し、最新の呼び出しのみ結果を反映させる判定に使う。
	 */
	function createFetchSeq() {
		let seq = 0;
		return {
			begin: () => ++seq,
			isLatest: (s: number) => s === seq
		};
	}

	// --- 体重記録 ---
	let bodyWeightDate = $state(today);
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

	// --- セット記録フォーム ---
	let formDate = $state(today);
	let formExerciseId = $state('');
	let formWeight = $state('');
	let formReps = $state('5');
	let formIsBodyWeight = $state(false);
	let formError = $state('');
	let formLoading = $state(false);

	const uniqueCategories = $derived([
		...new Map(
			exercises.items.filter((ex) => ex.category).map((ex) => [ex.category!.id, ex.category!])
		).values()
	]);

	const bestRecord = $derived.by(() => {
		if (!formExerciseId) return null;
		const filtered = records.filter((r) => r.exerciseId === formExerciseId);
		if (filtered.length === 0) return null;
		return filtered.reduce((best, r) => (r.weight > best.weight ? r : best));
	});

	async function handleAddRecord() {
		formError = '';
		const r = parseInt(formReps);
		if (!formExerciseId) {
			formError = '種目を選択してください';
			return;
		}
		if (!formIsBodyWeight) {
			const w = parseFloat(formWeight);
			if (!formWeight || isNaN(w) || w <= 0) {
				formError = '重量を入力してください';
				return;
			}
		}
		formLoading = true;
		try {
			const res = await fetch('/workout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					exerciseId: formExerciseId,
					date: formDate,
					weight: formIsBodyWeight ? 0 : parseFloat(formWeight),
					reps: r,
					isBodyWeight: formIsBodyWeight
				})
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

	// --- 記録削除 ---
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

	// --- 重量推移グラフ ---
	let chartExerciseId = $state(untrack(() => exercises.items[0]?.id ?? ''));
	let chartMode = $state<'month' | 'year'>('month');
	let chartYear = $state(new Date().getFullYear().toString());
	let chartMonth = $state(String(new Date().getMonth() + 1).padStart(2, '0'));
	let chartData = $state<ChartData | null>(null);
	let chartLoading = $state(false);
	let chartError = $state('');
	const chartSeq = createFetchSeq();

	async function fetchChartData() {
		if (!chartExerciseId) return;
		chartLoading = true;
		chartError = '';
		const seq = chartSeq.begin();
		try {
			const res = await fetch(
				`/workout/chart?exerciseId=${chartExerciseId}&${periodQueryParams(chartMode, chartYear, chartMonth)}`
			);
			if (!res.ok) {
				if (chartSeq.isLatest(seq)) chartError = 'グラフデータの取得に失敗しました';
				return;
			}
			if (chartSeq.isLatest(seq)) chartData = await res.json();
		} catch {
			if (chartSeq.isLatest(seq)) chartError = '通信エラーが発生しました';
		} finally {
			if (chartSeq.isLatest(seq)) chartLoading = false;
		}
	}

	$effect(() => {
		const id = chartExerciseId;
		if (id) {
			untrack(() => void fetchChartData());
		}
	});

	function handleChartToggleMode() {
		chartMode = chartMode === 'year' ? 'month' : 'year';
		void fetchChartData();
	}

	// --- 週間ボリューム ---
	let volumeMode = $state<'month' | 'year'>('month');
	let volumeYear = $state(new Date().getFullYear().toString());
	let volumeMonth = $state(String(new Date().getMonth() + 1).padStart(2, '0'));
	let volumeData = $state<WeeklyVolumePoint[]>([]);
	let volumeLoading = $state(false);
	let volumeError = $state('');
	const volumeSeq = createFetchSeq();

	async function fetchVolumeData() {
		volumeLoading = true;
		volumeError = '';
		const seq = volumeSeq.begin();
		try {
			const res = await fetch(
				`/workout/volume?${periodQueryParams(volumeMode, volumeYear, volumeMonth)}`
			);
			if (!res.ok) {
				if (volumeSeq.isLatest(seq)) volumeError = 'ボリュームデータの取得に失敗しました';
				return;
			}
			if (volumeSeq.isLatest(seq)) volumeData = await res.json();
		} catch {
			if (volumeSeq.isLatest(seq)) volumeError = '通信エラーが発生しました';
		} finally {
			if (volumeSeq.isLatest(seq)) volumeLoading = false;
		}
	}

	function handleVolumeToggleMode() {
		volumeMode = volumeMode === 'year' ? 'month' : 'year';
		void fetchVolumeData();
	}

	onMount(() => void fetchVolumeData());

	function yearOptions(): { value: string; label: string }[] {
		const cur = new Date().getFullYear();
		return Array.from({ length: 5 }, (_, i) => {
			const y = String(cur - i);
			return { value: y, label: `${y}年` };
		});
	}

	const YEAR_OPTIONS = yearOptions();
	const MONTHS = Array.from({ length: 12 }, (_, i) => ({
		value: String(i + 1).padStart(2, '0'),
		label: `${i + 1}月`
	}));
</script>

{#snippet exerciseOptions()}
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
{/snippet}

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

	<BodyWeightSection
		{todayBodyWeight}
		{today}
		bind:date={bodyWeightDate}
		bind:input={bodyWeightInput}
		error={bodyWeightError}
		loading={bodyWeightLoading}
		onSubmit={() => void handleBodyWeightSubmit()}
	/>

	<RecordForm
		{exercises}
		bind:date={formDate}
		bind:exerciseId={formExerciseId}
		bind:weight={formWeight}
		bind:reps={formReps}
		bind:isBodyWeight={formIsBodyWeight}
		{bestRecord}
		error={formError}
		loading={formLoading}
		onSubmit={() => void handleAddRecord()}
		{exerciseOptions}
	/>

	<RecordList
		{records}
		{filterExerciseId}
		{exerciseOptions}
		onFilterChange={(e) => void handleFilterChange(e)}
		onDeleteRequest={(record) => (deletingRecord = record)}
	/>

	{#if exercises.items.length > 0}
		<WeightChartSection
			{exerciseOptions}
			bind:exerciseId={chartExerciseId}
			mode={chartMode}
			bind:year={chartYear}
			bind:month={chartMonth}
			yearOptions={YEAR_OPTIONS}
			months={MONTHS}
			data={chartData}
			loading={chartLoading}
			error={chartError}
			onToggleMode={handleChartToggleMode}
			onPeriodChange={() => void fetchChartData()}
		/>

		<VolumeChartSection
			mode={volumeMode}
			bind:year={volumeYear}
			bind:month={volumeMonth}
			yearOptions={YEAR_OPTIONS}
			months={MONTHS}
			data={volumeData}
			loading={volumeLoading}
			error={volumeError}
			onToggleMode={handleVolumeToggleMode}
			onPeriodChange={() => void fetchVolumeData()}
		/>
	{/if}
</div>

<ConfirmDialog
	open={deletingRecord !== null}
	title="記録を削除しますか？"
	description={deletingRecord
		? `${deletingRecord.date} ${deletingRecord.exerciseName} ${deletingRecord.isBodyWeight ? '自重 ' : ''}${deletingRecord.weight}kg × ${deletingRecord.reps}回 を削除します。`
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
