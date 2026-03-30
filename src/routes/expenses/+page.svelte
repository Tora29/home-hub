<!--
  @file 画面: 支出一覧
  @module src/routes/expenses/+page.svelte
  @feature expenses

  @description
  月ごとの支出一覧を表示する。月切り替え・登録・編集・削除・承認操作ができる。

  @spec specs/expenses/spec.md
  @acceptance AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-013, AC-204, AC-205

  @navigation
  - 遷移先: /expenses/categories - カテゴリ管理画面

  @api
  - GET /expenses → 200 ExpenseList - 一覧取得（SSR load）
  - POST /expenses → 201 ExpenseWithCategory - 新規作成
  - PUT /expenses/[id] → 200 ExpenseWithCategory - 更新
  - DELETE /expenses/[id] → 204 - 削除
-->
<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { Wallet, Plus, CheckCircle, RotateCcw, Pencil, Trash2, Tag } from '@lucide/svelte';
	import Button from '$lib/components/Button.svelte';
	import Select from '$lib/components/Select.svelte';
	import ExpenseForm from './components/ExpenseForm.svelte';

	type Category = { id: string; userId: string; name: string; createdAt: Date };
	type ExpenseWithCategory = {
		id: string;
		userId: string;
		amount: number;
		categoryId: string;
		approvedAt: Date | null;
		createdAt: Date;
		category: Category;
	};

	let { data } = $props();

	let showCreateDialog = $state(false);
	let editingExpense = $state<ExpenseWithCategory | null>(null);
	let deletingExpense = $state<ExpenseWithCategory | null>(null);
	let isDeleting = $state(false);

	let currentMonth = $derived(
		page.url.searchParams.get('month') ??
			(() => {
				const now = new Date();
				return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
			})()
	);

	function getMonthOptions() {
		const options = [];
		const now = new Date();
		for (let i = 0; i < 13; i++) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
			const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
			options.push({ value, label });
		}
		return options;
	}

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

	async function handleApprove(exp: ExpenseWithCategory) {
		const res = await fetch(`/expenses/${exp.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ amount: exp.amount, categoryId: exp.categoryId, approved: true })
		});
		if (res.ok) await invalidateAll();
	}

	async function handleUnapprove(exp: ExpenseWithCategory) {
		const res = await fetch(`/expenses/${exp.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ amount: exp.amount, categoryId: exp.categoryId, approved: false })
		});
		if (res.ok) await invalidateAll();
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

	const monthOptions = getMonthOptions();
</script>

<div class="mx-auto max-w-3xl">
	<!-- Header -->
	<div class="mb-6 flex items-center gap-3">
		<Wallet size={28} class="text-accent" />
		<h1 class="flex-1 text-2xl font-medium text-label">支出</h1>
		<a
			href="/expenses/categories"
			class="inline-flex items-center gap-1.5 rounded-2xl border border-separator px-3 py-2 text-sm text-secondary hover:text-label"
		>
			<Tag size={14} />
			カテゴリ管理
		</a>
		<Button
			data-testid="expense-create-button"
			onclick={() => (showCreateDialog = true)}
			variant="primary"
			size="md"
		>
			<Plus size={18} />
			登録
		</Button>
	</div>

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
				<li data-testid="expense-item" class="rounded-3xl bg-bg-card p-4 shadow-sm">
					<div class="flex items-start gap-3">
						<!-- Amount & Category -->
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="text-lg font-semibold text-label">{formatAmount(exp.amount)}</span>
								<span class="rounded-xl bg-bg-secondary px-2 py-0.5 text-xs text-secondary">
									{exp.category.name}
								</span>
								<!-- Approval badge -->
								{#if exp.approvedAt !== null}
									<span
										class="rounded-xl bg-success/15 px-2 py-0.5 text-xs font-medium text-success"
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

						<!-- Actions -->
						<div class="flex shrink-0 items-center gap-1">
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
					</div>
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
		aria-label="支出を登録"
		tabindex={-1}
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
		onclick={(e) => e.target === e.currentTarget && (showCreateDialog = false)}
		onkeydown={(e) => e.key === 'Escape' && (showCreateDialog = false)}
	>
		<div class="w-full max-w-md rounded-3xl bg-bg-card shadow-md">
			<ExpenseForm
				mode="create"
				categories={data.categories.items}
				onSuccess={handleFormSuccess}
				onCancel={() => (showCreateDialog = false)}
			/>
		</div>
	</div>
{/if}

<!-- Edit dialog -->
{#if editingExpense}
	<div
		role="dialog"
		aria-modal="true"
		aria-label="支出を編集"
		tabindex={-1}
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
		onclick={(e) => e.target === e.currentTarget && (editingExpense = null)}
		onkeydown={(e) => e.key === 'Escape' && (editingExpense = null)}
	>
		<div class="w-full max-w-md rounded-3xl bg-bg-card shadow-md">
			<ExpenseForm
				mode="edit"
				expense={editingExpense}
				categories={data.categories.items}
				onSuccess={handleFormSuccess}
				onCancel={() => (editingExpense = null)}
			/>
		</div>
	</div>
{/if}

<!-- Delete confirm dialog -->
{#if deletingExpense}
	<div
		role="alertdialog"
		aria-modal="true"
		aria-label="支出を削除しますか？"
		data-testid="expense-delete-dialog"
		tabindex={-1}
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
		onkeydown={(e) => e.key === 'Escape' && (deletingExpense = null)}
	>
		<div class="w-full max-w-sm rounded-3xl bg-bg-card p-6 shadow-md">
			<h2 class="mb-2 text-lg font-medium text-label">支出を削除しますか？</h2>
			<p class="mb-6 text-sm text-secondary">
				{formatAmount(deletingExpense.amount)}（{deletingExpense.category
					.name}）を削除します。この操作は元に戻せません。
			</p>
			<div class="flex justify-end gap-3">
				<Button variant="secondary" onclick={() => (deletingExpense = null)} type="button">
					キャンセル
				</Button>
				<Button
					data-testid="expense-delete-confirm-button"
					variant="destructive"
					onclick={() => void handleDeleteConfirm()}
					disabled={isDeleting}
					type="button"
				>
					削除する
				</Button>
			</div>
		</div>
	</div>
{/if}
