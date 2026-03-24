<!--
  @file 画面: レシピ詳細
  @module src/routes/recipes/[id]/+page.svelte
  @feature recipes

  @description
  レシピの詳細情報を表示する画面。材料・手順・メモ・各種バッジを表示し、
  編集ダイアログ・削除確認ダイアログを提供する。

  @spec specs/recipes/spec.md
  @acceptance AC-003, AC-004, AC-005

  @navigation
  - 遷移元: /recipes - レシピ一覧
  - 遷移先: /recipes - 削除完了後

  @api
  - PUT /recipes/[id] → 200 Dish - レシピ更新
  - DELETE /recipes/[id] → 204 - レシピ削除
-->
<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import {
		ArrowLeft,
		Clock,
		ExternalLink,
		Pencil,
		Trash2,
		UtensilsCrossed,
		Users
	} from '@lucide/svelte';
	import RecipeForm from '../components/RecipeForm.svelte';

	let { data } = $props();

	let showEditDialog = $state(false);
	let showDeleteDialog = $state(false);
	let isDeleting = $state(false);
	let deleteDialogEl = $state<HTMLDialogElement | undefined>();

	$effect(() => {
		if (showDeleteDialog && deleteDialogEl) {
			deleteDialogEl.showModal();
		}
	});

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

	function formatDate(date: Date | null | string): string {
		if (!date) return '未調理';
		const d = new Date(date);
		return isNaN(d.getTime())
			? '未調理'
			: d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
	}

	async function handleEditSuccess() {
		showEditDialog = false;
		await invalidateAll();
	}

	async function handleDelete() {
		isDeleting = true;
		try {
			const res = await fetch(`/recipes/${data.recipe.id}`, { method: 'DELETE' });
			if (!res.ok) return;
			deleteDialogEl?.close();
			await goto('/recipes');
		} finally {
			isDeleting = false;
		}
	}

	function openDeleteDialog() {
		showDeleteDialog = true;
	}
</script>

<div class="mx-auto max-w-2xl">
	<!-- Back navigation -->
	<a
		href="/recipes"
		class="mb-6 flex items-center gap-2 text-sm text-secondary transition-colors hover:text-label"
	>
		<ArrowLeft size={16} />
		一覧に戻る
	</a>

	<!-- Hero image -->
	{#if data.recipe.imageUrl}
		<img
			src={data.recipe.imageUrl}
			alt={data.recipe.name}
			class="mb-6 h-64 w-full rounded-3xl object-cover shadow-md"
		/>
	{/if}

	<!-- Header: name + action buttons -->
	<div class="mb-4 flex items-start gap-4">
		<h1 class="flex-1 text-2xl font-medium text-label">{data.recipe.name}</h1>
		<div class="flex gap-2">
			<button
				onclick={() => (showEditDialog = true)}
				aria-label="編集"
				class="flex items-center gap-2 rounded-2xl border border-separator px-4 py-2 text-sm font-medium text-secondary transition-colors hover:text-label"
			>
				<Pencil size={16} />
				編集
			</button>
			<button
				data-testid="recipes-delete-button"
				onclick={openDeleteDialog}
				aria-label="削除"
				class="flex items-center gap-2 rounded-2xl bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-opacity hover:opacity-80"
			>
				<Trash2 size={16} />
				削除
			</button>
		</div>
	</div>

	<!-- Badges -->
	<div class="mb-6 flex flex-wrap gap-2">
		{#if data.recipe.difficulty}
			<span class="rounded-full bg-bg-secondary px-3 py-1 text-sm text-secondary">
				{DIFFICULTY_LABEL[data.recipe.difficulty] ?? data.recipe.difficulty}
			</span>
		{/if}
		{#if data.recipe.rating}
			<span class="rounded-full bg-bg-secondary px-3 py-1 text-sm text-secondary">
				{RATING_LABEL[data.recipe.rating] ?? data.recipe.rating}
			</span>
		{/if}
		{#if data.recipe.servings}
			<span class="flex items-center gap-1 rounded-full bg-bg-secondary px-3 py-1 text-sm text-secondary">
				<Users size={14} />
				{data.recipe.servings} 人前
			</span>
		{/if}
		{#if data.recipe.cookingTimeMinutes}
			<span class="flex items-center gap-1 rounded-full bg-bg-secondary px-3 py-1 text-sm text-secondary">
				<Clock size={14} />
				{data.recipe.cookingTimeMinutes} 分
			</span>
		{/if}
	</div>

	<!-- Description -->
	{#if data.recipe.description}
		<p class="mb-6 leading-relaxed text-secondary">{data.recipe.description}</p>
	{/if}

	<!-- Ingredients -->
	{#if data.recipe.ingredients && data.recipe.ingredients.length > 0}
		<section class="mb-6 rounded-3xl bg-bg-secondary p-6">
			<h2 class="mb-4 flex items-center gap-2 font-medium text-label">
				<UtensilsCrossed size={18} class="text-accent" />
				材料
			</h2>
			<ul class="flex flex-col gap-2">
				{#each data.recipe.ingredients as ingredient}
					<li class="flex items-baseline justify-between text-sm">
						<span class="text-label">{ingredient.name}</span>
						{#if ingredient.amount}
							<span class="text-secondary">{ingredient.amount}</span>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- Steps -->
	{#if data.recipe.steps && data.recipe.steps.length > 0}
		<section class="mb-6">
			<h2 class="mb-4 font-medium text-label">手順</h2>
			<ol class="flex flex-col gap-4">
				{#each data.recipe.steps as step, i}
					<li class="flex gap-4">
						<span
							class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-medium text-accent"
						>
							{i + 1}
						</span>
						<p class="flex-1 pt-1 text-sm leading-relaxed text-label">{step}</p>
					</li>
				{/each}
			</ol>
		</section>
	{/if}

	<!-- Memo -->
	{#if data.recipe.memo}
		<section class="mb-6 rounded-3xl bg-bg-secondary p-6">
			<h2 class="mb-2 font-medium text-label">メモ</h2>
			<p class="text-sm leading-relaxed text-secondary">{data.recipe.memo}</p>
		</section>
	{/if}

	<!-- Source URL -->
	{#if data.recipe.sourceUrl}
		<div class="mb-6">
			<a
				href={data.recipe.sourceUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="flex items-center gap-2 text-sm text-accent hover:underline"
			>
				<ExternalLink size={14} />
				参照元レシピを見る
			</a>
		</div>
	{/if}

	<!-- Stats -->
	<div class="flex gap-6 rounded-3xl bg-bg-secondary p-4 text-sm text-secondary">
		<span>作った回数: <strong class="text-label">{data.recipe.cookedCount} 回</strong></span>
		<span>最終調理日: <strong class="text-label">{formatDate(data.recipe.lastCookedAt)}</strong></span>
	</div>
</div>

<!-- Edit dialog -->
{#if showEditDialog}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		role="dialog"
		aria-modal="true"
		aria-label="レシピ編集"
		class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
		onclick={(e) => e.target === e.currentTarget && (showEditDialog = false)}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div
			class="w-full max-w-2xl rounded-3xl bg-bg-card shadow-md"
			onclick={(e) => e.stopPropagation()}
		>
			<RecipeForm
				mode="edit"
				recipe={data.recipe}
				onSuccess={handleEditSuccess}
				onCancel={() => (showEditDialog = false)}
			/>
		</div>
	</div>
{/if}

<!-- Delete confirmation dialog -->
<dialog
	bind:this={deleteDialogEl}
	data-testid="recipes-delete-dialog"
	role="alertdialog"
	aria-modal="true"
	aria-labelledby="delete-dialog-title"
	aria-describedby="delete-dialog-desc"
	onclose={() => (showDeleteDialog = false)}
	class="w-full max-w-sm rounded-3xl bg-bg-card p-6 shadow-md backdrop:bg-black/40"
>
	<h2 id="delete-dialog-title" class="mb-2 text-lg font-medium text-label">レシピを削除</h2>
	<p id="delete-dialog-desc" class="mb-6 text-sm text-secondary">
		「{data.recipe.name}」を削除しますか？この操作は元に戻せません。
	</p>
	<div class="flex justify-end gap-3">
		<button
			type="button"
			onclick={() => deleteDialogEl?.close()}
			class="rounded-2xl border border-separator px-5 py-2.5 text-sm font-medium text-secondary transition-colors hover:text-label"
		>
			キャンセル
		</button>
		<button
			type="button"
			data-testid="recipes-delete-confirm-button"
			onclick={() => void handleDelete()}
			disabled={isDeleting}
			class="rounded-2xl bg-destructive px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
		>
			{isDeleting ? '削除中...' : '削除する'}
		</button>
	</div>
</dialog>
