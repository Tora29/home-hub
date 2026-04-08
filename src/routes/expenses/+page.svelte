<!--
  @file 画面: 支出一覧
  @module src/routes/expenses/+page.svelte
  @feature expenses

  @description
  月ごとの支出一覧を表示する。月切り替え・登録・編集・削除・承認・確定操作ができる。
  確定は複数行を選択してまとめて確定するバッチフロー。
  各行のアクションは行メニューボタン（expense-menu-button）から操作する。

  @spec specs/expenses/spec.md
  @acceptance AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-013, AC-014, AC-015, AC-016, AC-017, AC-018, AC-019, AC-020, AC-204, AC-205

  @navigation
  - 遷移先: /expenses/categories - カテゴリ管理画面

  @api
  - GET /expenses → 200 ExpenseList - 一覧取得（SSR load）
  - POST /expenses → 201 ExpenseWithCategory - 新規作成
  - PUT /expenses/[id] → 200 ExpenseWithCategory - 更新
  - DELETE /expenses/[id] → 204 - 削除
  - POST /expenses/[id]/finalize → 200 ExpenseWithCategory - 確定（バッチ）
-->
<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import {
		Wallet,
		Plus,
		CheckCircle,
		RotateCcw,
		Pencil,
		Trash2,
		Tag,
		Users,
		Check,
		MoreVertical
	} from '@lucide/svelte';
	import Button from '$lib/components/Button.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Select from '$lib/components/Select.svelte';
	import ExpenseFormDialog from './components/ExpenseFormDialog.svelte';
	import { generateMonthOptions } from '$lib/utils/date';
	import type { ExpenseWithRelations } from './types';

	let { data } = $props();

	let showCreateDialog = $state(false);
	let editingExpense = $state<ExpenseWithRelations | null>(null);
	let deletingExpense = $state<ExpenseWithRelations | null>(null);
	let isDeleting = $state(false);

	// 行メニューの開閉管理（開いている行の ID を保持）
	let openMenuId = $state<string | null>(null);

	let actionError = $state<string | null>(null);

	// 確認済み（未確定）の支出を自動で確定対象にする
	let finalizeTargets = $derived(
		data.expenses.items.filter((e) => e.approvedAt !== null && e.finalizedAt === null)
	);
	let showFinalizeDialog = $state(false);
	let isFinalizing = $state(false);
	let finalizeError = $state<string | null>(null);

	let currentMonth = $derived(page.url.searchParams.get('month') ?? data.currentMonth);

	function formatAmount(amount: number): string {
		return `¥${amount.toLocaleString('ja-JP')}`;
	}

	function formatDate(date: Date | string): string {
		const d = new Date(date);
		return `${d.getMonth() + 1}/${d.getDate()}`;
	}

	function handleMonthChange(e: Event) {
		const month = (e.target as HTMLSelectElement).value;
		void goto(`?month=${month}`, { keepFocus: true, replaceState: true });
	}

	// まとめて確定（確認済み未確定を全件）
	async function handleBulkFinalize() {
		isFinalizing = true;
		finalizeError = null;
		try {
			const results = await Promise.all(
				finalizeTargets.map((e) => fetch(`/expenses/${e.id}/finalize`, { method: 'POST' }))
			);
			const failCount = results.filter((r) => !r.ok).length;
			if (failCount > 0) {
				finalizeError = `${failCount}件の確定に失敗しました。再度お試しください。`;
				await invalidateAll();
			} else {
				showFinalizeDialog = false;
				await invalidateAll();
			}
		} finally {
			isFinalizing = false;
		}
	}

	async function handleApprove(exp: ExpenseWithRelations) {
		actionError = null;
		const res = await fetch(`/expenses/${exp.id}/approve`, { method: 'POST' });
		if (res.ok) {
			await invalidateAll();
		} else {
			const err = await res.json().catch(() => null);
			actionError = err?.message ?? '確認済みへの更新に失敗しました';
		}
	}

	async function handleUnapprove(exp: ExpenseWithRelations) {
		actionError = null;
		const res = await fetch(`/expenses/${exp.id}/unapprove`, { method: 'POST' });
		if (res.ok) {
			await invalidateAll();
		} else {
			const err = await res.json().catch(() => null);
			actionError = err?.message ?? '未承認への戻しに失敗しました';
		}
	}

	async function handleDeleteConfirm() {
		if (!deletingExpense) return;
		isDeleting = true;
		try {
			const res = await fetch(`/expenses/${deletingExpense.id}`, { method: 'DELETE' });
			if (res.ok) {
				deletingExpense = null;
				await invalidateAll();
			}
		} finally {
			isDeleting = false;
		}
	}

	async function handleFormSuccess() {
		showCreateDialog = false;
		editingExpense = null;
		await invalidateAll();
	}

	let monthOptions = $derived(generateMonthOptions(data.currentMonth));
</script>

<div class="mx-auto max-w-3xl" onclick={() => (openMenuId = null)} role="presentation">
	<!-- Header -->
	<div class="mb-6 flex items-center gap-3">
		<Wallet size={28} class="text-accent" />
		<h1 class="flex-1 text-2xl font-medium whitespace-nowrap text-label">支出</h1>
		<a
			href="/expenses/categories"
			class="inline-flex items-center gap-1.5 rounded-2xl border border-separator px-2 py-2 text-sm text-secondary hover:text-label md:px-3"
			aria-label="カテゴリ管理"
		>
			<Tag size={14} />
			<span class="hidden md:inline">カテゴリ管理</span>
		</a>
		<a
			href="/expenses/payers"
			class="inline-flex items-center gap-1.5 rounded-2xl border border-separator px-2 py-2 text-sm text-secondary hover:text-label md:px-3"
			aria-label="支払者管理"
		>
			<Users size={14} />
			<span class="hidden md:inline">支払者管理</span>
		</a>
		<!-- 確認済み（未確定）が1件以上あるときにまとめて確定ボタンを表示 -->
		{#if finalizeTargets.length > 0}
			<Button
				data-testid="expense-bulk-finalize-button"
				onclick={() => (showFinalizeDialog = true)}
				variant="primary"
				size="md"
			>
				<Check size={16} />
				<span class="hidden md:inline">確定する（{finalizeTargets.length}件）</span>
				<span class="md:hidden">{finalizeTargets.length}件確定</span>
			</Button>
		{/if}
		<Button
			data-testid="expense-create-button"
			onclick={() => (showCreateDialog = true)}
			variant="primary"
			size="md"
			aria-label="支出を登録"
		>
			<Plus size={18} />
			<span class="hidden md:inline">登録</span>
		</Button>
	</div>

	<!-- Action error -->
	{#if actionError}
		<p
			data-testid="expense-action-error"
			role="alert"
			class="mb-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
		>
			{actionError}
		</p>
	{/if}

	<!-- Controls -->
	<div class="mb-4 flex items-center justify-between gap-4">
		<Select
			data-testid="expense-month-select"
			value={currentMonth}
			onchange={handleMonthChange}
			size="md"
			class="w-40"
		>
			{#each monthOptions as opt (opt.value)}
				<option value={opt.value}>{opt.label}</option>
			{/each}
		</Select>

		<p data-testid="expense-total" class="text-xl font-semibold text-label">
			{formatAmount(data.expenses.monthTotal)}
		</p>
	</div>

	<!-- Expense list -->
	{#if data.expenses.items.length === 0}
		<p data-testid="expense-empty" class="py-16 text-center text-secondary">
			この月の支出はありません。「登録」ボタンから追加してみましょう！
		</p>
	{:else}
		<ul data-testid="expense-list" class="flex flex-col gap-3">
			{#each data.expenses.items as exp (exp.id)}
				<li
					data-testid="expense-item"
					class="rounded-3xl bg-bg-card p-4 shadow-md transition-all {exp.finalizedAt !== null
						? 'opacity-60'
						: ''}"
				>
					<div class="flex items-start gap-3">
						<!-- Amount & Category -->
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<span class="text-lg font-semibold text-label">{formatAmount(exp.amount)}</span>
								<span class="rounded-xl bg-bg-secondary px-2 py-0.5 text-xs text-secondary">
									{exp.category.name}
								</span>
								{#if exp.payer}
									<span class="rounded-xl bg-bg-secondary px-2 py-0.5 text-xs text-secondary">
										{exp.payer.name}
									</span>
								{/if}
								<!-- Approval badge -->
								{#if exp.finalizedAt !== null}
									<span
										class="rounded-xl bg-success/20 px-2 py-0.5 text-xs font-medium text-success"
									>
										確定済み
									</span>
								{:else if exp.approvedAt !== null}
									<span
										class="rounded-xl bg-bg-warning px-2 py-0.5 text-xs font-medium text-warning"
									>
										確認済み
									</span>
								{:else}
									<span
										class="rounded-xl bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
									>
										未承認
									</span>
								{/if}
							</div>
							<p class="mt-0.5 text-xs text-secondary">{formatDate(exp.createdAt)}</p>
						</div>

						<!-- Actions (non-finalized rows only) -->
						{#if exp.finalizedAt === null}
							<!-- デスクトップ: 直接ボタン -->
							<div class="hidden shrink-0 items-center gap-1 md:flex">
								{#if exp.approvedAt === null}
									<Button
										data-testid="expense-approve-button"
										variant="secondary"
										size="sm"
										onclick={() => void handleApprove(exp)}
										aria-label="確認済みにする"
									>
										<CheckCircle size={14} />
										確認済み
									</Button>
								{:else}
									<Button
										data-testid="expense-unapprove-button"
										variant="secondary"
										size="sm"
										onclick={() => void handleUnapprove(exp)}
										aria-label="未承認に戻す"
									>
										<RotateCcw size={14} />
										未承認に戻す
									</Button>
								{/if}
								<Button
									data-testid="expense-edit-button"
									variant="secondary"
									size="sm"
									onclick={() => (editingExpense = exp)}
									aria-label="編集"
								>
									<Pencil size={14} />
								</Button>
								<Button
									data-testid="expense-delete-button"
									variant="ghost-destructive"
									size="sm"
									onclick={() => (deletingExpense = exp)}
									aria-label="削除"
								>
									<Trash2 size={14} />
								</Button>
							</div>

							<!-- モバイル: 3点メニュー -->
							<div class="relative shrink-0 md:hidden">
								<button
									data-testid="expense-menu-button"
									onclick={(e) => {
										e.stopPropagation();
										openMenuId = openMenuId === exp.id ? null : exp.id;
									}}
									class="rounded-xl p-1.5 text-secondary hover:bg-bg-secondary hover:text-label"
									aria-label="操作メニューを開く"
									aria-expanded={openMenuId === exp.id}
								>
									<MoreVertical size={18} />
								</button>

								{#if openMenuId === exp.id}
									<div
										data-testid="expense-menu"
										class="absolute top-full right-0 z-20 mt-1 w-48 rounded-2xl border border-separator bg-bg-card py-1 shadow-md"
										onclick={(e) => e.stopPropagation()}
										onkeydown={(e) => e.stopPropagation()}
										role="menu"
										tabindex={0}
									>
										{#if exp.approvedAt === null}
											<button
												data-testid="expense-approve-button"
												onclick={() => {
													openMenuId = null;
													void handleApprove(exp);
												}}
												class="flex w-full items-center gap-2 px-4 py-2 text-sm text-label hover:bg-bg-secondary"
												role="menuitem"
											>
												<CheckCircle size={14} class="text-success" />
												確認済みにする
											</button>
										{:else}
											<button
												data-testid="expense-unapprove-button"
												onclick={() => {
													openMenuId = null;
													void handleUnapprove(exp);
												}}
												class="flex w-full items-center gap-2 px-4 py-2 text-sm text-label hover:bg-bg-secondary"
												role="menuitem"
											>
												<RotateCcw size={14} />
												未承認に戻す
											</button>
										{/if}
										<hr class="my-1 border-separator" />
										<button
											data-testid="expense-edit-button"
											onclick={() => {
												openMenuId = null;
												editingExpense = exp;
											}}
											class="flex w-full items-center gap-2 px-4 py-2 text-sm text-label hover:bg-bg-secondary"
											role="menuitem"
										>
											<Pencil size={14} />
											編集
										</button>
										<button
											data-testid="expense-delete-button"
											onclick={() => {
												openMenuId = null;
												deletingExpense = exp;
											}}
											class="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-bg-secondary"
											role="menuitem"
										>
											<Trash2 size={14} />
											削除
										</button>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<!-- Create / Edit dialog -->
<ExpenseFormDialog
	open={showCreateDialog}
	mode="create"
	categories={data.categories.items}
	payers={data.payers.items}
	onSuccess={handleFormSuccess}
	onCancel={() => (showCreateDialog = false)}
/>
<ExpenseFormDialog
	open={editingExpense !== null}
	mode="edit"
	expense={editingExpense}
	categories={data.categories.items}
	payers={data.payers.items}
	onSuccess={handleFormSuccess}
	onCancel={() => (editingExpense = null)}
/>

<!-- Delete confirm dialog -->
<ConfirmDialog
	open={deletingExpense !== null}
	title="支出を削除しますか？"
	description={deletingExpense
		? `${formatAmount(deletingExpense.amount)}（${deletingExpense.category.name}）を削除します。この操作は元に戻せません。`
		: ''}
	confirmLabel="削除する"
	confirmVariant="destructive"
	loading={isDeleting}
	data-testid="expense-delete-dialog"
	confirmTestid="expense-delete-confirm-button"
	onConfirm={() => void handleDeleteConfirm()}
	onCancel={() => (deletingExpense = null)}
/>

<!-- Finalize confirm dialog -->
<ConfirmDialog
	open={showFinalizeDialog}
	title="支出を確定しますか？"
	description={`確認済みの支出 ${finalizeTargets.length} 件を確定します。確定後は編集・削除・承認状態の変更ができなくなります。`}
	confirmLabel="確定する"
	loading={isFinalizing}
	error={finalizeError ?? undefined}
	data-testid="expense-finalize-dialog"
	confirmTestid="expense-finalize-confirm-button"
	onConfirm={() => void handleBulkFinalize()}
	onCancel={() => {
		showFinalizeDialog = false;
		finalizeError = null;
	}}
/>
