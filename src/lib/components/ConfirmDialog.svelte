<!--
  @file コンポーネント: ConfirmDialog
  @module src/lib/components/ConfirmDialog.svelte

  @description
  確認ダイアログ。タイトル・説明文・キャンセル/実行ボタンを持つ汎用コンポーネント。
  Dialog をベースに「確認してから実行する」パターンを実装する。

  @props
  - open: boolean - 表示状態
  - title: string - ダイアログタイトル
  - description: string - 説明文
  - confirmLabel: string - 確認ボタンのラベル（デフォルト: '確定'）
  - confirmVariant: 'primary' | 'destructive' - 確認ボタンのバリアント（デフォルト: 'primary'）
  - loading: boolean - 処理中フラグ。true のとき Escape・両ボタンを無効化（デフォルト: false）
  - error: string - エラーメッセージ（省略可）
  - onConfirm: () => void | Promise<void> - 確認ボタン押下時コールバック
  - onCancel: () => void - キャンセル時コールバック
  - confirmTestid: string - 確認ボタンの data-testid（省略可）
  - ...rest - data-testid 等をダイアログカード div に透過
-->
<script lang="ts">
	import Dialog from './Dialog.svelte';
	import Button from './Button.svelte';

	let {
		open,
		title,
		description,
		confirmLabel = '確定',
		confirmVariant = 'primary' as 'primary' | 'destructive',
		loading = false,
		error = '',
		onConfirm,
		onCancel,
		confirmTestid,
		...rest
	}: {
		open: boolean;
		title: string;
		description: string;
		confirmLabel?: string;
		confirmVariant?: 'primary' | 'destructive';
		loading?: boolean;
		error?: string;
		onConfirm: () => void | Promise<void>;
		onCancel: () => void;
		confirmTestid?: string;
		[key: string]: unknown;
	} = $props();
</script>

<Dialog
	{open}
	onClose={onCancel}
	closeOnBackdrop={false}
	disabled={loading}
	role="alertdialog"
	aria-label={title}
>
	<div {...rest} class="w-full max-w-sm rounded-3xl bg-bg-card p-6 shadow-md">
		<h2 class="mb-2 text-lg font-medium text-label">{title}</h2>
		<p class="mb-6 text-sm text-secondary">{description}</p>
		{#if error}
			<p class="mb-4 text-sm text-destructive">{error}</p>
		{/if}
		<div class="flex justify-end gap-3">
			<Button variant="secondary" onclick={onCancel} disabled={loading} type="button">
				キャンセル
			</Button>
			<Button
				data-testid={confirmTestid}
				variant={confirmVariant}
				onclick={() => void onConfirm()}
				disabled={loading}
				type="button"
			>
				{confirmLabel}
			</Button>
		</div>
	</div>
</Dialog>
