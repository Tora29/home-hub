<!--
  @file コンポーネント: Dialog
  @module src/lib/components/Dialog.svelte

  @description
  汎用モーダルシェル。ネイティブ <dialog> + showModal() で実装し、
  フォーカス移動・背景の inert（背景へフォーカス・操作が移らない）をブラウザ標準に任せ、
  閉じた後は開く前のフォーカス位置へ戻す。
  backdrop クリック・Escape キーは open の所有者（親）へ onClose で通知する。
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
		role = 'dialog',
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

	let dialogEl = $state<HTMLDialogElement>();

	// open=true でマウントされた直後にモーダル表示し、アンマウント時に開く前のフォーカス位置へ戻す
	// （DOM から外れる dialog では close() 標準のフォーカス復帰が働かないため明示的に戻す）
	$effect(() => {
		const el = dialogEl;
		if (!el) return;
		const previouslyFocused = document.activeElement as HTMLElement | null;
		if (!el.open) el.showModal();
		return () => {
			if (el.open) el.close();
			previouslyFocused?.focus();
		};
	});

	// Escape はブラウザが dialog を直接閉じるため止め、open の所有者（親）に委ねる
	function handleCancel(e: Event) {
		e.preventDefault();
		if (!disabled) onClose();
	}

	// dialog 要素自体（= カード外の余白）のクリックを backdrop クリックとして扱う
	function handleClick(e: MouseEvent) {
		if (!disabled && closeOnBackdrop && e.target === e.currentTarget) onClose();
	}
</script>

{#if open}
	<!-- onclick は backdrop クリック判定のみ。キーボードでは Escape（cancel イベント）で閉じられる -->
	<dialog
		bind:this={dialogEl}
		{role}
		aria-label={ariaLabel}
		oncancel={handleCancel}
		onclick={handleClick}
		class="fixed inset-0 m-0 h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-transparent px-4 text-inherit backdrop:bg-black/40 open:flex"
	>
		{@render children()}
	</dialog>
{/if}
