<!--
  @file 画面: 種目管理
  @module src/routes/workout/exercises/+page.svelte
  @feature workout-exercises

  @description
  筋トレ種目管理画面。

  @navigation
  - 遷移元: /workout - 筋トレ記録画面

  @api
  - GET /workout/exercises（SSR load） - 種目一覧取得
-->
<script lang="ts">
	import WorkoutExercisesPage from '$lib/features/workout/exercises/components/WorkoutExercisesPage.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<WorkoutExercisesPage exercises={data.exercises} categories={data.categories} />
