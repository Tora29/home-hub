<!--
  @file コンポーネント: ExpenseItem
  @module src/routes/expenses/components/ExpenseItem.svelte
  @feature expenses

  @description
  支出一覧の各行コンポーネント。デスクトップ（md+）とモバイル（<md）で異なるレイアウトを提供する。
  status に応じたバッジ表示・操作ボタンの表示/非表示制御を行う。

  @spec specs/expenses/spec.md
  @acceptance AC-004, AC-005, AC-015, AC-016, AC-017, AC-018, AC-019

  @props
  - expense: ExpenseWithRelations - 支出データ（リレーション付き）
  - currentUserId: string - 現在のログインユーザー ID
  - openMenuId: string | null - 開いているメニューの支出 ID
  - onCheckToggle: (id: string, action: 'check' | 'uncheck') => void - チェック切り替えコールバック
  - onEdit: (expense: ExpenseWithRelations) => void - 編集コールバック
  - onDelete: (expense: ExpenseWithRelations) => void - 削除コールバック
  - onMenuToggle: (id: string | null) => void - モバイルメニュー開閉コールバック
-->
<script lang="ts">
	import { MoreVertical, Pencil, Trash2 } from '@lucide/svelte';
	import { fade } from 'svelte/transition';
	import Button from '$lib/components/Button.svelte';
	import type { ExpenseWithRelations } from '../_lib/types';

	let {
		expense,
		currentUserId,
		openMenuId,
		onCheckToggle,
		onEdit,
		onDelete,
		onMenuToggle
	}: {
		expense: ExpenseWithRelations;
		currentUserId: string;
		openMenuId: string | null;
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

	// チェックボックス表示: 自分の unapproved/checked のみ
	const showCheckbox = $derived(isOwner && (isUnapproved || isChecked));
	// 行メニューボタン表示: 自分の unapproved/checked のみ（モバイル）
	const showMenuButton = $derived(isOwner && (isUnapproved || isChecked));
	// デスクトップ編集/削除ボタン表示: 自分の支出のみ
	const showDesktopActions = $derived(isOwner);
	// 編集/削除 disabled: pending の場合
	const actionsDisabled = $derived(isPending);
	// 行のグレーアウト: pending/approved
	const rowFaded = $derived(isPending || isApproved);

	const statusConfig: Record<string, { label: string; class: string }> = {
		unapproved: { label: '未承認', class: 'bg-destructive/10 text-destructive' },
		checked: { label: '確認済み', class: 'bg-bg-warning text-warning' },
		pending: { label: '申請中', class: 'bg-accent/10 text-accent' },
		approved: { label: '承認済み', class: 'bg-success/10 text-success' }
	};

	const currentStatus = $derived(statusConfig[expense.status] ?? statusConfig.unapproved);

	function formatAmount(amount: number): string {
		return `¥${amount.toLocaleString('ja-JP')}`;
	}

	function formatDate(dateStr: string): string {
		const d = new Date(dateStr);
		return `${d.getMonth() + 1}/${d.getDate()}`;
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
		{#if showCheckbox}
			<input
				data-testid="expense-check-button"
				type="checkbox"
				checked={isChecked}
				onchange={handleCheckboxChange}
				class="h-4 w-4 cursor-pointer accent-accent"
				aria-label="確認済みにする"
			/>
		{:else}
			<div class="h-4 w-4 shrink-0"></div>
		{/if}

		<!-- 金額 -->
		<span class="min-w-[80px] font-semibold text-label">{formatAmount(expense.amount)}</span>

		<!-- カテゴリバッジ -->
		<span class="rounded-xl bg-bg-secondary px-2 py-0.5 text-xs text-secondary">
			{expense.category.name}
		</span>

		<!-- 支払者バッジ -->
		{#if expense.payer}
			<span class="rounded-xl bg-bg-secondary px-2 py-0.5 text-xs text-secondary">
				{expense.payer.name}
			</span>
		{/if}

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
				<Trash2 size={14} />
			</Button>
		{/if}
	</div>

	<!-- モバイルレイアウト（<md） -->
	<div class="md:hidden">
		<!-- 1行目: チェックボックス + 金額 + メニューボタン -->
		<div class="flex items-center gap-2">
			{#if showCheckbox}
				<input
					data-testid="expense-check-button"
					type="checkbox"
					checked={isChecked}
					onchange={handleCheckboxChange}
					class="h-4 w-4 shrink-0 cursor-pointer accent-accent"
					aria-label="確認済みにする"
				/>
			{:else}
				<div class="h-4 w-4 shrink-0"></div>
			{/if}
			<span class="flex-1 text-lg font-semibold text-label">{formatAmount(expense.amount)}</span>

			<!-- 行メニューボタン（自分の unapproved/checked のみ） -->
			{#if showMenuButton}
				<div class="relative">
					<button
						data-testid="expense-menu-button"
						onclick={handleMenuToggle}
						class="rounded-xl p-1.5 text-secondary hover:bg-bg-secondary hover:text-label"
						aria-label="操作メニューを開く"
						aria-expanded={openMenuId === expense.id}
						type="button"
					>
						<MoreVertical size={18} />
					</button>

					{#if openMenuId === expense.id}
						<div
							data-testid="expense-menu"
							role="menu"
							tabindex={0}
							in:fade={{ duration: 100 }}
							out:fade={{ duration: 80 }}
							onclick={(e) => e.stopPropagation()}
							onkeydown={(e) => e.stopPropagation()}
							class="absolute top-full right-0 z-20 mt-1 w-40 rounded-2xl border border-separator bg-bg-card py-1 shadow-md"
						>
							<button
								data-testid="expense-edit-button"
								onclick={() => {
									onMenuToggle(null);
									onEdit(expense);
								}}
								class="flex w-full items-center gap-2 px-4 py-2 text-sm text-label hover:bg-bg-secondary"
								role="menuitem"
								type="button"
							>
								<Pencil size={14} />
								編集
							</button>
							<button
								data-testid="expense-delete-button"
								onclick={() => {
									onMenuToggle(null);
									onDelete(expense);
								}}
								class="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-bg-secondary"
								role="menuitem"
								type="button"
							>
								<Trash2 size={14} />
								削除
							</button>
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
			{#if expense.payer}
				<span class="rounded-xl bg-bg-secondary px-2 py-0.5 text-xs text-secondary">
					{expense.payer.name}
				</span>
			{/if}
			<span class="rounded-xl px-2 py-0.5 text-xs font-medium {currentStatus.class}">
				{currentStatus.label}
			</span>
			<span class="ml-auto text-xs text-secondary">{formatDate(expense.createdAt)}</span>
		</div>
	</div>
</li>
