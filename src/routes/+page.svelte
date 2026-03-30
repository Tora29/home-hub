<!--
  @file 画面: ダッシュボード
  @module src/routes/+page.svelte

  @description
  アプリケーションのトップページ。
  全期間の未承認支出が 1 件以上ある場合に警告バナーを表示する。

  @spec specs/expenses/spec.md
  @acceptance AC-008, AC-009
-->
<script lang="ts">
	import { AlertTriangle } from '@lucide/svelte';

	let { data } = $props();
</script>

{#if data.unapprovedCount > 0}
	<div
		data-testid="expense-pending-alert"
		class="mb-6 flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3"
	>
		<AlertTriangle size={18} class="shrink-0 text-destructive" />
		<p class="flex-1 text-sm text-destructive">
			未確認の支出が {data.unapprovedCount} 件あります
		</p>
		<a
			href="/expenses"
			class="shrink-0 text-sm font-medium text-destructive underline hover:no-underline"
		>
			確認する
		</a>
	</div>
{/if}

<h1 class="text-2xl font-medium text-label">ホーム</h1>
