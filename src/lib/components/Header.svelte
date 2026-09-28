<!--
  @file コンポーネント: Header
  @module src/lib/components/Header.svelte

  @description
  全ページ共通のヘッダーコンポーネント。
  ロゴ・ダークモード切替・ログアウトを提供する。

  @props なし
-->
<script lang="ts">
	import { Moon, Sun, LogOut, Menu } from '@lucide/svelte';
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { sidebarState } from '$lib/stores/sidebar.svelte';

	let isDark = $state(
		typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
	);

	const navButtonClass =
		'flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm text-label transition-colors hover:bg-bg-grouped focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none';

	function toggleDark() {
		const currentlyDark = document.documentElement.classList.contains('dark');
		isDark = !currentlyDark;
		document.documentElement.classList.toggle('dark', isDark);
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
	}

	let logoutError = $state('');

	async function logout() {
		logoutError = '';
		try {
			const result = await authClient.signOut();
			if (result?.error) {
				logoutError = 'ログアウトに失敗しました';
				return;
			}
			await goto('/login');
		} catch {
			logoutError = '通信エラーが発生しました';
		}
	}
</script>

<header
	class="relative flex h-14 items-center justify-between border-b border-separator bg-bg-secondary px-4"
>
	<div class="flex items-center gap-2">
		<button
			type="button"
			data-testid="sidebar-hamburger"
			class="flex h-9 w-9 items-center justify-center rounded-xl text-label transition-colors hover:bg-bg-grouped focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none md:hidden"
			aria-label="メニューを開く"
			onclick={() => (sidebarState.mobileOpen = !sidebarState.mobileOpen)}
		>
			<Menu size={20} aria-hidden="true" />
		</button>
		<a
			href="/"
			data-testid="header-logo"
			aria-label="ホームへ戻る"
			class="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-label transition-opacity hover:opacity-70 focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none md:static md:translate-x-0"
		>
			Home Hub
		</a>
	</div>

	<div class="flex items-center gap-2">
		{#if logoutError}
			<p role="alert" data-testid="header-logout-error" class="text-xs text-destructive">
				{logoutError}
			</p>
		{/if}
		<button
			type="button"
			data-testid="header-dark-toggle"
			aria-label={isDark ? 'ライトモードに切り替える' : 'ダークモードに切り替える'}
			onclick={toggleDark}
			class={navButtonClass}
		>
			{#if isDark}
				<Sun size={18} aria-hidden="true" />
			{:else}
				<Moon size={18} aria-hidden="true" />
			{/if}
			<span class="hidden md:inline">テーマ切り替え</span>
		</button>

		<button
			type="button"
			data-testid="header-logout-button"
			aria-label="ログアウト"
			onclick={logout}
			class={navButtonClass}
		>
			<LogOut size={16} aria-hidden="true" />
			<span class="hidden md:inline">ログアウト</span>
		</button>
	</div>
</header>
