<!--
  @file コンポーネント: Button
  @module src/lib/components/Button.svelte

  @description
  共通ボタンコンポーネント。
  variant prop によって色スタイルを切り替え、size prop によって py・px・text サイズを切り替える。
  常に inline-flex items-center gap-2 font-medium rounded-2xl を付与する。

  @props
  - variant?: 'primary' | 'secondary' | 'destructive' | 'ghost-destructive' - バリアント（デフォルト 'primary'）
  - size?: 'sm' | 'md' | 'lg' - サイズ（デフォルト 'md'）
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
		variant?: 'primary' | 'secondary' | 'destructive' | 'ghost-destructive';
		size?: 'sm' | 'md' | 'lg';
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

	const variantClasses: Record<string, string> = {
		primary:
			'bg-accent text-white shadow-sm hover:opacity-90 disabled:opacity-60 transition-opacity',
		secondary: 'border border-separator text-secondary hover:text-label transition-colors',
		destructive:
			'bg-destructive text-white hover:opacity-90 disabled:opacity-60 transition-opacity',
		'ghost-destructive': 'bg-destructive/10 text-destructive hover:opacity-80 transition-opacity'
	};

	const sizeClasses: Record<string, string> = {
		sm: 'py-1.5 px-3 text-xs',
		md: 'py-2 px-4 text-sm',
		lg: 'py-3 px-6'
	};

	const baseClass = 'inline-flex items-center gap-2 font-medium rounded-2xl';
</script>

<button
	{type}
	{disabled}
	class="{baseClass} {variantClasses[variant]} {sizeClasses[size]} {className}"
	{...rest}
>
	{@render children()}
</button>
