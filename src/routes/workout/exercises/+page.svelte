<!--
  @file 画面: 種目管理
  @module src/routes/workout/exercises/+page.svelte
  @feature workout

  @description
  筋トレ種目・種目カテゴリの管理画面（一覧・追加・編集・削除）。
  role === 'main' のユーザーのみアクセス可能（それ以外は 403）。

  @navigation
  - 遷移元: /workout - 筋トレ記録画面（種目管理リンク）
  - 遷移先: /workout - 筋トレ記録画面（戻るリンク）

  @api
  - SSR load: service 直呼び（getExercises / getExerciseCategories）→ 種目一覧・カテゴリ一覧
  - POST /workout/exercises/categories → 201 ExerciseCategory - カテゴリ登録
  - PUT /workout/exercises/categories/[id] → 200 ExerciseCategory - カテゴリ更新
  - DELETE /workout/exercises/categories/[id] → 204 - カテゴリ削除
  - POST /workout/exercises → 201 ExerciseWithCategory - 種目登録
  - PUT /workout/exercises/[id] → 200 ExerciseWithCategory - 種目更新
  - DELETE /workout/exercises/[id] → 204 - 種目削除（記録が紐付く場合 409）
  - 各 API 共通: 403(FORBIDDEN) - role !== 'main'
-->
<script lang="ts">
	import WorkoutExercisesPage from '$lib/features/workout/exercises/components/WorkoutExercisesPage.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<WorkoutExercisesPage exercises={data.exercises} categories={data.categories} />
