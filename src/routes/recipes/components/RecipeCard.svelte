<!--
  @file コンポーネント: RecipeCard
  @module src/routes/recipes/components/RecipeCard.svelte
  @feature recipes

  @description
  レシピ一覧で表示するカードコンポーネント。
  画像・レシピ名・難易度バッジ・評価バッジ・調理回数・最終調理日を表示し、
  クリックで詳細画面へ遷移する。

  @props
  - recipe: Recipe - 表示するレシピデータ
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { UtensilsCrossed } from '@lucide/svelte';

	interface Recipe {
		id: string;
		name: string;
		imageUrl: string | null;
		difficulty: string | null;
		rating: string | null;
		cookedCount: number;
		lastCookedAt: Date | null;
	}

	let { recipe }: { recipe: Recipe } = $props();

	const DIFFICULTY_LABEL: Record<string, string> = {
		easy: '簡単',
		medium: '普通',
		hard: '難しい'
	};

	const RATING_LABEL: Record<string, string> = {
		excellent: '非常に美味しい',
		good: '美味しい',
		average: '普通',
		poor: '微妙'
	};

	const RATING_CLASS: Record<string, string> = {
		excellent: 'bg-success/20 text-success',
		good: 'bg-success/10 text-success',
		average: 'bg-bg-grouped text-secondary',
		poor: 'bg-bg-grouped text-secondary'
	};

	function formatDate(date: Date | null | string): string {
		if (!date) return '未調理';
		const d = new Date(date);
		return isNaN(d.getTime())
			? '未調理'
			: d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
	}
</script>

<article
	onclick={() => void goto(`/recipes/${recipe.id}`)}
	onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && void goto(`/recipes/${recipe.id}`)}
	tabindex="0"
	role="button"
	class="cursor-pointer overflow-hidden rounded-3xl bg-bg-card shadow-md transition-shadow hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
</article>
