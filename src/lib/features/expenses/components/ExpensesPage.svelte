<!--
  @file コンポーネント: ExpensesPage
  @module src/lib/features/expenses/components/ExpensesPage.svelte
  @feature expenses

  @description
  支出一覧ページのUIロジック全体を担うコンポーネント。
  承認ワークフロー操作（check/uncheck/request/cancel/approve）と
  CRUD 操作（create/edit/delete）、選択月の精算額確認（モーダル）をサポートする。

  @props
  - expenses: ExpenseWithRelations[] - 支出一覧
  - monthTotal: number - 月合計金額
  - categories: { items: Category[] } - カテゴリ一覧
  - users: User[] - ユーザー一覧
  - currentUserId: string - ログイン中ユーザーID
  - selectedMonth: string - 選択中の月 YYYY-MM
  - currentMonth: string - サーバー基準（JST）の当月 YYYY-MM。月選択肢の起点
  - partnerPendingCount: number - 相手の未承認件数（全期間）
  - settlement: SettlementSummary | null - 選択月の精算額（null のとき精算ボタン非表示）
-->
<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { SvelteSet } from 'svelte/reactivity';
	import { HandCoins, Plus, Tag } from '@lucide/svelte';
	import Button from '$lib/components/Button.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Select from '$lib/components/Select.svelte';
	import ExpenseItem from './ExpenseItem.svelte';
	import ExpenseFormDialog from './ExpenseFormDialog.svelte';
	import SettlementDialog from '../settlements/components/SettlementDialog.svelte';
	import type { ExpenseWithRelations, Category, User } from '../types';
	import type { SettlementSummary } from '../settlements/types';
	import { generateMonthOptions } from '$lib/utils/date';
	import { formatAmount } from '$lib/utils/format';

	let {
		expenses,
		monthTotal,
		categories,
		users,
		currentUserId,
		selectedMonth,
		currentMonth,
		partnerPendingCount,
		settlement
	}: {
		expenses: ExpenseWithRelations[];
		monthTotal: number;
		categories: { items: Category[] };
		users: User[];
		currentUserId: string;
		selectedMonth: string;
		currentMonth: string;
		partnerPendingCount: number;
		settlement: SettlementSummary | null;
	} = $props();

	// ---- ダイアログ状態 ----
	let createDialogOpen = $state(false);
	let settlementDialogOpen = $state(false);
	let editTarget = $state<ExpenseWithRelations | null>(null);
	let deleteTarget = $state<ExpenseWithRelations | null>(null);
	let deleteLoading = $state(false);
	let deleteError = $state('');

	// 一括操作ダイアログ
	let requestDialogOpen = $state(false);
	let requestLoading = $state(false);
	let requestError = $state('');
	let cancelDialogOpen = $state(false);
	let cancelLoading = $state(false);
	let cancelError = $state('');
	let approveDialogOpen = $state(false);
	let approveLoading = $state(false);
	let approveError = $state('');

	// check/uncheck ローディング（per-item）・エラー（一覧上部に表示）
	let checkLoadingIds = new SvelteSet<string>();
	let actionError = $state('');

	// モバイルメニュー（開いている行の ID）
	let openMenuId = $state<string | null>(null);

	// ---- 算出値 ----
	const myCheckedCount = $derived(
		expenses.filter((e) => e.userId === currentUserId && e.status === 'checked').length
	);
	const myPendingCount = $derived(
		expenses.filter((e) => e.userId === currentUserId && e.status === 'pending').length
	);

	// ---- 月選択肢生成（常に当月を起点とした過去13か月分固定） ----
	const monthOptions = $derived(generateMonthOptions(currentMonth));

	// ---- 月切り替え ----
	async function handleMonthChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		const params = new URLSearchParams({ month: select.value });
		await goto(`/expenses?${params}`, { keepFocus: true, replaceState: true, noScroll: true });
	}

	// ---- Check / Uncheck ----
	async function handleCheckToggle(id: string, action: 'check' | 'uncheck') {
		actionError = '';
		checkLoadingIds.add(id);
		try {
			const res = await fetch(`/expenses/${id}/${action}`, { method: 'POST' });
			if (!res.ok) {
				const err = (await res.json().catch(() => ({}))) as { message?: string };
				actionError = err.message ?? '操作に失敗しました';
				return;
			}
			await invalidateAll();
		} catch {
			actionError = '通信エラーが発生しました';
		} finally {
			checkLoadingIds.delete(id);
		}
	}

	// ---- 支出登録 ----
	async function handleCreateSuccess() {
		createDialogOpen = false;
		await invalidateAll();
	}

	// ---- 支出編集 ----
	async function handleEditSuccess() {
		editTarget = null;
		await invalidateAll();
	}

	// ---- 支出削除 ----
	async function handleDelete() {
		if (!deleteTarget) return;
		deleteLoading = true;
		deleteError = '';
		try {
			const res = await fetch(`/expenses/${deleteTarget.id}`, { method: 'DELETE' });
			if (!res.ok) {
				const err = (await res.json().catch(() => ({}))) as { message?: string };
				deleteError = err.message ?? '削除に失敗しました';
				return;
			}
			deleteTarget = null;
			await invalidateAll();
		} catch {
			deleteError = '通信エラーが発生しました';
		} finally {
			deleteLoading = false;
		}
	}

	// ---- 一括操作共通処理（fetch→エラー処理→onSuccess→invalidateAll） ----
	async function runBulkAction({
		url,
		defaultErrorMessage,
		setError,
		onSuccess
	}: {
		url: string;
		defaultErrorMessage: string;
		setError: (message: string) => void;
		onSuccess: () => void;
	}): Promise<void> {
		try {
			const res = await fetch(url, { method: 'POST' });
			if (!res.ok) {
				const err = (await res.json().catch(() => ({}))) as { message?: string };
				setError(err.message ?? defaultErrorMessage);
				return;
			}
			onSuccess();
			await invalidateAll();
		} catch {
			setError('通信エラーが発生しました');
		}
	}

	// ---- 一括承認依頼 ----
	async function handleRequest() {
		requestLoading = true;
		requestError = '';
		try {
			await runBulkAction({
				url: '/expenses/request',
				defaultErrorMessage: '承認依頼に失敗しました',
				setError: (message) => (requestError = message),
				onSuccess: () => (requestDialogOpen = false)
			});
		} finally {
			requestLoading = false;
		}
	}

	// ---- 一括申請取り消し ----
	async function handleCancel() {
		cancelLoading = true;
		cancelError = '';
		try {
			await runBulkAction({
				url: '/expenses/cancel',
				defaultErrorMessage: '申請取り消しに失敗しました',
				setError: (message) => (cancelError = message),
				onSuccess: () => (cancelDialogOpen = false)
			});
		} finally {
			cancelLoading = false;
		}
	}

	// ---- 一括承認 ----
	async function handleApprove() {
		approveLoading = true;
		approveError = '';
		try {
			await runBulkAction({
				url: '/expenses/approve',
				defaultErrorMessage: '承認に失敗しました',
				setError: (message) => (approveError = message),
				onSuccess: () => (approveDialogOpen = false)
			});
		} finally {
			approveLoading = false;
		}
	}

	// メニュー外クリックで閉じる
	function handlePageClick() {
		if (openMenuId) openMenuId = null;
	}

	// Escape でメニューを閉じる（モーダル表示中は dialog 側が処理する）
	function handlePageKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && openMenuId) openMenuId = null;
	}
</script>

<!-- メニュー外クリック・Escape でメニューを閉じる -->
<svelte:window onclick={handlePageClick} onkeydown={handlePageKeydown} />

<div class="mx-auto max-w-6xl">
	<!-- ヘッダーエリア -->
	<div class="mb-4 space-y-2">
		<!-- Row 1: 月セレクト + カテゴリ管理 + 登録ボタン -->
		<div class="flex items-center gap-2">
			<Select
				data-testid="expense-month-select"
				value={selectedMonth}
				onchange={handleMonthChange}
				class="w-40"
			>
				{#each monthOptions as opt (opt.value)}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</Select>
			<a
				href="/expenses/categories"
				class="inline-flex items-center gap-1.5 rounded-2xl border border-separator px-3 py-2 text-sm text-secondary hover:text-label"
			>
				<Tag size={14} />
				<span>カテゴリ</span>
			</a>
			<Button
				data-testid="expense-create-button"
				variant="primary"
				size="md"
				onclick={() => (createDialogOpen = true)}
				type="button"
				aria-label="支出を登録"
				class="ml-auto"
			>
				<Plus size={18} />
				<span class="hidden md:inline">登録</span>
			</Button>
		</div>

		<!-- Row 2: 一括操作ボタン（条件付き表示・右寄せ） -->
		{#if myCheckedCount > 0 || myPendingCount > 0 || partnerPendingCount > 0}
			<div class="flex items-center justify-end gap-2">
				{#if myCheckedCount > 0}
					<Button
						data-testid="expense-bulk-request-button"
						variant="primary"
						size="md"
						onclick={() => (requestDialogOpen = true)}
						type="button"
					>
						承認依頼する（{myCheckedCount}件）
					</Button>
				{/if}
				{#if myPendingCount > 0}
					<Button
						data-testid="expense-bulk-cancel-button"
						variant="secondary"
						size="md"
						onclick={() => (cancelDialogOpen = true)}
						type="button"
					>
						申請取り消す（{myPendingCount}件）
					</Button>
				{/if}
				{#if partnerPendingCount > 0}
					<Button
						data-testid="expense-bulk-approve-button"
						variant="primary"
						size="md"
						onclick={() => (approveDialogOpen = true)}
						type="button"
					>
						全件承認する（{partnerPendingCount}件）
					</Button>
				{/if}
			</div>
		{/if}
	</div>

	<!-- 月間合計 + 精算額確認 -->
	<div class="mb-2 flex items-center justify-between gap-2">
		<p data-testid="expense-total" class="text-xl font-semibold text-label">
			{formatAmount(monthTotal)}
		</p>
		{#if settlement}
			<Button
				data-testid="expense-settlement-button"
				variant="secondary"
				size="md"
				onclick={() => (settlementDialogOpen = true)}
			>
				<HandCoins size={14} aria-hidden="true" />
				<span>精算</span>
			</Button>
		{/if}
	</div>

	<!-- check/uncheck エラー -->
	{#if actionError}
		<p
			data-testid="expense-action-error"
			role="alert"
			class="mb-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
		>
			{actionError}
		</p>
	{/if}

	<!-- 支出一覧 / 空状態 -->
	{#if expenses.length === 0}
		<p data-testid="expense-empty" class="py-16 text-center text-secondary">支出はまだありません</p>
	{:else}
		<ul data-testid="expense-list" class="flex flex-col gap-2">
			{#each expenses as expense (expense.id)}
				<ExpenseItem
					{expense}
					{currentUserId}
					{openMenuId}
					checkLoading={checkLoadingIds.has(expense.id)}
					onCheckToggle={handleCheckToggle}
					onEdit={(exp) => (editTarget = exp)}
					onDelete={(exp) => (deleteTarget = exp)}
					onMenuToggle={(id) => (openMenuId = id)}
				/>
			{/each}
		</ul>
	{/if}
</div>

<!-- 支出登録ダイアログ -->
<ExpenseFormDialog
	open={createDialogOpen}
	mode="create"
	categories={categories.items}
	{users}
	onSuccess={handleCreateSuccess}
	onClose={() => (createDialogOpen = false)}
/>

<!-- 支出編集ダイアログ -->
<ExpenseFormDialog
	open={editTarget !== null}
	mode="edit"
	expense={editTarget}
	categories={categories.items}
	{users}
	onSuccess={handleEditSuccess}
	onClose={() => (editTarget = null)}
/>

<!-- 精算額確認ダイアログ -->
{#if settlement}
	<SettlementDialog
		open={settlementDialogOpen}
		summary={settlement}
		{currentUserId}
		{currentMonth}
		onClose={() => (settlementDialogOpen = false)}
	/>
{/if}

<!-- 支出削除確認ダイアログ -->
<ConfirmDialog
	open={deleteTarget !== null}
	title="支出を削除しますか？"
	description={deleteTarget
		? `${formatAmount(deleteTarget.amount)}（${deleteTarget.category.name}）を削除します。この操作は元に戻せません。`
		: ''}
	confirmLabel="削除する"
	confirmVariant="destructive"
	loading={deleteLoading}
	error={deleteError}
	data-testid="expense-delete-dialog"
	confirmTestid="expense-delete-confirm-button"
	cancelTestid="expense-delete-cancel-button"
	onConfirm={() => void handleDelete()}
	onCancel={() => {
		deleteTarget = null;
		deleteError = '';
	}}
/>

<!-- 承認依頼確認ダイアログ（失敗時はダイアログを閉じずエラー表示） -->
<ConfirmDialog
	open={requestDialogOpen}
	title="承認依頼しますか？"
	description={`確認済みの支出 ${myCheckedCount} 件を承認依頼します。相手に LINE 通知が送信されます。`}
	confirmLabel="依頼する"
	loading={requestLoading}
	error={requestError}
	data-testid="expense-request-dialog"
	confirmTestid="expense-request-confirm-button"
	cancelTestid="expense-request-cancel-button"
	onConfirm={() => void handleRequest()}
	onCancel={() => {
		requestDialogOpen = false;
		requestError = '';
	}}
/>

<!-- 申請取り消し確認ダイアログ -->
<ConfirmDialog
	open={cancelDialogOpen}
	title="申請を取り消しますか？"
	description={`申請中の支出 ${myPendingCount} 件を取り消します。確認済み状態に戻ります。`}
	confirmLabel="取り消す"
	confirmVariant="destructive"
	loading={cancelLoading}
	error={cancelError}
	data-testid="expense-cancel-dialog"
	confirmTestid="expense-cancel-confirm-button"
	cancelTestid="expense-cancel-cancel-button"
	onConfirm={() => void handleCancel()}
	onCancel={() => {
		cancelDialogOpen = false;
		cancelError = '';
	}}
/>

<!-- 全件承認確認ダイアログ -->
<ConfirmDialog
	open={approveDialogOpen}
	title="全件承認しますか？"
	description={`相手の申請中支出 ${partnerPendingCount} 件を承認します。相手に LINE 通知が送信されます。`}
	confirmLabel="承認する"
	loading={approveLoading}
	error={approveError}
	data-testid="expense-approve-dialog"
	confirmTestid="expense-approve-confirm-button"
	cancelTestid="expense-approve-cancel-button"
	onConfirm={() => void handleApprove()}
	onCancel={() => {
		approveDialogOpen = false;
		approveError = '';
	}}
/>
