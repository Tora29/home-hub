<!--
  @file コンポーネント: Textarea
  @module src/lib/components/Textarea.svelte

  @description
  共通テキストエリアコンポーネント。
  size prop によって py・px・text サイズを切り替え、resize-none を常に付与する。
  class prop でレイアウト系クラスを追加できる。

  @props
  - value?: string - 入力値（$bindable）
  - size?: 'sm' | 'md' | 'lg' - サイズ（デフォルト 'lg'）
  - rows?: number - 行数（デフォルト 3）
  - class?: string - 追加 CSS クラス
  - ...rest - id, placeholder, maxlength, data-testid 等を透過
-->
<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	interface Props extends HTMLTextareaAttributes {
		value?: string;
		size?: 'sm' | 'md' | 'lg';
		rows?: number;
		class?: string;
	}

	let {
		value = $bindable(''),
		size = 'lg',
		rows = 3,
		class: className = '',
		...rest
	}: Props = $props();

	const sizeClasses: Record<string, string> = {
		sm: 'py-1.5 px-3 text-xs',
		md: 'py-2 px-3 text-sm',
		lg: 'py-3 px-4'
	};

	const baseClass =
		'resize-none rounded-2xl border border-separator bg-bg text-label placeholder:text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';
</script>

<textarea bind:value {rows} class="{baseClass} {sizeClasses[size]} {className}" {...rest}
></textarea>
