<!--
  @file コンポーネント: DashboardPage
  @module src/lib/features/dashboard/components/DashboardPage.svelte
  @feature dashboard

  @description
  ダッシュボード画面のUIロジック全体を担うコンポーネント。
  月別・全期間を切り替えながら、全体合計・支払者別合計・カテゴリ別合計を確認できる。
  期間・月は URL クエリ（`?period=&month=`）で持ち、切り替え時は goto で SSR load を再実行する。
  相手が承認依頼中（pending）の支出が 1 件以上ある場合は警告バナーを表示する。

  @props
  - unapprovedCount: number - 相手の承認依頼中（pending）支出件数（全期間）
  - summary: DashboardSummary - 集計サマリー
  - currentMonth: string - 当月 YYYY-MM（JST・サーバー基準）
  - period: 'month' | 'all' - 表示中の期間
  - month: string - 表示中の月 YYYY-MM（period=all のときは直前の選択月）
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { TriangleAlert } from '@lucide/svelte';
	import Button from '$lib/components/Button.svelte';
	import Select from '$lib/components/Select.svelte';
	import { generateMonthOptions } from '$lib/utils/date';
	import { formatAmount } from '$lib/utils/format';
	import type { DashboardSummary } from '../types';

	let {
		unapprovedCount,
		summary,
		currentMonth,
		period,
		month
	}: {
		unapprovedCount: number;
		summary: DashboardSummary;
		currentMonth: string;
		period: 'month' | 'all';
		month: string;
	} = $props();

	const monthOptions = $derived(generateMonthOptions(currentMonth));

	// Select の bind 用。URL（props）の変化に追従しつつ、選択直後の値も保持する（書き込み可能 $derived）
	let selectedMonth = $derived(month);

	async function navigate(next: { period: 'month' | 'all'; month: string }) {
		const params = new URLSearchParams(
			next.period === 'all' ? { period: 'all' } : { period: 'month', month: next.month }
		);
		await goto(`/?${params}`, { keepFocus: true, replaceState: true, noScroll: true });
	}

	async function handleMonthChange(e: Event) {
		const select = e.target as HTMLSelectElement;
		await navigate({ period: 'month', month: select.value });
	}
</script>

{#if unapprovedCount > 0}
	<div
		data-testid="expense-pending-alert"
		class="mb-6 flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3"
	>
		<TriangleAlert size={18} class="shrink-0 text-destructive" aria-hidden="true" />
		<p class="flex-1 text-sm text-destructive">
			未確認の支出が {unapprovedCount} 件あります
		</p>
		<a
			href="/expenses"
			class="shrink-0 text-sm font-medium text-destructive underline hover:no-underline"
		>
			確認する
		</a>
	</div>
{/if}

<h1 class="mb-6 text-2xl font-medium text-label">ホーム</h1>

<!-- 期間切り替えタブ（選択状態は aria-pressed で公開） -->
<div class="mb-4 flex items-center gap-2">
	<Button
		data-testid="dashboard-period-tab-month"
		aria-pressed={period === 'month'}
		variant={period === 'month' ? 'primary' : 'secondary'}
		size="sm"
		onclick={() => navigate({ period: 'month', month: selectedMonth })}
	>
		月別
	</Button>
	<Button
		data-testid="dashboard-period-tab-all"
		aria-pressed={period === 'all'}
		variant={period === 'all' ? 'primary' : 'secondary'}
		size="sm"
		onclick={() => navigate({ period: 'all', month: selectedMonth })}
	>
		全期間
	</Button>

	{#if period === 'month'}
		<Select
			data-testid="dashboard-month-select"
			aria-label="表示する月"
			bind:value={selectedMonth}
			onchange={handleMonthChange}
			size="sm"
			class="ml-auto"
		>
			{#each monthOptions as opt (opt.value)}
				<option value={opt.value}>{opt.label}</option>
			{/each}
		</Select>
	{/if}
</div>

<section class="space-y-6">
	<div class="rounded-3xl bg-bg-card p-6 shadow-md">
		<p class="mb-1 text-sm text-secondary">{period === 'all' ? '全期間合計' : '月間合計'}</p>
		<p data-testid="dashboard-total" class="text-3xl font-semibold text-label">
			{formatAmount(summary.overall)}
		</p>
	</div>

	<div class="rounded-3xl bg-bg-card p-6 shadow-md">
		<h2 class="mb-3 text-sm font-medium text-secondary">支払者別合計</h2>
		{#if summary.byPayer.length === 0}
			<p data-testid="dashboard-payer-summary-empty" class="text-sm text-secondary">
				支払者データがありません
			</p>
		{:else}
			<ul data-testid="dashboard-payer-summary-list" class="space-y-2">
				{#each summary.byPayer as item (item.payerId)}
					<li data-testid="dashboard-payer-summary-item" class="flex items-center justify-between">
						<span class="text-sm text-label">{item.payerName}</span>
						<span class="text-sm font-medium text-label">{formatAmount(item.total)}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<div class="rounded-3xl bg-bg-card p-6 shadow-md">
		<h2 class="mb-3 text-sm font-medium text-secondary">カテゴリ別合計</h2>
		{#if summary.byCategory.length === 0}
			<p data-testid="dashboard-category-summary-empty" class="text-sm text-secondary">
				カテゴリデータがありません
			</p>
		{:else}
			<ul data-testid="dashboard-category-summary-list" class="space-y-2">
				{#each summary.byCategory as item (item.categoryId)}
					<li data-testid="dashboard-category-summary-item">
						<div class="flex items-center justify-between">
							<span class="text-sm text-label">{item.categoryName}</span>
							<span class="text-sm font-medium text-label">{formatAmount(item.total)}</span>
						</div>
						{#if item.byPayer.length > 0}
							<ul class="mt-1 space-y-0.5 pl-4">
								{#each item.byPayer as payer (payer.payerId)}
									<li
										data-testid="dashboard-category-payer-item"
										class="flex items-center justify-between"
									>
										<span class="text-xs text-secondary">{payer.payerName}</span>
										<span class="text-xs text-secondary">{formatAmount(payer.total)}</span>
									</li>
								{/each}
							</ul>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</section>
