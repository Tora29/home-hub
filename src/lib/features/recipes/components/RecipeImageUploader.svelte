<!--
  @file コンポーネント: RecipeImageUploader
  @module src/lib/features/recipes/components/RecipeImageUploader.svelte
  @feature recipes

  @description
  レシピ画像のドラッグ&ドロップ／ファイル選択アップロード UI。
  プレビュー表示・削除・形式/サイズバリデーションを担当する。
  実際の R2 アップロード（POST /recipes/upload）は親コンポーネント（RecipeForm）が行う。

  @props
  - imageUrl: string - 既存画像 URL（bindable。削除時に空文字へリセットされる）
  - imageFile: File | null - 選択中のファイル（bindable）
  - imageError: string - バリデーション/アップロードエラー（bindable。親からも設定可能）
-->
<script lang="ts">
	import { ImagePlus, X } from '@lucide/svelte';
	import { RECIPE_IMAGE_ALLOWED_TYPES, RECIPE_IMAGE_MAX_SIZE } from '../schema';

	let {
		imageUrl = $bindable(''),
		imageFile = $bindable(null),
		imageError = $bindable('')
	}: {
		imageUrl?: string;
		imageFile?: File | null;
		imageError?: string;
	} = $props();

	let imagePreviewUrl = $state<string | null>(null);
	let isDragOver = $state(false);
	let imageInputEl = $state<HTMLInputElement | undefined>();

	let imagePreviewSrc = $derived(imagePreviewUrl ?? (imageUrl || null));

	function processFile(file: File) {
		imageError = '';
		if (!RECIPE_IMAGE_ALLOWED_TYPES.includes(file.type)) {
			imageError = 'JPEG / PNG / WebP 形式のファイルを選択してください';
			return;
		}
		if (file.size > RECIPE_IMAGE_MAX_SIZE) {
			imageError = '5 MB 以下のファイルを選択してください';
			return;
		}
		if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
		imageFile = file;
		imagePreviewUrl = URL.createObjectURL(file);
	}

	function handleFileSelect(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) processFile(file);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragOver = true;
	}

	function handleDragLeave() {
		isDragOver = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
		const file = e.dataTransfer?.files[0];
		if (file) processFile(file);
	}

	function handleImageRemove() {
		imageFile = null;
		if (imagePreviewUrl) {
			URL.revokeObjectURL(imagePreviewUrl);
			imagePreviewUrl = null;
		}
		imageUrl = '';
		if (imageInputEl) imageInputEl.value = '';
	}
</script>

<div class="flex flex-col gap-1">
	<span class="text-sm font-medium text-label">画像</span>
	{#if imagePreviewSrc}
		<div class="relative">
			<img
				data-testid="recipes-image-preview"
				src={imagePreviewSrc}
				alt="プレビュー"
				class="h-48 w-full rounded-2xl object-cover"
			/>
			<button
				type="button"
				data-testid="recipes-image-remove-button"
				onclick={handleImageRemove}
				aria-label="画像を削除"
				class="absolute top-2 right-2 rounded-full bg-bg-card/80 p-1.5 text-secondary transition-colors hover:text-destructive"
			>
				<X size={16} />
			</button>
		</div>
	{:else}
		<div
			data-testid="recipes-image-upload-area"
			role="button"
			tabindex={0}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			onclick={() => imageInputEl?.click()}
			onkeydown={(e) => e.key === 'Enter' && imageInputEl?.click()}
			class="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-colors {isDragOver
				? 'border-accent bg-accent/5'
				: 'border-separator hover:border-accent/50 hover:bg-bg-secondary'}"
		>
			<ImagePlus size={24} class="text-tertiary" />
			<p class="text-center text-sm text-secondary">
				<span class="hidden sm:inline">ここにドロップ または </span>クリック/タップして選択
			</p>
			<p class="text-xs text-tertiary">JPEG / PNG / WebP · 5 MB 以下</p>
		</div>
	{/if}
	<input
		bind:this={imageInputEl}
		data-testid="recipes-image-upload-input"
		type="file"
		accept=".jpg,.jpeg,.png,.webp"
		class="hidden"
		onchange={handleFileSelect}
	/>
	{#if imageError}
		<p class="text-xs text-destructive">{imageError}</p>
	{/if}
</div>
