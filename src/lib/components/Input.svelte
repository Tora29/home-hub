<!--
  @file コンポーネント: Input
  @module src/lib/components/Input.svelte

  @description
  共通テキスト入力コンポーネント。
  size prop によって py・px・text サイズを切り替え、class prop でレイアウト系クラスを追加できる。
  その他の属性（type, id, placeholder, maxlength 等）はすべて透過する。

  @props
  - value?: string - 入力値（$bindable）
  - size?: 'sm' | 'md' | 'lg' - サイズ（デフォルト 'md'）
  - class?: string - 追加 CSS クラス（w-full / flex-1 / min-w-0 / pr-12 等）
  - ...rest - type, id, placeholder, min, max, maxlength, data-testid, onchange 等を透過
-->
<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'size'> {
		value?: string;
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	}

	let { value = $bindable(''), size = 'md', class: className = '', ...rest }: Props = $props();

	const sizeClasses: Record<string, string> = {
		sm: 'py-1.5 px-3 text-xs',
		md: 'py-2 px-3 text-sm',
		lg: 'py-3 px-4'
	};

	const baseClass =
		'rounded-2xl border border-separator bg-bg text-label placeholder:text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';
</script>

<input bind:value class="{baseClass} {sizeClasses[size]} {className}" {...rest} />
