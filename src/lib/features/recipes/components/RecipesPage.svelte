<!--
  @file コンポーネント: RecipesPage
  @module src/lib/features/recipes/components/RecipesPage.svelte
  @feature recipes

  @description
  レシピ一覧ページのUIロジック全体を担うコンポーネント。
  ソート切り替え・新規登録ダイアログ・AI 献立相談ウィジェットを提供する。

  @props
  - items: Recipe[] - レシピ一覧
-->
<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { ChefHat, LoaderCircle, MessageCircle, Plus, Send } from '@lucide/svelte';
	import RecipeCard from './RecipeCard.svelte';
	import RecipeFormDialog from './RecipeFormDialog.svelte';
	import Input from '$lib/components/Input.svelte';
	import Button from '$lib/components/Button.svelte';
	import Select from '$lib/components/Select.svelte';
	import type { Recipe } from '../types';

	let {
		items
	}: {
		items: Recipe[];
	} = $props();

	let showCreateDialog = $state(false);
	let askQuestion = $state('');
	let askAnswer = $state<string | null>(null);
	let isAskLoading = $state(false);
	let askError = $state('');

	let currentSort = $derived(page.url.searchParams.get('sort') ?? 'createdAt_desc');

	function handleSortChange(e: Event) {
		const sort = (e.target as HTMLSelectElement).value;
		void goto(`?sort=${sort}`, { keepFocus: true, replaceState: true });
	}

	async function handleAsk() {
		if (!askQuestion.trim()) {
			askError = '質問を入力してください';
			return;
		}
		isAskLoading = true;
		askAnswer = null;
		askError = '';
		try {
			const res = await fetch('/recipes/ask', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ question: askQuestion })
			});
			const json = await res.json();
			if (!res.ok) {
				askError = (json as { message?: string }).message ?? 'エラーが発生しました';
				return;
			}
			askAnswer = (json as { answer: string }).answer;
		} catch {
			askError = 'エラーが発生しました';
		} finally {
			isAskLoading = false;
		}
	}

	async function handleCreateSuccess() {
		showCreateDialog = false;
		await invalidateAll();
	}
</script>

<div class="mx-auto max-w-6xl">
	<div class="mb-6 flex items-center gap-3">
		<ChefHat size={28} class="text-accent" />
		<h1 class="flex-1 text-2xl font-medium text-label">レシピ</h1>
		<Button
			data-testid="recipes-create-button"
			onclick={() => (showCreateDialog = true)}
			variant="primary"
			size="md"
		>
			<Plus size={18} />
			登録
		</Button>
	</div>

	<div class="mb-8 rounded-3xl bg-bg-secondary p-6 shadow-md">
		<div class="mb-3 flex items-center gap-2">
			<MessageCircle size={20} class="text-accent" />
			<h2 class="font-medium text-label">AI 献立相談</h2>
		</div>
		<div class="flex gap-2">
			<Input
				data-testid="recipes-ask-input"
				type="text"
				bind:value={askQuestion}
				placeholder="例: 最近作ってないもので肉系が食べたいんだけど..."
				onkeydown={(e) => e.key === 'Enter' && !isAskLoading && void handleAsk()}
				size="md"
				class="min-w-0 flex-1"
			/>
			<Button
				data-testid="recipes-ask-button"
				onclick={() => void handleAsk()}
				disabled={isAskLoading}
				variant="primary"
				size="md"
				class="shrink-0"
			>
				{#if isAskLoading}
					<LoaderCircle size={16} class="animate-spin" />
				{:else}
					<Send size={16} />
				{/if}
				<span class="hidden sm:inline">{isAskLoading ? '相談中...' : '送信'}</span>
			</Button>
		</div>
		{#if askError}
			<p class="mt-2 text-sm text-destructive">{askError}</p>
		{/if}
		{#if askAnswer}
			<div
				data-testid="recipes-ask-answer"
				class="mt-4 rounded-2xl bg-bg p-4 text-sm leading-relaxed text-label"
			>
				{askAnswer}
			</div>
		{/if}
	</div>

	<div class="mb-4 flex justify-end">
		<Select
			data-testid="recipes-sort-select"
			value={currentSort}
			onchange={handleSortChange}
			size="md"
		>
			<option value="createdAt_desc">登録順</option>
			<option value="lastCookedAt_asc">しばらく作ってない順</option>
			<option value="cookedCount_desc">よく作る順</option>
			<option value="rating_desc">評価が高い順</option>
		</Select>
	</div>

	{#if items.length === 0}
		<p data-testid="recipes-empty" class="py-16 text-center text-secondary">
			まだレシピがありません。「登録」ボタンから追加してみましょう！
		</p>
	{:else}
		<ul data-testid="recipes-list" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each items as recipe (recipe.id)}
				<li>
					<RecipeCard {recipe} />
				</li>
			{/each}
		</ul>
	{/if}
</div>

<RecipeFormDialog
	open={showCreateDialog}
	mode="create"
	onSuccess={handleCreateSuccess}
	onClose={() => (showCreateDialog = false)}
/>
