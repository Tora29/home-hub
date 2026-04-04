<!--
  @file コンポーネント: ExpenseFormDialog
  @module src/routes/expenses/components/ExpenseFormDialog.svelte
  @feature expenses

  @description
  支出の登録・編集フォームをモーダルダイアログで表示するコンポーネント。
  Dialog をベースに ExpenseForm を内包する。
  登録・編集の2モードを1コンポーネントで担う。

  @spec specs/expenses/spec.md
  @acceptance AC-003, AC-006, AC-032, AC-033, AC-034, AC-111, AC-112

  @props
  - open: boolean - 表示状態
  - mode: 'create' | 'edit' - フォームモード
  - expense: ExpenseWithCategory | null - 編集対象（edit mode のみ）
  - categories: Category[] - カテゴリ一覧
  - onSuccess: () => void | Promise<void> - 送信成功時コールバック
  - onCancel: () => void - キャンセル時コールバック
-->
<script lang="ts">
	import Dialog from '$lib/components/Dialog.svelte';
	import ExpenseForm from './ExpenseForm.svelte';

	type Category = { id: string; userId: string; name: string; createdAt: Date };
	type ExpenseWithCategory = {
		id: string;
		userId: string;
		amount: number;
		categoryId: string;
		approvedAt: Date | null;
		finalizedAt: Date | null;
		createdAt: Date;
		category: Category;
	};

	let {
		open,
		mode,
		expense = null,
		categories,
		onSuccess,
		onCancel
	}: {
		open: boolean;
		mode: 'create' | 'edit';
		expense?: ExpenseWithCategory | null;
		categories: Category[];
		onSuccess: () => void | Promise<void>;
		onCancel: () => void;
	} = $props();
</script>

<Dialog
	{open}
	onClose={onCancel}
	role="dialog"
	aria-label={mode === 'create' ? '支出を登録' : '支出を編集'}
>
	<div class="w-full max-w-md rounded-3xl bg-bg-card shadow-md">
		<ExpenseForm {mode} expense={expense ?? undefined} {categories} {onSuccess} {onCancel} />
	</div>
</Dialog>
