<!--
  @file コンポーネント: ExerciseListCard
  @module src/lib/features/workout/exercises/components/ExerciseListCard.svelte
  @feature workout/exercises

  @description
  筋トレ種目の一覧表示・追加・編集・削除を行うカード。カテゴリ選択も含む。
  追加/編集/削除ハンドラの共通処理は `form-helpers.ts` に委譲する。

  @props
  - exercises: { items: ExerciseWithCategory[] } - 種目一覧（カテゴリ情報含む）
  - categories: Category[] - カテゴリ一覧（種目のカテゴリ選択用）
-->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Pencil, Trash2, Check, X } from '@lucide/svelte';
	import Button from '$lib/components/Button.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import { submitNamedForm, submitDelete } from './form-helpers';
	import type { Category, ExerciseWithCategory } from '../types';

	let {
		exercises,
		categories
	}: {
		exercises: { items: ExerciseWithCategory[] };
		categories: Category[];
	} = $props();

	const MAX_NAME_LENGTH = 50;

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

	async function handleAdd() {
		await submitNamedForm({
			name: newName,
			maxLength: MAX_NAME_LENGTH,
			requiredMessage: '種目名は必須です',
			maxLengthMessage: `${MAX_NAME_LENGTH}文字以内で入力してください`,
			setError: (msg) => (newNameError = msg),
			setLoading: (loading) => (isAdding = loading),
			request: () =>
				fetch('/workout/exercises', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name: newName.trim(), categoryId: newCategoryId || null })
				}),
			onSuccess: async () => {
				newName = '';
				newCategoryId = '';
				await invalidateAll();
			}
		});
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
		await submitNamedForm({
			name: editingName,
			maxLength: MAX_NAME_LENGTH,
			requiredMessage: '種目名は必須です',
			maxLengthMessage: `${MAX_NAME_LENGTH}文字以内で入力してください`,
			setError: (msg) => (editingNameError = msg),
			setLoading: (loading) => (isSavingEdit = loading),
			request: () =>
				fetch(`/workout/exercises/${id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: editingName.trim(),
						categoryId: editingCategoryIdForExercise || null
					})
				}),
			onSuccess: async () => {
				editingId = null;
				await invalidateAll();
			}
		});
	}

	async function handleDeleteConfirm() {
		if (!deletingExercise) return;
		const target = deletingExercise;
		await submitDelete({
			setError: (msg) => (deleteError = msg),
			setLoading: (loading) => (isDeleting = loading),
			request: () => fetch(`/workout/exercises/${target.id}`, { method: 'DELETE' }),
			onSuccess: async () => {
				deletingExercise = null;
				await invalidateAll();
			}
		});
	}
</script>

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
