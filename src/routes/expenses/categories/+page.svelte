<!--
  @file 画面: カテゴリ管理
  @module src/routes/expenses/categories/+page.svelte
  @feature expenses

  @description
  支出カテゴリ管理画面。カテゴリの追加・名称変更・削除を行う。

  @navigation
  - 遷移元: /expenses - 支出一覧画面
  - 遷移先: /expenses - 支出一覧に戻る

  @api
  - SSR load: service 直呼び（getCategories）
  - POST /expenses/categories → 201 Category - カテゴリ登録
  - PUT /expenses/categories/[id] → 200 Category - カテゴリ更新
  - DELETE /expenses/categories/[id] → 204 - カテゴリ削除
-->
<script lang="ts">
	import ExpenseCategoriesPage from '$lib/features/expenses/categories/components/ExpenseCategoriesPage.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ExpenseCategoriesPage categories={data.categories} />
