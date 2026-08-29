<!--
  @file コンポーネント: CategoryManagementCard
  @module src/lib/features/workout/exercises/components/CategoryManagementCard.svelte
  @feature workout/exercises

  @description
  筋トレ種目カテゴリの一覧表示・追加・編集・削除を行うカード。
  追加/編集/削除ハンドラの共通処理は `form-helpers.ts` に委譲する。

  @props
  - categories: Category[] - カテゴリ一覧
-->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Pencil, Trash2, Check, X } from '@lucide/svelte';
	import Button from '$lib/components/Button.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Input from '$lib/components/Input.svelte';
	import { submitNamedForm, submitDelete } from './form-helpers';
	import type { Category } from '../types';

	let { categories }: { categories: Category[] } = $props();

	const MAX_NAME_LENGTH = 30;

	// --- カテゴリ追加 ---
	let newCategoryName = $state('');
	let newCategoryNameError = $state('');
	let isAddingCategory = $state(false);

	// --- カテゴリ編集 ---
	let editingCategoryId = $state<string | null>(null);
	let editingCategoryName = $state('');
	let editingCategoryNameError = $state('');
	let isSavingCategoryEdit = $state(false);

	// --- カテゴリ削除 ---
	let deletingCategory = $state<Category | null>(null);
	let isDeletingCategory = $state(false);
	let deleteCategoryError = $state('');

	async function handleAddCategory() {
		await submitNamedForm({
			name: newCategoryName,
			maxLength: MAX_NAME_LENGTH,
			requiredMessage: 'カテゴリ名は必須です',
			maxLengthMessage: `${MAX_NAME_LENGTH}文字以内で入力してください`,
			setError: (msg) => (newCategoryNameError = msg),
			setLoading: (loading) => (isAddingCategory = loading),
			request: () =>
				fetch('/workout/exercises/categories', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: newCategoryName.trim() })
				}),
			onSuccess: async () => {
				newCategoryName = '';
				await invalidateAll();
			}
		});
	}

	function startEditCategory(cat: Category) {
		editingCategoryId = cat.id;
		editingCategoryName = cat.name;
		editingCategoryNameError = '';
	}

	function cancelEditCategory() {
		editingCategoryId = null;
		editingCategoryName = '';
		editingCategoryNameError = '';
	}

	async function handleEditCategorySave(id: string) {
		await submitNamedForm({
			name: editingCategoryName,
			maxLength: MAX_NAME_LENGTH,
			requiredMessage: 'カテゴリ名は必須です',
			maxLengthMessage: `${MAX_NAME_LENGTH}文字以内で入力してください`,
			setError: (msg) => (editingCategoryNameError = msg),
			setLoading: (loading) => (isSavingCategoryEdit = loading),
			request: () =>
				fetch(`/workout/exercises/categories/${id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: editingCategoryName.trim() })
				}),
			onSuccess: async () => {
				editingCategoryId = null;
				await invalidateAll();
			}
		});
	}

	async function handleDeleteCategoryConfirm() {
		if (!deletingCategory) return;
		const target = deletingCategory;
		await submitDelete({
			setError: (msg) => (deleteCategoryError = msg),
			setLoading: (loading) => (isDeletingCategory = loading),
			request: () => fetch(`/workout/exercises/categories/${target.id}`, { method: 'DELETE' }),
			onSuccess: async () => {
				deletingCategory = null;
				await invalidateAll();
			}
		});
	}
</script>

<div class="mb-6 rounded-3xl bg-bg-card p-6 shadow-md">
	<h2 class="mb-4 text-sm font-medium text-secondary">カテゴリ管理</h2>

	{#if categories.length > 0}
		<ul data-testid="workout-category-list" class="mb-4 flex flex-col gap-2">
			{#each categories as cat (cat.id)}
				<li
					data-testid="workout-category-item"
					class="rounded-2xl border border-separator px-3 py-2"
				>
					{#if editingCategoryId === cat.id}
						<div class="flex items-start gap-2">
							<div class="min-w-0 flex-1">
								<Input
									data-testid="workout-category-edit-input"
									type="text"
									bind:value={editingCategoryName}
									maxlength={30}
									class="w-full"
									onkeydown={(e) => {
										if (e.key === 'Enter') void handleEditCategorySave(cat.id);
										if (e.key === 'Escape') cancelEditCategory();
									}}
								/>
								{#if editingCategoryNameError}
									<p class="mt-1 text-xs text-destructive">{editingCategoryNameError}</p>
								{/if}
							</div>
							<Button
								variant="primary"
								size="sm"
								onclick={() => void handleEditCategorySave(cat.id)}
								disabled={isSavingCategoryEdit}
								aria-label="保存"
								type="button"
							>
								<Check size={14} />
							</Button>
							<Button
								variant="secondary"
								size="sm"
								onclick={cancelEditCategory}
								aria-label="キャンセル"
								type="button"
							>
								<X size={14} />
							</Button>
						</div>
					{:else}
						<div class="flex items-center gap-2">
							<span class="flex-1 text-sm text-label">{cat.name}</span>
							<Button
								data-testid="workout-category-edit-button"
								variant="secondary"
								size="sm"
								onclick={() => startEditCategory(cat)}
								aria-label="編集"
								type="button"
							>
								<Pencil size={14} />
							</Button>
							<Button
								data-testid="workout-category-delete-button"
								variant="ghost-destructive"
								size="sm"
								onclick={() => (deletingCategory = cat)}
								aria-label="削除"
								type="button"
							>
								<Trash2 size={14} />
							</Button>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	<div class="flex items-start gap-2">
		<div class="min-w-0 flex-1">
			<Input
				data-testid="workout-category-name-input"
				type="text"
				bind:value={newCategoryName}
				placeholder="カテゴリ名（例: 胸）"
				maxlength={30}
				class="w-full"
				onkeydown={(e) => e.key === 'Enter' && !isAddingCategory && void handleAddCategory()}
			/>
			{#if newCategoryNameError}
				<p class="mt-1 text-xs text-destructive">{newCategoryNameError}</p>
			{/if}
		</div>
		<Button
			data-testid="workout-category-add-button"
			variant="primary"
			size="md"
			onclick={() => void handleAddCategory()}
			disabled={isAddingCategory}
			type="button"
		>
			追加
		</Button>
	</div>
</div>

<ConfirmDialog
	open={deletingCategory !== null}
	title="カテゴリを削除しますか？"
	description={deletingCategory
		? `「${deletingCategory.name}」を削除します。紐付く種目のカテゴリは未設定になります。`
		: ''}
	confirmLabel="削除する"
	confirmVariant="destructive"
	loading={isDeletingCategory}
	error={deleteCategoryError}
	data-testid="workout-category-delete-dialog"
	confirmTestid="workout-category-delete-confirm-button"
	onConfirm={() => void handleDeleteCategoryConfirm()}
	onCancel={() => {
		deletingCategory = null;
		deleteCategoryError = '';
	}}
/>
