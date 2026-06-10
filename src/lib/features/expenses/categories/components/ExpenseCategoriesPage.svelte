<!--
  @file コンポーネント: ExpenseCategoriesPage
  @module src/lib/features/expenses/categories/components/ExpenseCategoriesPage.svelte
  @feature expenses/categories

  @description
  支出カテゴリの一覧表示・追加・編集・削除を行う管理画面コンポーネント。

  @props
  - categories: { items: Category[] } - カテゴリ一覧
-->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Tag, ArrowLeft, Pencil, Trash2, Check, X } from '@lucide/svelte';
	import Button from '$lib/components/Button.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Input from '$lib/components/Input.svelte';

	type Category = { id: string; name: string; createdAt: Date };

	let {
		categories
	}: {
		categories: { items: Category[] };
	} = $props();

	let newName = $state('');
	let newNameError = $state('');
	let isAdding = $state(false);

	let editingId = $state<string | null>(null);
	let editingName = $state('');
	let editingNameError = $state('');
	let isSavingEdit = $state(false);

	let deletingCategory = $state<Category | null>(null);
	let isDeleting = $state(false);
	let deleteError = $state('');

	async function handleAdd() {
		newNameError = '';
		if (!newName.trim()) {
			newNameError = 'カテゴリ名は必須です';
			return;
		}
		if (newName.length > 50) {
			newNameError = '50文字以内で入力してください';
			return;
		}

		isAdding = true;
		try {
			const res = await fetch('/expenses/categories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newName.trim() })
			});

			if (!res.ok) {
				const err = (await res.json()) as { message?: string };
				newNameError = err.message ?? 'エラーが発生しました';
				return;
			}

			newName = '';
			await invalidateAll();
		} finally {
			isAdding = false;
		}
	}

	function startEdit(cat: Category) {
		editingId = cat.id;
		editingName = cat.name;
		editingNameError = '';
	}

	function cancelEdit() {
		editingId = null;
		editingName = '';
		editingNameError = '';
	}

	async function handleEditSave(id: string) {
		editingNameError = '';
		if (!editingName.trim()) {
			editingNameError = 'カテゴリ名は必須です';
			return;
		}
		if (editingName.length > 50) {
			editingNameError = '50文字以内で入力してください';
			return;
		}

		isSavingEdit = true;
		try {
			const res = await fetch(`/expenses/categories/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: editingName.trim() })
			});

			if (!res.ok) {
				const err = (await res.json()) as { message?: string };
				editingNameError = err.message ?? 'エラーが発生しました';
				return;
			}

			editingId = null;
			await invalidateAll();
		} finally {
			isSavingEdit = false;
		}
	}

	async function handleDeleteConfirm() {
		if (!deletingCategory) return;
		isDeleting = true;
		deleteError = '';
		try {
			const res = await fetch(`/expenses/categories/${deletingCategory.id}`, {
				method: 'DELETE'
			});

			if (!res.ok) {
				const err = (await res.json()) as { message?: string };
				deleteError = err.message ?? 'エラーが発生しました';
				return;
			}

			deletingCategory = null;
			await invalidateAll();
		} finally {
			isDeleting = false;
		}
	}
</script>

<div class="mx-auto max-w-lg">
	<div class="mb-6 flex items-center gap-3">
		<a
			href="/expenses"
			class="rounded-2xl border border-separator p-2 text-secondary hover:text-label"
			aria-label="支出一覧に戻る"
		>
			<ArrowLeft size={18} />
		</a>
		<Tag size={24} class="text-accent" />
		<h1 class="flex-1 text-2xl font-medium text-label">カテゴリ管理</h1>
	</div>

	<div class="mb-6 rounded-3xl bg-bg-card p-6 shadow-md">
		<h2 class="mb-3 text-sm font-medium text-secondary">新しいカテゴリを追加</h2>
		<div class="flex items-start gap-2">
			<div class="min-w-0 flex-1">
				<Input
					data-testid="expense-category-name-input"
					type="text"
					bind:value={newName}
					placeholder="カテゴリ名（例: 食費）"
					maxlength={50}
					class="w-full"
					onkeydown={(e) => e.key === 'Enter' && !isAdding && void handleAdd()}
				/>
				{#if newNameError}
					<p data-testid="expense-category-name-error" class="mt-1 text-xs text-destructive">
						{newNameError}
					</p>
				{/if}
			</div>
			<Button
				data-testid="expense-category-add-button"
				variant="primary"
				size="md"
				onclick={() => void handleAdd()}
				disabled={isAdding}
				type="button"
			>
				追加
			</Button>
		</div>
	</div>

	{#if categories.items.length === 0}
		<p class="py-12 text-center text-secondary">
			カテゴリがありません。上のフォームから追加してください。
		</p>
	{:else}
		<ul data-testid="expense-category-list" class="flex flex-col gap-2">
			{#each categories.items as cat (cat.id)}
				<li data-testid="expense-category-item" class="rounded-3xl bg-bg-card px-4 py-3 shadow-md">
					{#if editingId === cat.id}
						<div class="flex items-start gap-2">
							<div class="min-w-0 flex-1">
								<Input
									type="text"
									bind:value={editingName}
									maxlength={50}
									class="w-full"
									onkeydown={(e) => {
										if (e.key === 'Enter') void handleEditSave(cat.id);
										if (e.key === 'Escape') cancelEdit();
									}}
								/>
								{#if editingNameError}
									<p class="mt-1 text-xs text-destructive">{editingNameError}</p>
								{/if}
							</div>
							<Button
								variant="primary"
								size="sm"
								onclick={() => void handleEditSave(cat.id)}
								disabled={isSavingEdit}
								aria-label="保存"
								type="button"
							>
								<Check size={14} />
							</Button>
							<Button
								variant="secondary"
								size="sm"
								onclick={cancelEdit}
								aria-label="キャンセル"
								type="button"
							>
								<X size={14} />
							</Button>
						</div>
					{:else}
						<div class="flex items-center gap-2">
							<span class="flex-1 text-sm font-medium text-label">{cat.name}</span>
							<Button
								data-testid="expense-category-edit-button"
								variant="secondary"
								size="sm"
								onclick={() => startEdit(cat)}
								aria-label="編集"
								type="button"
							>
								<Pencil size={14} />
							</Button>
							<Button
								data-testid="expense-category-delete-button"
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
</div>

<ConfirmDialog
	open={deletingCategory !== null}
	title="カテゴリを削除しますか？"
	description={deletingCategory
		? `「${deletingCategory.name}」を削除します。この操作は元に戻せません。`
		: ''}
	confirmLabel="削除する"
	confirmVariant="destructive"
	loading={isDeleting}
	error={deleteError}
	data-testid="expense-category-delete-dialog"
	confirmTestid="expense-category-delete-confirm-button"
	onConfirm={() => void handleDeleteConfirm()}
	onCancel={() => {
		deletingCategory = null;
		deleteError = '';
	}}
/>
