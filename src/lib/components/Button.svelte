<!--
  @file コンポーネント: Button
  @module src/lib/components/Button.svelte

  @description
  共通ボタンコンポーネント。
  variant prop によって色スタイルを切り替え、size prop によって py・px・text サイズを切り替える。
  常に inline-flex items-center gap-2 を付与し、角丸・太さは variant ごとに持つ。

  @props
  - variant?: 'primary' | 'secondary' | 'destructive' | 'ghost-destructive' | 'ghost' | 'menu-item' | 'menu-item-destructive'
    - バリアント（デフォルト 'primary'）。ghost = アイコンボタン、menu-item 系 = ドロップダウンメニュー内の行
  - size?: 'sm' | 'md' | 'lg' | 'icon' | 'menu' - サイズ（デフォルト 'md'）
  - type?: 'button' | 'submit' | 'reset' - ボタン種別（デフォルト 'button'）
  - disabled?: boolean - 無効状態
  - class?: string - 追加 CSS クラス
  - children: Snippet - ボタン内容
  - ...rest - data-testid, aria-label, onclick 等を透過
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?:
			| 'primary'
			| 'secondary'
			| 'destructive'
			| 'ghost-destructive'
			| 'ghost'
			| 'menu-item'
			| 'menu-item-destructive';
		size?: 'sm' | 'md' | 'lg' | 'icon' | 'menu';
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		class?: string;
		children: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		type = 'button',
		disabled = false,
		class: className = '',
		children,
		...rest
	}: Props = $props();

	const variantClasses: Record<NonNullable<Props['variant']>, string> = {
		primary:
			'rounded-2xl font-medium bg-accent text-on-accent shadow-sm hover:opacity-90 disabled:opacity-60 transition-opacity',
		secondary:
			'rounded-2xl font-medium border border-separator text-secondary hover:text-label transition-colors',
		destructive:
			'rounded-2xl font-medium bg-destructive text-on-accent hover:opacity-90 disabled:opacity-60 transition-opacity',
		'ghost-destructive':
			'rounded-2xl font-medium bg-destructive/10 text-destructive hover:opacity-80 transition-opacity',
		ghost: 'rounded-xl text-secondary hover:bg-bg-secondary hover:text-label',
		'menu-item': 'w-full text-label hover:bg-bg-secondary',
		'menu-item-destructive': 'w-full text-destructive hover:bg-bg-secondary'
	};

	const sizeClasses: Record<NonNullable<Props['size']>, string> = {
		sm: 'py-1.5 px-3 text-xs',
		md: 'py-2 px-4 text-sm',
		lg: 'py-3 px-6',
		icon: 'p-1.5',
		menu: 'px-4 py-2 text-sm'
	};

	const baseClass = 'inline-flex items-center gap-2';
</script>

<button
	{type}
	{disabled}
	class="{baseClass} {variantClasses[variant]} {sizeClasses[size]} {className}"
	{...rest}
>
	{@render children()}
</button>
