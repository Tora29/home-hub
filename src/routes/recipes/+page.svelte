<!--
  @file 画面: レシピ一覧
  @module src/routes/recipes/+page.svelte
  @feature recipes

  @description
  レシピ一覧画面。

  @spec specs/recipes/spec.md
  @acceptance AC-001, AC-002, AC-006, AC-008, AC-009, AC-010, AC-204

  @navigation
  - 遷移先: /recipes/[id] - レシピ詳細画面

  @api
  - GET /recipes（SSR load） - レシピ一覧取得
-->
<script lang="ts">
	import RecipesPage from '$lib/features/recipes/components/RecipesPage.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<RecipesPage items={data.items} />
