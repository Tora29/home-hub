<!--
  @file コンポーネント: RecordForm テスト用ラッパー
  @module src/lib/features/workout/components/RecordForm.test-wrapper.svelte
  @feature workout

  @description
  RecordForm の bindable props（日付・種目・重量・回数・自重）を親側 state で保持し、
  output に表示して双方向バインドを検証するためのテスト専用ラッパー。

  @props
  - exercises: { items: Exercise[] } - 種目一覧
  - initialIsBodyWeight: boolean - 自重フラグの初期値
  - initialWeight: number | null - 重量の初期値
  - bestRecord: { weight: number; reps: number } | null - 過去MAX
  - prevSessionRecord: { date: string; weight: number; reps: number } | null - 前回トレーニング日のMAX
  - error: string - エラーメッセージ
  - loading: boolean - 送信中フラグ
  - onSubmit: () => void - 追加ボタン押下時のコールバック
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import RecordForm from './RecordForm.svelte';
	import type { Exercise } from '../types';

	let {
		exercises,
		initialIsBodyWeight = false,
		initialWeight = null,
		bestRecord = null,
		prevSessionRecord = null,
		error = '',
		loading = false,
		onSubmit = () => {}
	}: {
		exercises: { items: Exercise[] };
		initialIsBodyWeight?: boolean;
		initialWeight?: number | null;
		bestRecord?: { weight: number; reps: number } | null;
		prevSessionRecord?: { date: string; weight: number; reps: number } | null;
		error?: string;
		loading?: boolean;
		onSubmit?: () => void;
	} = $props();

	let date = $state('2026-09-27');
	let exerciseId = $state('');
	let weight = $state(untrack(() => initialWeight));
	let reps = $state('8');
	let isBodyWeight = $state(untrack(() => initialIsBodyWeight));
</script>

{#snippet exerciseOptions()}
	{#each exercises.items as ex (ex.id)}
		<option value={ex.id}>{ex.name}</option>
	{/each}
{/snippet}

<RecordForm
	{exercises}
	bind:date
	bind:exerciseId
	bind:weight
	bind:reps
	bind:isBodyWeight
	{bestRecord}
	{prevSessionRecord}
	{error}
	{loading}
	{onSubmit}
	{exerciseOptions}
/>
<output data-testid="parent-exercise-id">{exerciseId}</output>
<output data-testid="parent-weight">{weight ?? ''}</output>
<output data-testid="parent-reps">{reps}</output>
<output data-testid="parent-is-body-weight">{String(isBodyWeight)}</output>
