<!--
  @file コンポーネント: Sidebar
  @module src/lib/components/Sidebar.svelte

  @description
  全ページ共通のサイドバーナビゲーションコンポーネント。
  カテゴリ別の入れ子メニューを提供し、デスクトップ・モバイル両環境での開閉操作をサポートする。

  @spec specs/sidebar/spec.md
  @acceptance AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007

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
		PanelLeftOpen
	} from '@lucide/svelte';
	import type { Component } from 'svelte';
	import { mobileOpen } from '$lib/stores/sidebar';

	type NavItem = { testid: string; href: string; label: string };
	type NavCategory = { id: string; label: string; icon: Component; items: NavItem[] };

	const NAV_CATEGORIES: NavCategory[] = [
		{
			id: 'meal',
			label: '献立系',
			icon: UtensilsCrossed,
			items: [
				{ testid: 'sidebar-item-recipes', href: '/recipes', label: 'レシピ一覧' },
				{ testid: 'sidebar-item-recipes-tags', href: '/recipes/tags', label: 'タグ' }
			]
		},
		{
			id: 'expense',
			label: '収支系',
			icon: Wallet,
			items: [{ testid: 'sidebar-item-expenses', href: '/expenses', label: '家計簿' }]
		}
	];

	const STORAGE_KEY = 'sidebar-open';

	let sidebarOpen = $state(
		typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) !== 'false' : true
	);
	let isMobile = $state(false);
	let openMap = $state<Record<string, boolean>>({ meal: true, expense: true });

	$effect(() => {
		const mql = window.matchMedia('(max-width: 767px)');
		isMobile = mql.matches;
		const handler = (e: MediaQueryListEvent) => {
			isMobile = e.matches;
		};
		mql.addEventListener('change', handler);
		return () => mql.removeEventListener('change', handler);
	});

	$effect(() => {
		localStorage.setItem(STORAGE_KEY, String(sidebarOpen));
		document.documentElement.setAttribute('data-sidebar-open', String(sidebarOpen));
	});

	$effect(() => {
		const main = document.querySelector('main');
		if (!main) return;
		if ($mobileOpen) {
			main.setAttribute('inert', '');
		} else {
			main.removeAttribute('inert');
		}
		return () => {
			main.removeAttribute('inert');
		};
	});

	const currentPath = $derived(page.url.pathname);

	function isActive(href: string): boolean {
		return currentPath === href;
	}
</script>

<!-- モバイル用オーバーレイ -->
<div
	data-testid="sidebar-overlay"
	class="absolute inset-0 z-20 bg-black/40 transition-opacity duration-300 md:hidden"
	style:opacity={$mobileOpen ? '1' : '0'}
	style:pointer-events={$mobileOpen ? 'auto' : 'none'}
	role="presentation"
	onclick={() => mobileOpen.set(false)}
></div>

<!-- サイドバー本体（デスクトップ: sidebarOpen、モバイル: $mobileOpen で制御） -->
<aside class="absolute inset-y-0 left-0 z-30 flex h-full">
	<!-- サイドバーナビ -->
	<nav
		data-testid="sidebar"
		aria-label="メインナビゲーション"
		aria-hidden={isMobile ? !$mobileOpen : !sidebarOpen}
		class="flex h-full flex-col overflow-hidden border-r border-separator bg-bg-secondary"
		style:width={isMobile ? ($mobileOpen ? '14rem' : '0') : sidebarOpen ? '14rem' : '0'}
		style:visibility={(isMobile ? $mobileOpen : sidebarOpen) ? 'visible' : 'hidden'}
		style:min-width="0"
		style:box-shadow={(isMobile ? $mobileOpen : sidebarOpen)
			? '4px 0 16px rgba(0,0,0,0.12)'
			: 'none'}
		style:transition="width 300ms ease-in-out, box-shadow 300ms ease-in-out, visibility 300ms"
	>
		<div
			class="w-56 flex-1 space-y-1 overflow-y-auto px-3 py-4"
			style:transform={isMobile
				? $mobileOpen
					? 'translateX(0)'
					: 'translateX(-100%)'
				: sidebarOpen
					? 'translateX(0)'
					: 'translateX(-100%)'}
			style:transition="transform 300ms ease-in-out"
		>
			{#each NAV_CATEGORIES as category (category.id)}
				{@const Icon = category.icon}
				<div>
					<button
						data-testid="sidebar-category-{category.id}"
						class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-label transition-colors hover:bg-bg-grouped focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
						aria-expanded={openMap[category.id]}
						onclick={() => (openMap[category.id] = !openMap[category.id])}
					>
						<Icon size={16} />
						<span class="flex-1 text-left">{category.label}</span>
						{#if openMap[category.id]}
							<ChevronDown size={14} class="text-secondary" />
						{:else}
							<ChevronRight size={14} class="text-secondary" />
						{/if}
					</button>

					<div
						style:display="grid"
						style:grid-template-rows={openMap[category.id] ? '1fr' : '0fr'}
						style:transition="grid-template-rows 200ms ease-in-out"
					>
						<ul class="mt-1 space-y-0.5 overflow-hidden pl-4" style:min-height="0">
							{#each category.items as item (item.href)}
								<li>
									<a
										data-testid={item.testid}
										href={item.href}
										aria-current={isActive(item.href) ? 'page' : undefined}
										class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-label transition-colors hover:bg-bg-grouped focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none {isActive(
											item.href
										)
											? 'font-medium text-accent underline'
											: ''}"
									>
										{item.label}
									</a>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			{/each}
		</div>
	</nav>

	<!-- デスクトップ用トグルボタン（常に表示・nav の外側に配置） -->
	<div class="hidden flex-col border-r border-separator bg-bg-secondary px-1 pt-3 md:flex">
		<button
			data-testid="sidebar-toggle"
			class="flex h-9 w-9 items-center justify-center rounded-xl text-label transition-colors hover:bg-bg-grouped focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
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
