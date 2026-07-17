<!--
  @file コンポーネント: RecipeCard
  @module src/lib/features/recipes/components/RecipeCard.svelte
  @feature recipes

  @description
  レシピ一覧で表示するカードコンポーネント。
  画像・レシピ名・難易度バッジ・評価バッジ・調理回数・最終調理日を表示し、
  クリックで詳細画面へ遷移する。

  @props
  - recipe: Recipe - 表示するレシピデータ
-->
<script lang="ts">
	import { UtensilsCrossed } from '@lucide/svelte';
	import { DIFFICULTY_LABEL, RATING_LABEL, formatDate } from '../labels';
	import type { Recipe } from '../types';

	let { recipe }: { recipe: Recipe } = $props();

	const RATING_CLASS: Record<string, string> = {
		excellent: 'bg-success/20 text-success',
		good: 'bg-success/10 text-success',
		average: 'bg-bg-grouped text-secondary',
		poor: 'bg-bg-grouped text-secondary'
	};
</script>

<a
	href="/recipes/{recipe.id}"
	data-testid="recipes-item"
	class="block overflow-hidden rounded-3xl bg-bg-card shadow-md transition-shadow hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
>
	<!-- Image -->
	{#if recipe.imageUrl}
		<img src={recipe.imageUrl} alt={recipe.name} class="h-44 w-full object-cover" />
	{:else}
		<div class="flex h-44 w-full items-center justify-center bg-bg-grouped">
			<UtensilsCrossed size={40} class="text-tertiary" />
		</div>
	{/if}

	<div class="p-5">
		<h2 class="mb-3 line-clamp-2 font-medium text-label">{recipe.name}</h2>

		<div class="mb-3 flex flex-wrap gap-2">
			{#if recipe.difficulty}
				<span class="rounded-full bg-bg-secondary px-2.5 py-0.5 text-xs text-secondary">
					{DIFFICULTY_LABEL[recipe.difficulty] ?? recipe.difficulty}
				</span>
			{/if}
			{#if recipe.rating}
				<span
					class="rounded-full px-2.5 py-0.5 text-xs {RATING_CLASS[recipe.rating] ??
						'bg-bg-grouped text-secondary'}"
				>
					{RATING_LABEL[recipe.rating] ?? recipe.rating}
				</span>
			{/if}
		</div>

		<div class="flex items-center justify-between text-xs text-secondary">
			<span>{recipe.cookedCount} 回</span>
			<span>{formatDate(recipe.lastCookedAt)}</span>
		</div>
	</div>
</a>
