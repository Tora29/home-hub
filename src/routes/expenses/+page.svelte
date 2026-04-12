<!--
  @file 画面: 支出一覧
  @module src/routes/expenses/+page.svelte
  @feature expenses

  @description
  全ユーザーの月ごとの支出一覧を表示する。
  チェックボックスで確認済みにし、「承認依頼する」で相手に申請を送信する。
  相手からの申請は「全件承認する」で一括承認する。

  @spec specs/expenses/spec.md
  @acceptance AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-014, AC-015, AC-016, AC-017, AC-018, AC-019, AC-204, AC-205

  @navigation
  - 遷移先: /expenses/categories - カテゴリ管理画面

  @api
  - GET  /expenses            → 200 ExpenseList       - 全ユーザー一覧取得（SSR load）
  - POST /expenses            → 201 ExpenseWithRelations - 新規作成
  - PUT  /expenses/[id]       → 200 ExpenseWithRelations - 更新
  - DELETE /expenses/[id]     → 204 - 削除
  - POST /expenses/[id]/check   → 200 - 確認（unapproved→checked）
  - POST /expenses/[id]/uncheck → 200 - 確認取消（checked→unapproved）
  - POST /expenses/request    → 200 {count} - 一括承認依頼
  - POST /expenses/cancel     → 200 {count} - 一括申請取り消し
  - POST /expenses/approve    → 200 {count} - 一括承認
-->
<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import {
		Wallet,
		Plus,
		Pencil,
		Trash2,
		Tag,
		MoreVertical,
		SendHorizontal,
		Undo2,
		ThumbsUp
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

	// ---- 承認ワークフロー ----
	// 一括操作ボタンの表示判定は全月対象カウント（data.bulkCounts）を使用する。
	// data.expenses.items は表示中の月のみのため、過去月の件数を見落とす可能性がある。

	let showRequestDialog = $state(false);
	let isRequesting = $state(false);
	let requestError = $state<string | null>(null);

	let showCancelDialog = $state(false);
	let isCanceling = $state(false);

	let showApproveDialog = $state(false);
	let isApproving = $state(false);

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

	// チェックボックス: unapproved → checked
	async function handleCheck(exp: ExpenseWithRelations) {
		actionError = null;
		const res = await fetch(`/expenses/${exp.id}/check`, { method: 'POST' });
		if (res.ok) {
			await invalidateAll();
		} else {
			const err = await res.json().catch(() => null);
			actionError = err?.message ?? '確認済みへの更新に失敗しました';
		}
	}

	// チェックボックス: checked → unapproved
	async function handleUncheck(exp: ExpenseWithRelations) {
		actionError = null;
		const res = await fetch(`/expenses/${exp.id}/uncheck`, { method: 'POST' });
		if (res.ok) {
			await invalidateAll();
		} else {
			const err = await res.json().catch(() => null);
			actionError = err?.message ?? '未承認への戻しに失敗しました';
		}
	}

	// 一括承認依頼
	async function handleBulkRequest() {
		isRequesting = true;
		requestError = null;
		try {
			const res = await fetch('/expenses/request', { method: 'POST' });
			if (res.ok) {
				showRequestDialog = false;
				await invalidateAll();
			} else {
				const err = await res.json().catch(() => null);
				requestError = err?.message ?? '承認依頼に失敗しました';
			}
		} finally {
			isRequesting = false;
		}
	}

	// 一括申請取り消し
	async function handleBulkCancel() {
		isCanceling = true;
		try {
			const res = await fetch('/expenses/cancel', { method: 'POST' });
			if (res.ok) {
				showCancelDialog = false;
				await invalidateAll();
			}
		} finally {
			isCanceling = false;
		}
	}

	// 一括承認
	async function handleBulkApprove() {
		isApproving = true;
		try {
			const res = await fetch('/expenses/approve', { method: 'POST' });
			if (res.ok) {
				showApproveDialog = false;
				await invalidateAll();
			}
		} finally {
			isApproving = false;
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

	// ステータスバッジ設定
	function statusBadge(status: string) {
		switch (status) {
			case 'checked':
				return { label: '確認済み', class: 'bg-bg-warning text-warning' };
			case 'pending':
				return { label: '申請中', class: 'bg-blue-100 text-blue-600' };
			case 'approved':
				return { label: '承認済み', class: 'bg-success/20 text-success' };
			default:
				return { label: '未承認', class: 'bg-destructive/10 text-destructive' };
		}
	}

	// 自分が操作可能な行か（edit/delete/check/uncheck）
	function isMyEditableRow(exp: ExpenseWithRelations): boolean {
		return (
			exp.userId === data.currentUserId && (exp.status === 'unapproved' || exp.status === 'checked')
		);
	}

	function isMyPendingRow(exp: ExpenseWithRelations): boolean {
		return exp.userId === data.currentUserId && exp.status === 'pending';
	}
</script>

<div class="mx-auto max-w-3xl" onclick={() => (openMenuId = null)} role="presentation">
	<!-- Header -->
	<div class="mb-6 flex flex-wrap items-center gap-2">
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

		<!-- 承認依頼ボタン（自分の checked が 1 件以上・全月対象） -->
		{#if data.bulkCounts.myChecked > 0}
			<Button
				data-testid="expense-bulk-request-button"
				onclick={() => (showRequestDialog = true)}
				variant="primary"
				size="md"
			>
				<SendHorizontal size={16} />
				<span class="hidden md:inline">承認依頼する（{data.bulkCounts.myChecked}件）</span>
				<span class="md:hidden">{data.bulkCounts.myChecked}件依頼</span>
			</Button>
		{/if}

		<!-- 申請取り消しボタン（自分の pending が 1 件以上・全月対象） -->
		{#if data.bulkCounts.myPending > 0}
			<Button
				data-testid="expense-bulk-cancel-button"
				onclick={() => (showCancelDialog = true)}
				variant="secondary"
				size="md"
			>
				<Undo2 size={16} />
				<span class="hidden md:inline">申請取り消す（{data.bulkCounts.myPending}件）</span>
				<span class="md:hidden">{data.bulkCounts.myPending}件取消</span>
			</Button>
		{/if}

		<!-- 全件承認ボタン（相手の pending が 1 件以上・全月対象） -->
		{#if data.bulkCounts.othersPending > 0}
			<Button
				data-testid="expense-bulk-approve-button"
				onclick={() => (showApproveDialog = true)}
				variant="primary"
				size="md"
			>
				<ThumbsUp size={16} />
				<span class="hidden md:inline">全件承認する（{data.bulkCounts.othersPending}件）</span>
				<span class="md:hidden">{data.bulkCounts.othersPending}件承認</span>
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
				{@const badge = statusBadge(exp.status)}
				{@const isGrayed = exp.status === 'pending' || exp.status === 'approved'}
				{@const canEdit = isMyEditableRow(exp)}
				{@const isPendingMine = isMyPendingRow(exp)}
				<li
					data-testid="expense-item"
					class="rounded-3xl bg-bg-card p-4 shadow-md transition-all {isGrayed ? 'opacity-60' : ''}"
				>
					<div class="flex items-start gap-3">
						<!-- チェックボックス（自分の unapproved/checked のみ） -->
						{#if canEdit}
							<input
								data-testid="expense-check-button"
								type="checkbox"
								checked={exp.status === 'checked'}
								onchange={() => {
									if (exp.status === 'unapproved') void handleCheck(exp);
									else void handleUncheck(exp);
								}}
								aria-label="{formatAmount(exp.amount)} を{exp.status === 'checked'
									? '未承認に戻す'
									: '確認済みにする'}"
								class="mt-1 h-4 w-4 cursor-pointer rounded accent-accent"
							/>
						{/if}

						<!-- Amount & Badges -->
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
								<!-- Status badge -->
								<span class="rounded-xl px-2 py-0.5 text-xs font-medium {badge.class}">
									{badge.label}
								</span>
							</div>
							<p class="mt-0.5 text-xs text-secondary">{formatDate(exp.createdAt)}</p>
						</div>

						<!-- Actions: 自分の unapproved/checked は操作可、pending は disabled 表示 -->
						{#if canEdit || isPendingMine}
							<!-- デスクトップ: 直接ボタン -->
							<div class="hidden shrink-0 items-center gap-1 md:flex">
								<Button
									data-testid="expense-edit-button"
									variant="secondary"
									size="sm"
									onclick={() => {
										if (canEdit) editingExpense = exp;
									}}
									disabled={!canEdit}
									aria-label="編集"
								>
									<Pencil size={14} />
								</Button>
								<Button
									data-testid="expense-delete-button"
									variant="ghost-destructive"
									size="sm"
									onclick={() => {
										if (canEdit) deletingExpense = exp;
									}}
									disabled={!canEdit}
									aria-label="削除"
								>
									<Trash2 size={14} />
								</Button>
							</div>

							<!-- モバイル: 3点メニュー -->
							<div class="relative shrink-0 md:hidden">
								{#if canEdit}
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
											class="absolute top-full right-0 z-20 mt-1 w-40 rounded-2xl border border-separator bg-bg-card py-1 shadow-md"
											onclick={(e) => e.stopPropagation()}
											onkeydown={(e) => e.stopPropagation()}
											role="menu"
											tabindex={0}
										>
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
	users={data.users}
	onSuccess={handleFormSuccess}
	onCancel={() => (showCreateDialog = false)}
/>
<ExpenseFormDialog
	open={editingExpense !== null}
	mode="edit"
	expense={editingExpense}
	categories={data.categories.items}
	users={data.users}
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

<!-- 承認依頼確認ダイアログ -->
<ConfirmDialog
	open={showRequestDialog}
	title="承認依頼を送信しますか？"
	description={`確認済みの支出 ${data.bulkCounts.myChecked} 件を相手に承認依頼します。LINE で通知が送信されます。`}
	confirmLabel="依頼する"
	loading={isRequesting}
	error={requestError ?? undefined}
	data-testid="expense-request-dialog"
	confirmTestid="expense-request-confirm-button"
	onConfirm={() => void handleBulkRequest()}
	onCancel={() => {
		showRequestDialog = false;
		requestError = null;
	}}
/>

<!-- 申請取り消し確認ダイアログ -->
<ConfirmDialog
	open={showCancelDialog}
	title="申請を取り消しますか？"
	description={`申請中の支出 ${data.bulkCounts.myPending} 件を取り消して「確認済み」に戻します。`}
	confirmLabel="取り消す"
	confirmVariant="destructive"
	loading={isCanceling}
	data-testid="expense-cancel-dialog"
	confirmTestid="expense-cancel-confirm-button"
	onConfirm={() => void handleBulkCancel()}
	onCancel={() => (showCancelDialog = false)}
/>

<!-- 全件承認確認ダイアログ -->
<ConfirmDialog
	open={showApproveDialog}
	title="全件承認しますか？"
	description={`相手から申請中の支出 ${data.bulkCounts.othersPending} 件を承認します。LINE で通知が送信されます。`}
	confirmLabel="承認する"
	loading={isApproving}
	data-testid="expense-approve-dialog"
	confirmTestid="expense-approve-confirm-button"
	onConfirm={() => void handleBulkApprove()}
	onCancel={() => (showApproveDialog = false)}
/>
