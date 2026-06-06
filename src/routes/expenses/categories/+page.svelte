<!--
  @file 画面: カテゴリ管理
  @module src/routes/expenses/categories/+page.svelte
  @feature expense-categories

  @description
  支出カテゴリ管理画面。

  @spec specs/expenses/spec.md
  @acceptance AC-011, AC-012, AC-013, AC-107, AC-108, AC-109, AC-110

  @navigation
  - 遷移元: /expenses - 支出一覧画面

  @api
  - GET /expenses/categories（SSR load） - カテゴリ一覧取得
-->
<script lang="ts">
	import ExpenseCategoriesPage from '$lib/features/expenses/categories/components/ExpenseCategoriesPage.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ExpenseCategoriesPage categories={data.categories} />
