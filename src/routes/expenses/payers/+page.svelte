<!--
  @file 画面: 支払者管理
  @module src/routes/expenses/payers/+page.svelte
  @feature expenses

  @description
  支出支払者の一覧表示・追加・編集・削除を行う管理画面。

  @spec specs/expenses/spec.md
  @acceptance AC-035, AC-036, AC-037, AC-038, AC-116, AC-117, AC-118, AC-119

  @navigation
  - 遷移元: /expenses - 支出一覧画面

  @api
  - GET /expenses/payers → 200 PayerList - 一覧取得（SSR load）
  - POST /expenses/payers → 201 Payer - 支払者追加
  - PUT /expenses/payers/[id] → 200 Payer - 支払者更新
  - DELETE /expenses/payers/[id] → 204 - 支払者削除
-->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Users, ArrowLeft, Pencil, Trash2, Check, X } from '@lucide/svelte';
	import Button from '$lib/components/Button.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Input from '$lib/components/Input.svelte';

	type Payer = { id: string; userId: string; name: string; createdAt: Date };

	let { data } = $props();

	// Add form state
	let newName = $state('');
	let newNameError = $state('');
	let isAdding = $state(false);

	// Inline edit state
	let editingId = $state<string | null>(null);
	let editingName = $state('');
	let editingNameError = $state('');
	let isSavingEdit = $state(false);

	// Delete dialog state
	let deletingPayer = $state<Payer | null>(null);
	let isDeleting = $state(false);
	let deleteError = $state('');

	async function handleAdd() {
		newNameError = '';
		if (!newName.trim()) {
			newNameError = '支払者名は必須です';
			return;
		}
		if (newName.length > 50) {
			newNameError = '50文字以内で入力してください';
			return;
		}

		isAdding = true;
		try {
			const res = await fetch('/expenses/payers', {
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

	function startEdit(payer: Payer) {
		editingId = payer.id;
		editingName = payer.name;
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
			editingNameError = '支払者名は必須です';
			return;
		}
		if (editingName.length > 50) {
			editingNameError = '50文字以内で入力してください';
			return;
		}

		isSavingEdit = true;
		try {
			const res = await fetch(`/expenses/payers/${id}`, {
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
		if (!deletingPayer) return;
		isDeleting = true;
		deleteError = '';
		try {
			const res = await fetch(`/expenses/payers/${deletingPayer.id}`, {
				method: 'DELETE'
			});

			if (!res.ok) {
				const err = (await res.json()) as { message?: string };
				deleteError = err.message ?? 'エラーが発生しました';
				return;
			}

			deletingPayer = null;
			await invalidateAll();
		} finally {
			isDeleting = false;
		}
	}
</script>

<div class="mx-auto max-w-lg">
	<!-- Header -->
	<div class="mb-6 flex items-center gap-3">
		<a
			href="/expenses"
			class="rounded-2xl border border-separator p-2 text-secondary hover:text-label"
			aria-label="支出一覧に戻る"
		>
			<ArrowLeft size={18} />
		</a>
		<Users size={24} class="text-accent" />
		<h1 class="flex-1 text-2xl font-medium text-label">支払者管理</h1>
	</div>

	<!-- Add form -->
	<div class="mb-6 rounded-3xl bg-bg-card p-5 shadow-sm">
		<h2 class="mb-3 text-sm font-medium text-secondary">新しい支払者を追加</h2>
		<div class="flex items-start gap-2">
			<div class="min-w-0 flex-1">
				<Input
					data-testid="expense-payer-name-input"
					type="text"
					bind:value={newName}
					placeholder="支払者名（例: 山田）"
					maxlength={50}
					class="w-full"
					onkeydown={(e) => e.key === 'Enter' && !isAdding && void handleAdd()}
				/>
				{#if newNameError}
					<p data-testid="expense-payer-name-error" class="mt-1 text-xs text-destructive">
						{newNameError}
					</p>
				{/if}
			</div>
			<Button
				data-testid="expense-payer-add-button"
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

	<!-- Payer list -->
	{#if data.payers.items.length === 0}
		<p class="py-12 text-center text-secondary">
			支払者がありません。上のフォームから追加してください。
		</p>
	{:else}
		<ul data-testid="expense-payer-list" class="flex flex-col gap-2">
			{#each data.payers.items as payer (payer.id)}
				<li data-testid="expense-payer-item" class="rounded-3xl bg-bg-card px-4 py-3 shadow-sm">
					{#if editingId === payer.id}
						<!-- Inline edit mode -->
						<div class="flex items-start gap-2">
							<div class="min-w-0 flex-1">
								<Input
									type="text"
									bind:value={editingName}
									maxlength={50}
									class="w-full"
									onkeydown={(e) => {
										if (e.key === 'Enter') void handleEditSave(payer.id);
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
								onclick={() => void handleEditSave(payer.id)}
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
						<!-- Display mode -->
						<div class="flex items-center gap-2">
							<span class="flex-1 text-sm font-medium text-label">{payer.name}</span>
							<Button
								data-testid="expense-payer-edit-button"
								variant="secondary"
								size="sm"
								onclick={() => startEdit(payer)}
								aria-label="編集"
								type="button"
							>
								<Pencil size={14} />
							</Button>
							<Button
								data-testid="expense-payer-delete-button"
								variant="ghost-destructive"
								size="sm"
								onclick={() => (deletingPayer = payer)}
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

<!-- Delete confirm dialog -->
<ConfirmDialog
	open={deletingPayer !== null}
	title="支払者を削除しますか？"
	description={deletingPayer
		? `「${deletingPayer.name}」を削除します。この操作は元に戻せません。`
		: ''}
	confirmLabel="削除する"
	confirmVariant="destructive"
	loading={isDeleting}
	error={deleteError}
	data-testid="expense-payer-delete-dialog"
	confirmTestid="expense-payer-delete-confirm-button"
	onConfirm={() => void handleDeleteConfirm()}
	onCancel={() => {
		deletingPayer = null;
		deleteError = '';
	}}
/>
