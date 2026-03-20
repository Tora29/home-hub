<!--
  @file 画面: グローバルレイアウト
  @module src/routes/+layout.svelte

  @description
  全ページ共通のレイアウト。ファビコン設定・Header・Sidebar を配置し、children をメインコンテンツ領域にレンダリングする。
  ログインページでは Header・Sidebar を表示しない。

  @navigation
  - Sidebar: サイドバーナビゲーション（/login 以外）
  - Header: 共通ヘッダー（/login 以外）
-->
<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { page } from '$app/stores';

	let { children } = $props();

	let showNav = $derived(!$page.url.pathname.startsWith('/login'));
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if showNav}
	<div class="flex h-screen flex-col bg-bg">
		<Header />
		<div class="flex flex-1 overflow-hidden">
			<Sidebar />
			<main class="flex-1 overflow-y-auto p-6">
				{@render children()}
			</main>
		</div>
	</div>
{:else}
	{@render children()}
{/if}
