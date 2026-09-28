<!--
  @file コンポーネント: ExpenseItem
  @module src/lib/features/expenses/components/ExpenseItem.svelte
  @feature expenses

  @description
  支出一覧の各行コンポーネント。デスクトップ（md+）とモバイル（<md）で異なるレイアウトを提供する。
  status に応じたバッジ表示・操作ボタンの表示/非表示制御を行う。

  @props
  - expense: ExpenseWithRelations - 支出データ（リレーション付き）
  - currentUserId: string - 現在のログインユーザー ID
  - openMenuId: string | null - 開いているメニューの支出 ID
  - checkLoading?: boolean - チェック/アンチェック操作中フラグ（既定 false）
  - onCheckToggle: (id: string, action: 'check' | 'uncheck') => void - チェック切り替えコールバック
  - onEdit: (expense: ExpenseWithRelations) => void - 編集コールバック
  - onDelete: (expense: ExpenseWithRelations) => void - 削除コールバック
  - onMenuToggle: (id: string | null) => void - モバイルメニュー開閉コールバック
-->
<script lang="ts">
	import { EllipsisVertical, Pencil, Trash } from '@lucide/svelte';
	import { fade } from 'svelte/transition';
	import Button from '$lib/components/Button.svelte';
	import Checkbox from '$lib/components/Checkbox.svelte';
	import type { ExpenseStatus, ExpenseWithRelations } from '../types';
	import { formatAmount } from '$lib/utils/format';
	import { formatMonthDay } from '$lib/utils/date';

	let {
		expense,
		currentUserId,
		openMenuId,
		checkLoading = false,
		onCheckToggle,
		onEdit,
		onDelete,
		onMenuToggle
	}: {
		expense: ExpenseWithRelations;
		currentUserId: string;
		openMenuId: string | null;
		checkLoading?: boolean;
		onCheckToggle: (id: string, action: 'check' | 'uncheck') => void;
		onEdit: (expense: ExpenseWithRelations) => void;
		onDelete: (expense: ExpenseWithRelations) => void;
		onMenuToggle: (id: string | null) => void;
	} = $props();

	const isOwner = $derived(expense.userId === currentUserId);
	const isUnapproved = $derived(expense.status === 'unapproved');
	const isChecked = $derived(expense.status === 'checked');
	const isPending = $derived(expense.status === 'pending');
	const isApproved = $derived(expense.status === 'approved');

	// チェックボックス（デスクトップ/モバイル共通）・行メニューボタン（モバイル）の表示判定:
	// 自分の unapproved/checked のみ操作可能
	const canManage = $derived(isOwner && (isUnapproved || isChecked));
	// デスクトップ編集/削除ボタン表示: 自分の支出のみ
	const showDesktopActions = $derived(isOwner);
	// 編集/削除 disabled: pending の場合
	const actionsDisabled = $derived(isPending);
	// 行のグレーアウト: pending/approved
	const rowFaded = $derived(isPending || isApproved);

	const statusConfig: Record<ExpenseStatus, { label: string; class: string }> = {
		unapproved: { label: '未承認', class: 'bg-destructive/10 text-destructive' },
		checked: { label: '確認済み', class: 'bg-bg-warning text-warning' },
		pending: { label: '申請中', class: 'bg-accent/10 text-accent' },
		approved: { label: '承認済み', class: 'bg-success/10 text-success' }
	};

	const currentStatus = $derived(statusConfig[expense.status]);

	// SSR（UTC）とブラウザで表示がずれないよう JST 固定で整形する
	function formatDate(dateStr: string): string {
		return formatMonthDay(new Date(dateStr));
	}

	function handleCheckboxChange() {
		onCheckToggle(expense.id, isChecked ? 'uncheck' : 'check');
	}

	function handleMenuToggle(e: MouseEvent) {
		e.stopPropagation();
		onMenuToggle(openMenuId === expense.id ? null : expense.id);
	}
</script>

<li
	data-testid="expense-item"
	class="rounded-2xl bg-bg-card p-3 shadow-sm transition-opacity md:p-4 {rowFaded
		? 'opacity-50'
		: ''}"
>
	<!-- デスクトップレイアウト（md+） -->
	<div class="hidden items-center gap-3 md:flex">
		<!-- チェックボックス -->
		{#if canManage}
			<Checkbox
				data-testid="expense-check-button"
				checked={isChecked}
				onchange={handleCheckboxChange}
				disabled={checkLoading}
				aria-label="確認済み"
			/>
		{:else}
			<div class="h-5 w-5 shrink-0"></div>
		{/if}

		<!-- 金額 -->
		<span class="min-w-[80px] font-semibold text-label">{formatAmount(expense.amount)}</span>

		<!-- カテゴリバッジ -->
		<span class="rounded-xl bg-bg-secondary px-2 py-0.5 text-xs text-secondary">
			{expense.category.name}
		</span>

		<!-- 支払者バッジ -->
		<span class="rounded-xl bg-bg-secondary px-2 py-0.5 text-xs text-secondary">
			{expense.payer.name}
		</span>

		<!-- ステータスバッジ -->
		<span class="rounded-xl px-2 py-0.5 text-xs font-medium {currentStatus.class}">
			{currentStatus.label}
		</span>

		<!-- スペーサー -->
		<div class="flex-1"></div>

		<!-- 操作ボタン（自分の支出のみ、approved は非表示） -->
		{#if showDesktopActions && !isApproved}
			<Button
				data-testid="expense-edit-button"
				variant="secondary"
				size="sm"
				onclick={() => onEdit(expense)}
				disabled={actionsDisabled}
				class={actionsDisabled ? 'cursor-not-allowed opacity-50' : ''}
				aria-label="編集"
				type="button"
			>
				<Pencil size={14} />
			</Button>
			<Button
				data-testid="expense-delete-button"
				variant="ghost-destructive"
				size="sm"
				onclick={() => onDelete(expense)}
				disabled={actionsDisabled}
				class={actionsDisabled ? 'cursor-not-allowed opacity-50' : ''}
				aria-label="削除"
				type="button"
			>
				<Trash size={14} />
			</Button>
		{/if}
	</div>

	<!-- モバイルレイアウト（<md） -->
	<div class="md:hidden">
		<!-- 1行目: チェックボックス + 金額 + メニューボタン -->
		<div class="flex items-center gap-2">
			{#if canManage}
				<Checkbox
					data-testid="expense-check-button"
					checked={isChecked}
					onchange={handleCheckboxChange}
					disabled={checkLoading}
					class="shrink-0"
					aria-label="確認済み"
				/>
			{:else}
				<div class="h-5 w-5 shrink-0"></div>
			{/if}
			<span class="flex-1 text-lg font-semibold text-label">{formatAmount(expense.amount)}</span>

			<!-- 行メニューボタン（自分の unapproved/checked のみ） -->
			{#if canManage}
				<div class="relative">
					<Button
						data-testid="expense-menu-button"
						onclick={handleMenuToggle}
						variant="ghost"
						size="icon"
						aria-label="操作メニューを開く"
						aria-expanded={openMenuId === expense.id}
						aria-controls="expense-menu-{expense.id}"
					>
						<EllipsisVertical size={18} aria-hidden="true" />
					</Button>

					{#if openMenuId === expense.id}
						<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
						<!-- disclosure パターン: 外側クリックで閉じる判定から除外するためだけの stopPropagation（操作要素は内部の button） -->
						<div
							id="expense-menu-{expense.id}"
							data-testid="expense-menu"
							in:fade={{ duration: 100 }}
							out:fade={{ duration: 80 }}
							onclick={(e) => e.stopPropagation()}
							class="absolute top-full right-0 z-20 mt-1 w-40 rounded-2xl border border-separator bg-bg-card py-1 shadow-md"
						>
							<Button
								data-testid="expense-edit-button"
								onclick={() => {
									onMenuToggle(null);
									onEdit(expense);
								}}
								variant="menu-item"
								size="menu"
							>
								<Pencil size={14} aria-hidden="true" />
								編集
							</Button>
							<Button
								data-testid="expense-delete-button"
								onclick={() => {
									onMenuToggle(null);
									onDelete(expense);
								}}
								variant="menu-item-destructive"
								size="menu"
							>
								<Trash size={14} aria-hidden="true" />
								削除
							</Button>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- 2行目: バッジ + 登録日 -->
		<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
			<span class="rounded-xl bg-bg-secondary px-2 py-0.5 text-xs text-secondary">
				{expense.category.name}
			</span>
			<span class="rounded-xl bg-bg-secondary px-2 py-0.5 text-xs text-secondary">
				{expense.payer.name}
			</span>
			<span class="rounded-xl px-2 py-0.5 text-xs font-medium {currentStatus.class}">
				{currentStatus.label}
			</span>
			<span class="ml-auto text-xs text-secondary">{formatDate(expense.createdAt)}</span>
		</div>
	</div>
</li>
