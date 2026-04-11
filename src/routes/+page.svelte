<!--
  @file 画面: ダッシュボード
  @module src/routes/+page.svelte
  @feature dashboard

  @description
  アプリケーションのトップページ。
  月別・全期間を切り替えながら、全体合計・支払者別合計・カテゴリ別合計を確認できる。
  全期間で承認対象パートナーからの pending 支出が 1 件以上ある場合は承認依頼バナーを表示する。

  @spec specs/dashboard/spec.md
  @acceptance AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-201, AC-202, AC-203
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { AlertTriangle } from '@lucide/svelte';
	import Button from '$lib/components/Button.svelte';
	import Select from '$lib/components/Select.svelte';
	import { generateMonthOptions } from '$lib/utils/date';

	let { data } = $props();

	type Summary = typeof data.summary;

	const monthOptions = $derived(generateMonthOptions(data.currentMonth));

	let period = $state<'month' | 'all'>('month');
	// SSR と一致させるため、サーバーが計算した UTC 月で初期化する
	let selectedMonth = $state(untrack(() => data.currentMonth));
	let summary = $state<Summary>(untrack(() => data.summary));
	let fetchSeq = 0;

	async function fetchSummary(): Promise<boolean> {
		const seq = ++fetchSeq;
		const params = period === 'all' ? 'period=all' : `period=month&month=${selectedMonth}`;
		const res = await fetch(`/dashboard/summary?${params}`);
		if (res.ok && seq === fetchSeq) {
			summary = await res.json();
			return true;
		}
		return false;
	}

	async function switchPeriod(next: 'month' | 'all') {
		const prev = period;
		period = next;
		const ok = await fetchSummary();
		if (!ok) period = prev;
	}

	async function handleMonthChange() {
		await fetchSummary();
	}
</script>

{#if data.pendingApprovalCount > 0}
	<div
		data-testid="expense-pending-alert"
		class="mb-6 flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3"
	>
		<AlertTriangle size={18} class="shrink-0 text-destructive" />
		<p class="flex-1 text-sm text-destructive">
			承認依頼が {data.pendingApprovalCount} 件届いています
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

<!-- 期間切り替えタブ -->
<div class="mb-4 flex items-center gap-2">
	<Button
		data-testid="dashboard-period-tab-month"
		variant={period === 'month' ? 'primary' : 'secondary'}
		size="sm"
		onclick={() => switchPeriod('month')}
	>
		月別
	</Button>
	<Button
		data-testid="dashboard-period-tab-all"
		variant={period === 'all' ? 'primary' : 'secondary'}
		size="sm"
		onclick={() => switchPeriod('all')}
	>
		全期間
	</Button>

	{#if period === 'month'}
		<Select
			data-testid="dashboard-month-select"
			bind:value={selectedMonth}
			onchange={() => handleMonthChange()}
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
		<p class="mb-1 text-sm text-secondary">{period === 'all' ? '全期間合計' : '当月合計'}</p>
		<p data-testid="dashboard-total" class="text-3xl font-semibold text-label">
			¥{summary.overall.toLocaleString()}
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
						<span class="text-sm font-medium text-label">¥{item.total.toLocaleString()}</span>
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
					<li
						data-testid="dashboard-category-summary-item"
						class="flex items-center justify-between"
					>
						<span class="text-sm text-label">{item.categoryName}</span>
						<span class="text-sm font-medium text-label">¥{item.total.toLocaleString()}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</section>
