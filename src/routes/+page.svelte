<!--
  @file 画面: ダッシュボード
  @module src/routes/+page.svelte
  @feature dashboard

  @description
  アプリケーションのトップページ。世帯の支出集計（月別 / 全期間）と、相手の承認依頼中支出の警告を表示する。

  @navigation
  - 遷移元: /login - ログイン成功後
  - 遷移先: /expenses - 警告バナーの「確認する」リンク
  - 遷移先: /?period={month|all}&month={YYYY-MM} - 期間・月の切り替え（replaceState）

  @api
  - GET / (SSR load) ?period=month|all&month=YYYY-MM → { unapprovedCount, summary, currentMonth, period, month } - 初期表示・期間切り替え
-->
<script lang="ts">
	import DashboardPage from '$dashboard/components/DashboardPage.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<DashboardPage
	unapprovedCount={data.unapprovedCount}
	summary={data.summary}
	currentMonth={data.currentMonth}
	period={data.period}
	month={data.month}
/>
