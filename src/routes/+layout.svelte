<!--
  @file 画面: グローバルレイアウト
  @module src/routes/+layout.svelte

  @description
  全ページ共通のレイアウト。ファビコン設定と children レンダリングを担う。
-->
<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
