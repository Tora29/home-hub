<!--
  @file 画面: 支出一覧
  @module src/routes/expenses/+page.svelte
  @feature expenses

  @description
  支出一覧画面。月切り替え・支出の登録/編集/削除・確認チェック・一括承認依頼/取消/承認・選択月の精算額確認を行う。

  @navigation
  - 遷移元: / - ダッシュボード、サイドバー
  - 遷移先: /expenses/categories - カテゴリ管理画面
  - 遷移先: /expenses?month=YYYY-MM - 月切り替え（同一画面）

  @api
  - SSR load: service 直呼び（getExpenses / getCategories / getUsers / getUnapprovedCount / getSettlementSummary）
  - POST /expenses → 201 ExpenseWithRelations - 支出登録
  - PUT /expenses/[id] → 200 ExpenseWithRelations - 支出更新
  - DELETE /expenses/[id] → 204 - 支出削除
  - POST /expenses/[id]/check → 200 ExpenseWithRelations - 確認済みにする
  - POST /expenses/[id]/uncheck → 200 ExpenseWithRelations - 確認取消
  - POST /expenses/request → 200 {count} - 一括承認依頼
  - POST /expenses/cancel → 200 {count} - 一括申請取り消し
  - POST /expenses/approve → 200 {count} - 一括承認
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
	currentMonth={data.currentMonth}
	partnerPendingCount={data.partnerPendingCount}
	settlement={data.settlement}
/>
