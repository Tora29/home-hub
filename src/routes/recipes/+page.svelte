<!--
  @file 画面: レシピ一覧
  @module src/routes/recipes/+page.svelte
  @feature recipes

  @description
  登録済みレシピをカード形式で表示する一覧画面。
  ソート切り替え・新規登録ダイアログ・AI 献立相談ウィジェットを提供する。

  @spec specs/recipes/spec.md
  @acceptance AC-001, AC-002, AC-006, AC-008, AC-009, AC-010, AC-204

  @navigation
  - 遷移先: /recipes/[id] - レシピ詳細画面（カードクリック時）

  @api
  - GET /recipes → 200 DishList - 一覧取得（SSR load）
  - POST /recipes → 201 Dish - 新規作成
  - POST /recipes/ask → 200 AskResponse - AI 献立相談
  - POST /recipes/extract → 200 ExtractResponse - AI レシピ抽出
-->
<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { ChefHat, LoaderCircle, MessageCircle, Plus, Send } from '@lucide/svelte';
	import RecipeCard from './components/RecipeCard.svelte';
	import RecipeForm from './components/RecipeForm.svelte';
	import Input from '$lib/components/Input.svelte';
	import Button from '$lib/components/Button.svelte';
	import Select from '$lib/components/Select.svelte';

	let { data } = $props();

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
	<!-- Header -->
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

	<!-- AI consultation widget -->
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

	<!-- Sort control -->
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

	<!-- Recipe grid / empty state -->
	{#if data.items.length === 0}
		<p data-testid="recipes-empty" class="py-16 text-center text-secondary">
			まだレシピがありません。「登録」ボタンから追加してみましょう！
		</p>
	{:else}
		<ul data-testid="recipes-list" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.items as recipe (recipe.id)}
				<li>
					<RecipeCard {recipe} />
				</li>
			{/each}
		</ul>
	{/if}
</div>

<!-- Create dialog -->
{#if showCreateDialog}
	<div
		role="dialog"
		aria-modal="true"
		aria-label="レシピ登録"
		tabindex={-1}
		class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
		onclick={(e) => e.target === e.currentTarget && (showCreateDialog = false)}
		onkeydown={(e) => e.key === 'Escape' && (showCreateDialog = false)}
	>
		<div class="w-full max-w-2xl rounded-3xl bg-bg-card shadow-md">
			<RecipeForm
				mode="create"
				onSuccess={handleCreateSuccess}
				onCancel={() => (showCreateDialog = false)}
			/>
		</div>
	</div>
{/if}
