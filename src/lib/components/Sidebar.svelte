<!--
  @file コンポーネント: Sidebar
  @module src/lib/components/Sidebar.svelte

  @description
  全ページ共通のサイドバーナビゲーションコンポーネント。
  カテゴリ別の入れ子メニューを提供し、デスクトップ・モバイル両環境での開閉操作をサポートする。

  @spec specs/sidebar/spec.md
  @acceptance AC-001, AC-002, AC-003, AC-004, AC-005, AC-006

  @props なし（メニュー構成はハードコード定数）
-->
<script lang="ts">
	import { page } from '$app/state';
	import {
		UtensilsCrossed,
		Wallet,
		ChevronDown,
		ChevronRight,
		PanelLeftClose,
		PanelLeftOpen,
		Menu
	} from '@lucide/svelte';

	let sidebarOpen = $state(true);
	let mobileOpen = $state(false);
	let mealOpen = $state(true);
	let expenseOpen = $state(true);

	const currentPath = $derived(page.url.pathname);

	function isActive(href: string): boolean {
		return currentPath === href;
	}
</script>

<!-- モバイル用オーバーレイ -->
{#if mobileOpen}
	<div
		data-testid="sidebar-overlay"
		class="fixed inset-0 z-20 bg-black/40"
		role="presentation"
		onclick={() => (mobileOpen = false)}
	></div>
{/if}

<!-- モバイル用ハンバーガーボタン（モバイルのみ表示） -->
<button
	data-testid="sidebar-hamburger"
	class="fixed left-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-xl text-label transition-colors hover:bg-bg-grouped focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent md:hidden"
	aria-label="メニューを開く"
	onclick={() => (mobileOpen = true)}
>
	<Menu size={20} />
</button>

<!-- サイドバー本体（デスクトップ: sidebarOpen、モバイル: mobileOpen で制御） -->
<aside class="relative flex h-full shrink-0">
	<!-- サイドバーナビ（条件付きレンダリング） -->
	{#if sidebarOpen || mobileOpen}
		<nav
			data-testid="sidebar"
			aria-label="メインナビゲーション"
			class="flex h-full w-56 flex-col border-r border-separator bg-bg-secondary"
		>
			<div class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
				<!-- 献立系カテゴリ -->
				<div>
					<button
						data-testid="sidebar-category-meal"
						class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-label transition-colors hover:bg-bg-grouped focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
						aria-expanded={mealOpen}
						onclick={() => (mealOpen = !mealOpen)}
					>
						<UtensilsCrossed size={16} />
						<span class="flex-1 text-left">献立系</span>
						{#if mealOpen}
							<ChevronDown size={14} class="text-secondary" />
						{:else}
							<ChevronRight size={14} class="text-secondary" />
						{/if}
					</button>

					{#if mealOpen}
						<ul class="mt-1 space-y-0.5 pl-4">
							<li>
								<a
									data-testid="sidebar-item-recipes"
									href="/recipes"
									aria-current={isActive('/recipes') ? 'page' : undefined}
									class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-label transition-colors hover:bg-bg-grouped focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent {isActive('/recipes') ? 'font-medium text-accent underline' : ''}"
								>
									レシピ一覧
								</a>
							</li>
							<li>
								<a
									data-testid="sidebar-item-recipes-tags"
									href="/recipes/tags"
									aria-current={isActive('/recipes/tags') ? 'page' : undefined}
									class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-label transition-colors hover:bg-bg-grouped focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent {isActive('/recipes/tags') ? 'font-medium text-accent underline' : ''}"
								>
									タグ
								</a>
							</li>
						</ul>
					{/if}
				</div>

				<!-- 収支系カテゴリ -->
				<div>
					<button
						data-testid="sidebar-category-expense"
						class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-label transition-colors hover:bg-bg-grouped focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
						aria-expanded={expenseOpen}
						onclick={() => (expenseOpen = !expenseOpen)}
					>
						<Wallet size={16} />
						<span class="flex-1 text-left">収支系</span>
						{#if expenseOpen}
							<ChevronDown size={14} class="text-secondary" />
						{:else}
							<ChevronRight size={14} class="text-secondary" />
						{/if}
					</button>

					{#if expenseOpen}
						<ul class="mt-1 space-y-0.5 pl-4">
							<li>
								<a
									data-testid="sidebar-item-expenses"
									href="/expenses"
									aria-current={isActive('/expenses') ? 'page' : undefined}
									class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-label transition-colors hover:bg-bg-grouped focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent {isActive('/expenses') ? 'font-medium text-accent underline' : ''}"
								>
									家計簿
								</a>
							</li>
						</ul>
					{/if}
				</div>
			</div>
		</nav>
	{/if}

	<!-- デスクトップ用トグルボタン（常に表示・nav の外側に配置） -->
	<div class="hidden flex-col border-r border-separator bg-bg-secondary px-1 pt-3 md:flex">
		<button
			data-testid="sidebar-toggle"
			class="flex h-9 w-9 items-center justify-center rounded-xl text-label transition-colors hover:bg-bg-grouped focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
			aria-label={sidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'}
			onclick={() => (sidebarOpen = !sidebarOpen)}
		>
			{#if sidebarOpen}
				<PanelLeftClose size={20} />
			{:else}
				<PanelLeftOpen size={20} />
			{/if}
		</button>
	</div>
</aside>
