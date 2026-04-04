<!--
  @file コンポーネント: Dialog
  @module src/lib/components/Dialog.svelte

  @description
  汎用モーダルオーバーレイシェル。
  backdrop・Escape キー・aria 属性を担当する。
  中身はスニペット（children）で差し込む。

  @props
  - open: boolean - 表示状態
  - onClose: () => void - 閉じる時のコールバック
  - closeOnBackdrop: boolean - backdrop クリックで閉じるか（デフォルト: true）
  - disabled: boolean - true のとき Escape・backdrop による閉じるを無効化（デフォルト: false）
  - role: 'dialog' | 'alertdialog' - ARIA ロール（デフォルト: 'dialog'）
  - aria-label: string - ARIA ラベル
  - children: Snippet - ダイアログ中身
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open,
		onClose,
		closeOnBackdrop = true,
		disabled = false,
		role = 'dialog' as 'dialog' | 'alertdialog',
		'aria-label': ariaLabel,
		children
	}: {
		open: boolean;
		onClose: () => void;
		closeOnBackdrop?: boolean;
		disabled?: boolean;
		role?: 'dialog' | 'alertdialog';
		'aria-label'?: string;
		children: Snippet;
	} = $props();

	function handleBackdropClick(e: MouseEvent) {
		if (!disabled && closeOnBackdrop && e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!disabled && e.key === 'Escape') {
			onClose();
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<!-- dialog/alertdialog ロールは Svelte linter が non-interactive と判定するが、tabindex="-1" はフォーカス管理に必要な正しいパターン -->
	<div
		{role}
		aria-modal="true"
		aria-label={ariaLabel}
		tabindex={-1}
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
	>
		{@render children()}
	</div>
{/if}
