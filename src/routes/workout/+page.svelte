<!--
  @file 画面: 筋トレ記録
  @module src/routes/workout/+page.svelte
  @feature workout

  @description
  筋トレ記録画面。体重記録・セット記録・記録一覧（種目フィルタ）・重量推移グラフ・週間ボリュームを表示する。
  role === 'main' のユーザーのみアクセス可能（それ以外は 403）。

  @navigation
  - 遷移元: サイドバー - 筋トレメニュー
  - 遷移先: /workout/exercises - 種目管理画面
  - 遷移先: /workout?exerciseId={id} - 種目フィルタ（同一画面・replaceState）

  @api
  - SSR load: service 直呼び（getRecords / getExercises / getTodayBodyWeight）→ 記録一覧・種目一覧・本日の体重・本日の日付
  - POST /workout/body-weight → 200 { id, date, weight } - 体重登録（同日上書き）
  - POST /workout → 201 WorkoutRecord - セット記録登録
  - DELETE /workout/[id] → 204 - 記録削除
  - GET /workout/chart?exerciseId&period&month → 200 ChartData - 重量推移グラフ
  - GET /workout/volume?period&month → 200 WeeklyVolumePoint[] - 週間ボリューム
  - GET /workout/volume?weekStart → 200 WeeklyVolumeBreakdownItem[] - 週間ボリューム内訳
  - 各 API 共通: 403(FORBIDDEN) - role !== 'main'
-->
<script lang="ts">
	import WorkoutPage from '$lib/features/workout/components/WorkoutPage.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<WorkoutPage
	records={data.records}
	exercises={data.exercises}
	filterExerciseId={data.filterExerciseId}
	todayBodyWeight={data.todayBodyWeight}
	today={data.today}
/>
