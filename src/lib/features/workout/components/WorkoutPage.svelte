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
  コンポーネントに渡す。グラフ・ボリュームの取得は fetchSeq で最新リクエストのみ反映し、
  年間/月間トグルは取得失敗時のみ元の期間に戻す。
  画面右下には RestTimer（90秒インターバルタイマー、状態自己完結）を常時表示する。

  @props
  - records: WorkoutRecord[] - 記録一覧
  - exercises: { items: Exercise[] } - 種目一覧
  - filterExerciseId: string | null - フィルタ中の種目ID
  - todayBodyWeight: number | null - 本日記録済みの体重（null = 未記録）
  - today: string - サーバー（JST）計算の本日日付（YYYY-MM-DD）。フォーム初期値・期間の初期値に使う
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
	import RestTimer from './RestTimer.svelte';
	import type { ChartData, Exercise, WeeklyVolumePoint, WorkoutRecord } from '../types';

	let {
		records,
		exercises,
		filterExerciseId,
		todayBodyWeight,
		today
	}: {
		records: WorkoutRecord[];
		exercises: { items: Exercise[] };
		filterExerciseId: string | null;
		todayBodyWeight: number | null;
		today: string;
	} = $props();

	// 期間セレクトの初期値・年の選択肢はマウント時の today（サーバー計算）から決める
	const [currentYear, currentMonthNum] = untrack(() => today).split('-');

	type FetchResult = 'ok' | 'stale' | 'error';
	type PeriodMode = 'month' | 'year';

	/**
	 * 期間モード（月間/年間）に応じたクエリパラメータを生成する。
	 * chart・volume の両エンドポイントで共通利用する。
	 */
	function periodParams(mode: PeriodMode, year: string, month: string): Record<string, string> {
		return mode === 'month'
			? { period: '1m', month: `${year}-${month}` }
			: { period: 'year', month: `${year}-01` };
	}

	/** !res.ok のレスポンスからエラーメッセージを取り出す（JSON 以外はフォールバック）。 */
	async function readErrorMessage(res: Response, fallback: string): Promise<string> {
		const err = (await res.json().catch(() => ({}))) as { message?: string };
		return err.message ?? fallback;
	}

	// --- 体重記録 ---
	let bodyWeightDate = $state(untrack(() => today));
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
				bodyWeightError = await readErrorMessage(res, 'エラーが発生しました');
				return;
			}
			bodyWeightInput = '';
			await invalidateAll();
			await fetchChartData();
		} catch {
			bodyWeightError = '通信エラーが発生しました';
		} finally {
			bodyWeightLoading = false;
		}
	}

	// --- セット記録フォーム ---
	let formDate = $state(untrack(() => today));
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
				formError = await readErrorMessage(res, 'エラーが発生しました');
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
		const query = new URLSearchParams(select.value ? { exerciseId: select.value } : {}).toString();
		await goto(query ? `/workout?${query}` : '/workout', {
			keepFocus: true,
			replaceState: true,
			noScroll: true
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
				deleteError = await readErrorMessage(res, 'エラーが発生しました');
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
	let chartMode = $state<PeriodMode>('month');
	let chartYear = $state(currentYear);
	let chartMonth = $state(currentMonthNum);
	let chartData = $state<ChartData | null>(null);
	let chartLoading = $state(false);
	let chartError = $state('');
	let chartSeq = 0; // 最新リクエスト判定用（リアクティブ不要）

	async function fetchChartData(): Promise<FetchResult> {
		if (!chartExerciseId) return 'ok';
		const seq = ++chartSeq;
		chartLoading = true;
		chartError = '';
		try {
			const params = new URLSearchParams({
				exerciseId: chartExerciseId,
				...periodParams(chartMode, chartYear, chartMonth)
			});
			const res = await fetch(`/workout/chart?${params}`);
			if (seq !== chartSeq) return 'stale';
			if (!res.ok) {
				const message = await readErrorMessage(res, 'グラフデータの取得に失敗しました');
				if (seq !== chartSeq) return 'stale';
				chartError = message;
				return 'error';
			}
			const json = (await res.json()) as ChartData;
			if (seq !== chartSeq) return 'stale'; // json() 待ちの間に追い越された場合
			chartData = json;
			return 'ok';
		} catch {
			if (seq !== chartSeq) return 'stale';
			chartError = '通信エラーが発生しました';
			return 'error';
		} finally {
			if (seq === chartSeq) chartLoading = false;
		}
	}

	async function handleChartToggleMode() {
		const prev = chartMode;
		chartMode = prev === 'year' ? 'month' : 'year';
		const result = await fetchChartData();
		if (result === 'error') chartMode = prev; // 失敗時のみロールバック
	}

	// --- 週間ボリューム ---
	let volumeMode = $state<PeriodMode>('month');
	let volumeYear = $state(currentYear);
	let volumeMonth = $state(currentMonthNum);
	let volumeData = $state<WeeklyVolumePoint[]>([]);
	let volumeLoading = $state(false);
	let volumeError = $state('');
	let volumeSeq = 0; // 最新リクエスト判定用（リアクティブ不要）

	async function fetchVolumeData(): Promise<FetchResult> {
		const seq = ++volumeSeq;
		volumeLoading = true;
		volumeError = '';
		try {
			const params = new URLSearchParams(periodParams(volumeMode, volumeYear, volumeMonth));
			const res = await fetch(`/workout/volume?${params}`);
			if (seq !== volumeSeq) return 'stale';
			if (!res.ok) {
				const message = await readErrorMessage(res, 'ボリュームデータの取得に失敗しました');
				if (seq !== volumeSeq) return 'stale';
				volumeError = message;
				return 'error';
			}
			const json = (await res.json()) as WeeklyVolumePoint[];
			if (seq !== volumeSeq) return 'stale'; // json() 待ちの間に追い越された場合
			volumeData = json;
			return 'ok';
		} catch {
			if (seq !== volumeSeq) return 'stale';
			volumeError = '通信エラーが発生しました';
			return 'error';
		} finally {
			if (seq === volumeSeq) volumeLoading = false;
		}
	}

	async function handleVolumeToggleMode() {
		const prev = volumeMode;
		volumeMode = prev === 'year' ? 'month' : 'year';
		const result = await fetchVolumeData();
		if (result === 'error') volumeMode = prev; // 失敗時のみロールバック
	}

	onMount(() => {
		void fetchChartData();
		void fetchVolumeData();
	});

	const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
		const y = String(Number(currentYear) - i);
		return { value: y, label: `${y}年` };
	});
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
		<h1 data-testid="workout-page-title" class="flex-1 text-2xl font-medium text-label">
			筋トレ記録
		</h1>
		<a
			data-testid="workout-exercises-link"
			href="/workout/exercises"
			class="inline-flex items-center gap-1.5 rounded-2xl border border-separator px-3 py-2 text-sm text-secondary hover:text-label"
		>
			<ListChecks size={14} aria-hidden="true" />
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
			onToggleMode={() => void handleChartToggleMode()}
			onExerciseChange={() => void fetchChartData()}
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
			onToggleMode={() => void handleVolumeToggleMode()}
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
	data-testid="workout-record-delete-dialog"
	confirmTestid="workout-record-delete-confirm-button"
	onConfirm={() => void handleDeleteConfirm()}
	onCancel={() => {
		deletingRecord = null;
		deleteError = '';
	}}
/>

<RestTimer />
