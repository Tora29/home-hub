<!--
  @file コンポーネント: ExpenseItem テスト用ラッパー
  @module src/lib/features/expenses/components/ExpenseItem.test-wrapper.svelte
  @feature expenses

  @description
  ExpenseItem の行メニュー開閉を検証するためのテスト専用ラッパー。
  親（ExpensesPage）と同様に openMenuId を状態として持ち、onMenuToggle で更新する。

  @props
  - expense: ExpenseWithRelations - 支出データ
  - currentUserId: string - 現在のログインユーザー ID
  - onEdit: (expense: ExpenseWithRelations) => void - 編集コールバック
  - onDelete: (expense: ExpenseWithRelations) => void - 削除コールバック
-->
<script lang="ts">
	import ExpenseItem from './ExpenseItem.svelte';
	import type { ExpenseWithRelations } from '../types';

	let {
		expense,
		currentUserId,
		onEdit,
		onDelete
	}: {
		expense: ExpenseWithRelations;
		currentUserId: string;
		onEdit: (expense: ExpenseWithRelations) => void;
		onDelete: (expense: ExpenseWithRelations) => void;
	} = $props();

	let openMenuId = $state<string | null>(null);
</script>

<ul>
	<ExpenseItem
		{expense}
		{currentUserId}
		{openMenuId}
		onCheckToggle={() => {}}
		{onEdit}
		{onDelete}
		onMenuToggle={(id) => (openMenuId = id)}
	/>
</ul>
