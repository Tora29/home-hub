<!--
  @file コンポーネント: WorkoutExercisesPage
  @module src/lib/features/workout/exercises/components/WorkoutExercisesPage.svelte
  @feature workout/exercises

  @description
  筋トレ種目の一覧表示・追加・編集・削除を行う管理画面コンポーネント。
  role === 'main' のユーザーのみアクセス可能。

  @props
  - exercises: { items: Exercise[] } - 種目一覧
-->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Dumbbell, ArrowLeft, Pencil, Trash2, Check, X } from '@lucide/svelte';
	import Button from '$lib/components/Button.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Input from '$lib/components/Input.svelte';

	type Exercise = { id: string; name: string; userId: string; createdAt: Date };

	let {
		exercises
	}: {
		exercises: { items: Exercise[] };
	} = $props();

	let newName = $state('');
	let newNameError = $state('');
	let isAdding = $state(false);

	let editingId = $state<string | null>(null);
	let editingName = $state('');
	let editingNameError = $state('');
	let isSavingEdit = $state(false);

	let deletingExercise = $state<Exercise | null>(null);
	let isDeleting = $state(false);
	let deleteError = $state('');

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

	function startEdit(exercise: Exercise) {
		editingId = exercise.id;
		editingName = exercise.name;
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

	<div class="mb-6 rounded-3xl bg-bg-card p-6 shadow-md">
		<h2 class="mb-3 text-sm font-medium text-secondary">新しい種目を追加</h2>
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
					{:else}
						<div class="flex items-center gap-2">
							<span class="flex-1 text-sm font-medium text-label">{exercise.name}</span>
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
