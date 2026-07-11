<!--
  @file 画面: カレンダー
  @module src/routes/calendar/+page.svelte
  @feature calendar

  @description
  夫婦共通の予定を管理するカレンダー画面。月ビューで予定を一覧し、
  日付タップでイベント作成モーダル、バッジタップで編集モーダルを開く。

  @navigation
  - 遷移元: /（サイドバー「生活 > カレンダー」）

  @api
  - GET /calendar/events（SSR load） - 月別イベント一覧取得
-->
<script lang="ts">
	import CalendarPage from '$calendar/components/CalendarPage.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<CalendarPage {data} />
