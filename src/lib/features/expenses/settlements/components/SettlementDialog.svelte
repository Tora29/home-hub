<!--
  @file コンポーネント: SettlementDialog
  @module src/lib/features/expenses/settlements/components/SettlementDialog.svelte
  @feature expenses

  @description
  精算額確認モーダル。支出一覧で選択中の月について、承認済み支出を折半した差額
  （誰が誰にいくら払うか）と各自の支払額を表示する。精算の記録は持たない（確認のみ）。

  @props
  - open: boolean - 表示状態
  - summary: SettlementSummary - 選択中の月の精算額
  - currentUserId: string - ログイン中ユーザーID（支払額の表示順で自分を先頭にする）
  - currentMonth: string - サーバー基準（JST）の当月 YYYY-MM（当月は途中経過である旨を表示）
  - onClose: () => void - 閉じる時のコールバック
-->
<script lang="ts">
	import { scale } from 'svelte/transition';
	import { ArrowRight, X } from '@lucide/svelte';
	import Button from '$lib/components/Button.svelte';
	import Dialog from '$lib/components/Dialog.svelte';
	import { formatAmount } from '$lib/utils/format';
	import type { SettlementSummary } from '../types';

	let {
		open,
		summary,
		currentUserId,
		currentMonth,
		onClose
	}: {
		open: boolean;
		summary: SettlementSummary;
		currentUserId: string;
		currentMonth: string;
		onClose: () => void;
	} = $props();

	const title = $derived.by(() => {
		const [y, m] = summary.month.split('-');
		return `${y}年${m}月の精算`;
	});

	// 自分を先頭に表示する
	const members = $derived(
		[...summary.members].sort(
			(a, b) => Number(b.userId === currentUserId) - Number(a.userId === currentUserId)
		)
	);
</script>

<Dialog {open} {onClose} aria-label={title} data-testid="settlement-dialog">
	{#if open}
		<div
			in:scale={{ duration: 150, start: 0.95 }}
			out:scale={{ duration: 100, start: 0.95 }}
			class="w-full max-w-md rounded-3xl bg-bg-card p-6 shadow-md"
		>
			<div class="mb-6 flex items-center justify-between gap-2">
				<h2 class="text-lg font-medium text-label">{title}</h2>
				<Button variant="ghost" size="icon" aria-label="閉じる" onclick={onClose}>
					<X size={18} aria-hidden="true" />
				</Button>
			</div>

			<!-- 差額の支払い -->
			<div data-testid="settlement-transfer" class="mb-6 text-center">
				{#if summary.transfer}
					<p class="flex items-center justify-center gap-2 text-base text-label">
						<span>{summary.transfer.fromName}</span>
						<ArrowRight size={18} class="text-secondary" aria-hidden="true" />
						<span class="sr-only">から</span>
						<span>{summary.transfer.toName}</span>
						<span class="sr-only">へ</span>
					</p>
					<p class="mt-1 text-3xl font-semibold text-label">
						{formatAmount(summary.transfer.amount)}
					</p>
				{:else}
					<p class="text-base text-secondary">差額はありません</p>
				{/if}
			</div>

			<!-- 内訳 -->
			<dl class="space-y-2 border-t border-separator pt-4 text-sm">
				{#each members as member (member.userId)}
					<div data-testid="settlement-member-paid" class="flex justify-between">
						<dt class="text-secondary">{member.name} の支払い</dt>
						<dd class="text-label">{formatAmount(member.paid)}</dd>
					</div>
				{/each}
				<div class="flex justify-between border-t border-separator pt-2">
					<dt class="text-secondary">承認済み合計（{summary.approvedCount}件）</dt>
					<dd data-testid="settlement-total" class="font-medium text-label">
						{formatAmount(summary.total)}
					</dd>
				</div>
			</dl>

			<!-- 注意書き -->
			{#if summary.unapprovedCount > 0 || summary.month === currentMonth}
				<ul data-testid="settlement-notes" class="mt-4 space-y-1 text-xs text-secondary">
					{#if summary.unapprovedCount > 0}
						<li>未承認の支出 {summary.unapprovedCount} 件は含まれていません</li>
					{/if}
					{#if summary.month === currentMonth}
						<li>今月は途中経過です</li>
					{/if}
				</ul>
			{/if}
		</div>
	{/if}
</Dialog>
