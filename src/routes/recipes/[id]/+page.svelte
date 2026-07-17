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
	import RecipeFormDialog from '$recipes/components/RecipeFormDialog.svelte';
	import Button from '$lib/components/Button.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { DIFFICULTY_LABEL, RATING_LABEL, formatDate } from '$recipes/labels';

	let { data } = $props();

	let showEditDialog = $state(false);
	let showDeleteDialog = $state(false);
	let isDeleting = $state(false);
	let deleteError = $state('');

	async function handleEditSuccess() {
		showEditDialog = false;
		await invalidateAll();
	}

	async function handleDelete() {
		isDeleting = true;
		deleteError = '';
		try {
			const res = await fetch(`/recipes/${data.recipe.id}`, { method: 'DELETE' });
			if (!res.ok) {
				const err = (await res.json()) as { message?: string };
				deleteError = err.message ?? '削除に失敗しました';
				return;
			}
			await goto('/recipes');
		} catch {
			deleteError = '通信エラーが発生しました';
		} finally {
			isDeleting = false;
		}
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
			<Button
				onclick={() => (showEditDialog = true)}
				aria-label="編集"
				variant="secondary"
				size="md"
			>
				<Pencil size={16} />
				編集
			</Button>
			<Button
				data-testid="recipes-delete-button"
				onclick={() => (showDeleteDialog = true)}
				aria-label="削除"
				variant="ghost-destructive"
				size="md"
			>
				<Trash2 size={16} />
				削除
			</Button>
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
			<span
				class="flex items-center gap-1 rounded-full bg-bg-secondary px-3 py-1 text-sm text-secondary"
			>
				<Users size={14} />
				{data.recipe.servings} 人前
			</span>
		{/if}
		{#if data.recipe.cookingTimeMinutes}
			<span
				class="flex items-center gap-1 rounded-full bg-bg-secondary px-3 py-1 text-sm text-secondary"
			>
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
				{#each data.recipe.ingredients as ingredient (ingredient.name)}
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
				{#each data.recipe.steps as step, i (i)}
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
		<span
			>最終調理日: <strong class="text-label">{formatDate(data.recipe.lastCookedAt, 'long')}</strong
			></span
		>
	</div>
</div>

<!-- Edit dialog -->
<RecipeFormDialog
	open={showEditDialog}
	mode="edit"
	recipe={data.recipe}
	onSuccess={handleEditSuccess}
	onClose={() => (showEditDialog = false)}
/>

<!-- Delete confirmation dialog -->
<ConfirmDialog
	open={showDeleteDialog}
	title="レシピを削除"
	description={`「${data.recipe.name}」を削除しますか？この操作は元に戻せません。`}
	confirmLabel="削除する"
	confirmVariant="destructive"
	loading={isDeleting}
	error={deleteError}
	data-testid="recipes-delete-dialog"
	confirmTestid="recipes-delete-confirm-button"
	onConfirm={() => void handleDelete()}
	onCancel={() => {
		showDeleteDialog = false;
		deleteError = '';
	}}
/>
