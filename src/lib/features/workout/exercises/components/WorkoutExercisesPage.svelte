<!--
  @file コンポーネント: WorkoutExercisesPage
  @module src/lib/features/workout/exercises/components/WorkoutExercisesPage.svelte
  @feature workout/exercises

  @description
  筋トレ種目の一覧表示・追加・編集・削除、および種目カテゴリの管理を行う画面コンポーネント。
  role === 'main' のユーザーのみアクセス可能。
  カテゴリ管理・種目管理はそれぞれ独立度の高い機能のため
  `CategoryManagementCard` / `ExerciseListCard` に分割し、このコンポーネントは
  ページヘッダーと各カードへのデータ受け渡しのみを担う。

  @props
  - exercises: { items: ExerciseWithCategory[] } - 種目一覧（カテゴリ情報含む）
  - categories: Category[] - カテゴリ一覧
-->
<script lang="ts">
	import { Dumbbell, ArrowLeft } from '@lucide/svelte';
	import CategoryManagementCard from './CategoryManagementCard.svelte';
	import ExerciseListCard from './ExerciseListCard.svelte';
	import type { Category, ExerciseWithCategory } from '../types';

	let {
		exercises,
		categories
	}: {
		exercises: { items: ExerciseWithCategory[] };
		categories: Category[];
	} = $props();
</script>

<div class="mx-auto max-w-lg">
	<div class="mb-6 flex items-center gap-3">
		<a
			href="/workout"
			class="rounded-2xl border border-separator p-2 text-secondary hover:text-label"
			aria-label="筋トレ記録に戻る"
		>
			<ArrowLeft size={18} />
		</a>
		<Dumbbell size={24} class="text-accent" />
		<h1 class="flex-1 text-2xl font-medium text-label">種目管理</h1>
	</div>

	<CategoryManagementCard {categories} />
	<ExerciseListCard {exercises} {categories} />
</div>
