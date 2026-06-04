<!--
  @file コンポーネント: Checkbox
  @module src/lib/components/Checkbox.svelte

  @description
  カスタムスタイルのチェックボックスコンポーネント。
  デザインシステムのアクセントカラー（テラコッタ）でチェック状態を表現する。
  children にラベルテキストを渡すと隣に表示する。

  @props
  - checked?: boolean - チェック状態
  - disabled?: boolean - 無効状態（opacity-40 + cursor-not-allowed）
  - onchange?: () => void - チェック変更ハンドラ
  - class?: string - 追加 CSS クラス（ラッパーに適用）
  - children?: Snippet - ラベルテキスト
  - data-testid?: string - テスト用 ID
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		checked?: boolean;
		disabled?: boolean;
		onchange?: () => void;
		class?: string;
		children?: Snippet;
		'data-testid'?: string;
	}

	let {
		checked = false,
		disabled = false,
		onchange,
		class: className = '',
		children,
		'data-testid': testId
	}: Props = $props();
</script>

<button
	type="button"
	role="checkbox"
	aria-checked={checked}
	{disabled}
	data-testid={testId}
	onclick={() => !disabled && onchange?.()}
	class="inline-flex items-center gap-2 select-none {disabled
		? 'cursor-not-allowed opacity-40'
		: 'cursor-pointer'} {className}"
>
	<span
		class="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-150 {checked
			? 'border-accent bg-accent shadow-sm'
			: 'border-separator bg-bg hover:border-accent/50'}"
	>
		{#if checked}
			<svg
				width="11"
				height="9"
				viewBox="0 0 11 9"
				fill="none"
				class="text-white"
				aria-hidden="true"
			>
				<path
					d="M1 4.2L3.8 7L10 1"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		{/if}
	</span>
	{#if children}
		<span class="text-sm text-label">
			{@render children()}
		</span>
	{/if}
</button>
