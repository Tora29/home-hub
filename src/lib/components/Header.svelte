<!--
  @file コンポーネント: Header
  @module src/lib/components/Header.svelte

  @description
  全ページ共通のヘッダーコンポーネント。
  ロゴ・ダークモード切替・ログアウトを提供する。

  @spec specs/header/spec.md
  @acceptance AC-001, AC-002, AC-003, AC-004, AC-201
-->
<script lang="ts">
	import { Moon, Sun, LogOut, Menu } from '@lucide/svelte';
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { mobileOpen } from '$lib/stores/sidebar';

	let isDark = $state(false);

	if (typeof document !== 'undefined') {
		const saved = localStorage.getItem('theme');
		if (saved === 'dark') {
			isDark = true;
			document.documentElement.classList.add('dark');
		} else if (saved === 'light') {
			isDark = false;
			document.documentElement.classList.remove('dark');
		} else {
			isDark = document.documentElement.classList.contains('dark');
		}
	}

	function toggleDark() {
		const currentlyDark = document.documentElement.classList.contains('dark');
		isDark = !currentlyDark;
		document.documentElement.classList.toggle('dark', isDark);
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
	}

	async function logout() {
		await authClient.signOut();
		await goto('/login');
	}
</script>

<header
	class="relative flex h-14 items-center justify-between border-b border-separator bg-bg-secondary px-4"
>
	<div class="flex items-center gap-2">
		<button
			data-testid="sidebar-hamburger"
			class="flex h-9 w-9 items-center justify-center rounded-xl text-label transition-colors hover:bg-bg-grouped focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none md:hidden"
			aria-label="メニューを開く"
			onclick={() => mobileOpen.update((v) => !v)}
		>
			<Menu size={20} />
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
		<button
			data-testid="header-dark-toggle"
			aria-label={isDark ? 'ライトモードに切り替える' : 'ダークモードに切り替える'}
			onclick={toggleDark}
			class="flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm text-label transition-colors hover:bg-bg-grouped focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
		>
			{#if isDark}
				<Sun size={18} />
			{:else}
				<Moon size={18} />
			{/if}
			<span class="hidden md:inline">テーマ切り替え</span>
		</button>

		<button
			data-testid="header-logout-button"
			aria-label="ログアウト"
			onclick={logout}
			class="flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm text-label transition-colors hover:bg-bg-grouped focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
		>
			<LogOut size={16} />
			<span class="hidden md:inline">ログアウト</span>
		</button>
	</div>
</header>
