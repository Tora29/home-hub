<!--
  @file 画面: 筋トレ記録
  @module src/routes/workout/+page.svelte
  @feature workout

  @description
  筋トレ記録画面。

  @navigation
  - 遷移先: /workout/exercises - 種目管理画面

  @api
  - GET /workout（SSR load） - 記録一覧・種目一覧取得
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
/>
