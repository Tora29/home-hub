<!--
  @file コンポーネント: RecipeFormDialog
  @module src/lib/features/recipes/components/RecipeFormDialog.svelte
  @feature recipes

  @description
  レシピの登録・編集フォームをモーダルダイアログで表示するコンポーネント。
  Dialog をベースに RecipeForm を内包する。登録・編集の2モードを1コンポーネントで担う。

  @props
  - open: boolean - 表示状態
  - mode: 'create' | 'edit' - フォームモード
  - recipe?: Recipe | null - 編集対象（edit mode のみ）
  - onSuccess: () => void | Promise<void> - 送信成功時コールバック
  - onClose: () => void - 閉じる時コールバック
-->
<script lang="ts">
	import Dialog from '$lib/components/Dialog.svelte';
	import RecipeForm from './RecipeForm.svelte';
	import type { Recipe } from '../types';

	let {
		open,
		mode,
		recipe = null,
		onSuccess,
		onClose
	}: {
		open: boolean;
		mode: 'create' | 'edit';
		recipe?: Recipe | null;
		onSuccess: () => void | Promise<void>;
		onClose: () => void;
	} = $props();
</script>

<Dialog {open} {onClose} role="dialog" aria-label={mode === 'create' ? 'レシピ登録' : 'レシピ編集'}>
	{#if open}
		<div class="w-full max-w-2xl rounded-3xl bg-bg-card shadow-md">
			<RecipeForm {mode} recipe={recipe ?? undefined} {onSuccess} onCancel={onClose} />
		</div>
	{/if}
</Dialog>
