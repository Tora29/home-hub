<!--
  @file 画面: ダッシュボード
  @module src/routes/+page.svelte
  @feature dashboard

  @description
  アプリケーションのトップページ。

  @spec specs/dashboard/spec.md
  @acceptance AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-201, AC-202, AC-203
-->
<script lang="ts">
	import DashboardPage from '$lib/features/dashboard/components/DashboardPage.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<DashboardPage
	unapprovedCount={data.unapprovedCount}
	summary={data.summary}
	currentMonth={data.currentMonth}
/>
