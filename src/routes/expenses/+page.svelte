<!--
  @file 画面: 支出一覧
  @module src/routes/expenses/+page.svelte
  @feature expenses

  @description
  支出一覧画面。

  @spec specs/expenses/spec.md
  @acceptance AC-001, AC-002, AC-002b, AC-002c, AC-100, AC-101, AC-102, AC-103, AC-104, AC-105, AC-106, AC-120, AC-121, AC-122, AC-123, AC-124, AC-125

  @navigation
  - 遷移先: /expenses/categories - カテゴリ管理画面

  @api
  - GET /expenses（SSR load） - 支出一覧取得
-->
<script lang="ts">
	import ExpensesPage from '$lib/features/expenses/components/ExpensesPage.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ExpensesPage
	expenses={data.expenses}
	monthTotal={data.monthTotal}
	categories={data.categories}
	users={data.users}
	currentUserId={data.currentUserId}
	selectedMonth={data.selectedMonth}
	partnerPendingCount={data.partnerPendingCount}
/>
