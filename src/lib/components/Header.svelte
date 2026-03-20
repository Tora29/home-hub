<!--
  @file コンポーネント: Header
  @module src/lib/components/Header.svelte

  @description
  全ページ共通のヘッダーコンポーネント。
  ロゴ・ダークモード切替・ログアウトを提供する。

  @spec specs/header/spec.md
  @acceptance AC-001, AC-002, AC-003, AC-004
-->
<script lang="ts">
	import { Moon, Sun, LogOut } from '@lucide/svelte';
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	let isDark = $state(false);

	$effect(() => {
		const saved = localStorage.getItem('theme');
		isDark = saved === 'dark';
		document.documentElement.classList.toggle('dark', isDark);
	});

	function toggleDark() {
		isDark = !isDark;
		document.documentElement.classList.toggle('dark', isDark);
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
	}

	async function logout() {
		await authClient.signOut();
		goto('/login');
	}
</script>

<header class="flex h-14 items-center justify-between border-b border-separator bg-bg-secondary px-4">
	<a
		href="/"
		data-testid="header-logo"
		aria-label="ホームへ戻る"
		class="text-lg font-semibold text-label transition-opacity hover:opacity-70 focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
	>
		home hub
	</a>

	<div class="flex items-center gap-2">
		<button
			data-testid="header-dark-toggle"
			aria-label={isDark ? 'ライトモードに切り替える' : 'ダークモードに切り替える'}
			onclick={toggleDark}
			class="flex h-9 w-9 items-center justify-center rounded-xl text-label transition-colors hover:bg-bg-grouped focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
		>
			{#if isDark}
				<Sun size={18} />
			{:else}
				<Moon size={18} />
			{/if}
		</button>

		<button
			data-testid="header-logout-button"
			aria-label="ログアウト"
			onclick={logout}
			class="flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm text-label transition-colors hover:bg-bg-grouped focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
		>
			<LogOut size={16} />
			ログアウト
		</button>
	</div>
</header>
