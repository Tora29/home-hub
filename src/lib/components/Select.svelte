<!--
  @file コンポーネント: Select
  @module src/lib/components/Select.svelte

  @description
  共通セレクトコンポーネント。
  ChevronDown アイコン付き、appearance-none 固定。
  size prop によって py・pl・text サイズを切り替え、右側はアイコン分 pr-9 固定。

  @props
  - value?: string - 選択値（$bindable）
  - onchange?: EventHandler - 変更イベントハンドラ
  - size?: 'sm' | 'md' | 'lg' - サイズ（デフォルト 'md'）
  - id?: string - id 属性
  - data-testid?: string - テスト用属性
  - children: Snippet - option 要素
  - class?: string - 追加 CSS クラス
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import { ChevronDown } from '@lucide/svelte';

	interface Props extends Omit<HTMLSelectAttributes, 'size'> {
		value?: string;
		size?: 'sm' | 'md' | 'lg';
		class?: string;
		children: Snippet;
	}

	let {
		value = $bindable(''),
		size = 'md',
		class: className = '',
		children,
		...rest
	}: Props = $props();

	const sizeClasses: Record<string, string> = {
		sm: 'py-1.5 pl-3 text-xs',
		md: 'py-2 pl-4 text-sm',
		lg: 'py-3 pl-4'
	};

	const baseClass =
		'appearance-none rounded-2xl border border-separator bg-bg pr-9 text-label focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';
</script>

<div class="relative {className}">
	<select bind:value class="{baseClass} {sizeClasses[size]} w-full" {...rest}>
		{@render children()}
	</select>
	<ChevronDown
		size={16}
		class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-secondary"
	/>
</div>
