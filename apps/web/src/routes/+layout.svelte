<!--
  @file 画面: 共通レイアウト
  @module apps/web/src/routes/+layout.svelte
  @feature auth

  @description
  全ページ共通レイアウト。認証済みページではナビゲーションバーとログアウトボタンを表示する。

  @spec specs/auth/spec.md
  @acceptance AC-002
-->

<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { currentUser } from '$lib/stores/auth';
	import favicon from '$lib/assets/favicon.svg';
	import { deleteSession } from './login/apis/deleteSession';

	let { children } = $props();

	const isLoginPage = $derived($page.url.pathname === '/login');

	let isSigningOut = $state(false);

	async function handleSignOut() {
		isSigningOut = true;
		try {
			await deleteSession();
			currentUser.set(null);
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			await goto('/login');
		} finally {
			isSigningOut = false;
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if !isLoginPage && $currentUser}
	<header
		class="fixed top-0 left-0 right-0 z-10 flex h-[44px] items-center justify-between bg-bg-secondary px-4 border-b border-separator"
		style="padding-top: env(safe-area-inset-top); height: calc(44px + env(safe-area-inset-top));"
	>
		<span class="text-ios-headline font-semibold text-label">今日の献立</span>

		<button
			onclick={handleSignOut}
			disabled={isSigningOut}
			aria-label="ログアウト"
			class="min-w-[44px] min-h-[44px] flex items-center justify-center text-ios-callout text-accent disabled:opacity-50 touch-manipulation"
		>
			{isSigningOut ? '処理中...' : 'ログアウト'}
		</button>
	</header>

	<main
		class="pt-[44px] min-h-screen bg-bg"
		style="padding-top: calc(44px + env(safe-area-inset-top));"
	>
		{@render children()}
	</main>
{:else}
	{@render children()}
{/if}
