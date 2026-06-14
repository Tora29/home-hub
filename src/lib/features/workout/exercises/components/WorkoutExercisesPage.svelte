<!--
  @file コンポーネント: WorkoutExercisesPage
  @module src/lib/features/workout/exercises/components/WorkoutExercisesPage.svelte
  @feature workout/exercises

  @description
  筋トレ種目の一覧表示・追加・編集・削除、および種目カテゴリの管理を行う画面コンポーネント。
  role === 'main' のユーザーのみアクセス可能。

  @props
  - exercises: { items: ExerciseWithCategory[] } - 種目一覧（カテゴリ情報含む）
  - categories: Category[] - カテゴリ一覧
-->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Dumbbell, ArrowLeft, Pencil, Trash2, Check, X } from '@lucide/svelte';
	import Button from '$lib/components/Button.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';

	type Category = { id: string; name: string; createdAt: Date };
	type ExerciseWithCategory = {
		id: string;
		name: string;
		userId: string;
		categoryId: string | null;
		category: { id: string; name: string } | null;
		createdAt: Date;
	};

	let {
		exercises,
		categories
	}: {
		exercises: { items: ExerciseWithCategory[] };
		categories: Category[];
	} = $props();

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

	// --- 種目追加 ---
	let newName = $state('');
	let newNameError = $state('');
	let newCategoryId = $state(''); // '' = 未設定
	let isAdding = $state(false);

	// --- 種目編集 ---
	let editingId = $state<string | null>(null);
	let editingName = $state('');
	let editingNameError = $state('');
	let editingCategoryIdForExercise = $state('');
	let isSavingEdit = $state(false);

	// --- 種目削除 ---
	let deletingExercise = $state<ExerciseWithCategory | null>(null);
	let isDeleting = $state(false);
	let deleteError = $state('');

	async function handleAddCategory() {
		newCategoryNameError = '';
		if (!newCategoryName.trim()) {
			newCategoryNameError = 'カテゴリ名は必須です';
			return;
		}
		if (newCategoryName.length > 30) {
			newCategoryNameError = '30文字以内で入力してください';
			return;
		}
		isAddingCategory = true;
		try {
			const res = await fetch('/workout/exercises/categories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newCategoryName.trim() })
			});
			if (!res.ok) {
				const err = (await res.json()) as { message?: string };
				newCategoryNameError = err.message ?? 'エラーが発生しました';
				return;
			}
			newCategoryName = '';
			await invalidateAll();
		} finally {
			isAddingCategory = false;
		}
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
		editingCategoryNameError = '';
		if (!editingCategoryName.trim()) {
			editingCategoryNameError = 'カテゴリ名は必須です';
			return;
		}
		if (editingCategoryName.length > 30) {
			editingCategoryNameError = '30文字以内で入力してください';
			return;
		}
		isSavingCategoryEdit = true;
		try {
			const res = await fetch(`/workout/exercises/categories/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: editingCategoryName.trim() })
			});
			if (!res.ok) {
				const err = (await res.json()) as { message?: string };
				editingCategoryNameError = err.message ?? 'エラーが発生しました';
				return;
			}
			editingCategoryId = null;
			await invalidateAll();
		} finally {
			isSavingCategoryEdit = false;
		}
	}

	async function handleDeleteCategoryConfirm() {
		if (!deletingCategory) return;
		isDeletingCategory = true;
		deleteCategoryError = '';
		try {
			const res = await fetch(`/workout/exercises/categories/${deletingCategory.id}`, {
				method: 'DELETE'
			});
			if (!res.ok) {
				const err = (await res.json()) as { message?: string };
				deleteCategoryError = err.message ?? 'エラーが発生しました';
				return;
			}
			deletingCategory = null;
			await invalidateAll();
		} finally {
			isDeletingCategory = false;
		}
	}

	async function handleAdd() {
		newNameError = '';
		if (!newName.trim()) {
			newNameError = '種目名は必須です';
			return;
		}
		if (newName.length > 50) {
			newNameError = '50文字以内で入力してください';
			return;
		}

		isAdding = true;
		try {
			const res = await fetch('/workout/exercises', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newName.trim(), categoryId: newCategoryId || null })
			});

			if (!res.ok) {
				const err = (await res.json()) as { message?: string };
				newNameError = err.message ?? 'エラーが発生しました';
				return;
			}

			newName = '';
			newCategoryId = '';
			await invalidateAll();
		} finally {
			isAdding = false;
		}
	}

	function startEdit(exercise: ExerciseWithCategory) {
		editingId = exercise.id;
		editingName = exercise.name;
		editingNameError = '';
		editingCategoryIdForExercise = exercise.categoryId ?? '';
	}

	function cancelEdit() {
		editingId = null;
		editingName = '';
		editingNameError = '';
		editingCategoryIdForExercise = '';
	}

	async function handleEditSave(id: string) {
		editingNameError = '';
		if (!editingName.trim()) {
			editingNameError = '種目名は必須です';
			return;
		}
		if (editingName.length > 50) {
			editingNameError = '50文字以内で入力してください';
			return;
		}

		isSavingEdit = true;
		try {
			const res = await fetch(`/workout/exercises/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: editingName.trim(),
					categoryId: editingCategoryIdForExercise || null
				})
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
		if (!deletingExercise) return;
		isDeleting = true;
		deleteError = '';
		try {
			const res = await fetch(`/workout/exercises/${deletingExercise.id}`, {
				method: 'DELETE'
			});

			if (!res.ok) {
				const err = (await res.json()) as { message?: string };
				deleteError = err.message ?? 'エラーが発生しました';
				return;
			}

			deletingExercise = null;
			await invalidateAll();
		} finally {
			isDeleting = false;
		}
	}
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

	<!-- カテゴリ管理カード -->
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

	<!-- 種目追加カード -->
	<div class="mb-6 rounded-3xl bg-bg-card p-6 shadow-md">
		<h2 class="mb-3 text-sm font-medium text-secondary">新しい種目を追加</h2>
		<div class="flex flex-col gap-2">
			<div class="flex items-start gap-2">
				<div class="min-w-0 flex-1">
					<Input
						data-testid="workout-exercise-name-input"
						type="text"
						bind:value={newName}
						placeholder="種目名（例: ベンチプレス）"
						maxlength={50}
						class="w-full"
						onkeydown={(e) => e.key === 'Enter' && !isAdding && void handleAdd()}
					/>
					{#if newNameError}
						<p class="mt-1 text-xs text-destructive">{newNameError}</p>
					{/if}
				</div>
				<Button
					data-testid="workout-exercise-add-button"
					variant="primary"
					size="md"
					onclick={() => void handleAdd()}
					disabled={isAdding}
					type="button"
				>
					追加
				</Button>
			</div>
			{#if categories.length > 0}
				<Select
					data-testid="workout-exercise-category-select"
					bind:value={newCategoryId}
					class="w-full"
				>
					<option value="">カテゴリなし</option>
					{#each categories as cat (cat.id)}
						<option value={cat.id}>{cat.name}</option>
					{/each}
				</Select>
			{/if}
		</div>
	</div>

	{#if exercises.items.length === 0}
		<p class="py-12 text-center text-secondary">
			種目がありません。上のフォームから追加してください。
		</p>
	{:else}
		<ul data-testid="workout-exercise-list" class="flex flex-col gap-2">
			{#each exercises.items as exercise (exercise.id)}
				<li data-testid="workout-exercise-item" class="rounded-3xl bg-bg-card px-4 py-3 shadow-md">
					{#if editingId === exercise.id}
						<div class="flex flex-col gap-2">
							<div class="flex items-start gap-2">
								<div class="min-w-0 flex-1">
									<Input
										data-testid="workout-exercise-edit-input"
										type="text"
										bind:value={editingName}
										maxlength={50}
										class="w-full"
										onkeydown={(e) => {
											if (e.key === 'Enter') void handleEditSave(exercise.id);
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
									onclick={() => void handleEditSave(exercise.id)}
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
							{#if categories.length > 0}
								<Select
									data-testid="workout-exercise-edit-category-select"
									bind:value={editingCategoryIdForExercise}
									class="w-full"
								>
									<option value="">カテゴリなし</option>
									{#each categories as cat (cat.id)}
										<option value={cat.id}>{cat.name}</option>
									{/each}
								</Select>
							{/if}
						</div>
					{:else}
						<div class="flex items-center gap-2">
							<div class="flex min-w-0 flex-1 flex-col">
								<span class="text-sm font-medium text-label">{exercise.name}</span>
								{#if exercise.category}
									<span class="text-xs text-secondary">{exercise.category.name}</span>
								{/if}
							</div>
							<Button
								data-testid="workout-exercise-edit-button"
								variant="secondary"
								size="sm"
								onclick={() => startEdit(exercise)}
								aria-label="編集"
								type="button"
							>
								<Pencil size={14} />
							</Button>
							<Button
								data-testid="workout-exercise-delete-button"
								variant="ghost-destructive"
								size="sm"
								onclick={() => (deletingExercise = exercise)}
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

<ConfirmDialog
	open={deletingExercise !== null}
	title="種目を削除しますか？"
	description={deletingExercise
		? `「${deletingExercise.name}」を削除します。この操作は元に戻せません。`
		: ''}
	confirmLabel="削除する"
	confirmVariant="destructive"
	loading={isDeleting}
	error={deleteError}
	data-testid="workout-exercise-delete-dialog"
	confirmTestid="workout-exercise-delete-confirm-button"
	onConfirm={() => void handleDeleteConfirm()}
	onCancel={() => {
		deletingExercise = null;
		deleteError = '';
	}}
/>
