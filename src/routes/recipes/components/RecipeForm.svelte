<!--
  @file コンポーネント: RecipeForm
  @module src/routes/recipes/components/RecipeForm.svelte
  @feature recipes

  @description
  レシピの登録・編集フォーム。
  登録時は「AI で解析」タブと「手動入力」タブの 2 タブ構成。
  編集時は手動入力タブのみ表示する。

  @spec specs/recipes/spec.md
  @acceptance AC-002, AC-004, AC-007, AC-011, AC-012, AC-101

  @props
  - mode: 'create' | 'edit' - フォームモード
  - recipe: Recipe | undefined - 編集時のレシピデータ（edit mode のみ）
  - onSuccess: () => void | Promise<void> - 送信成功時コールバック
  - onCancel: () => void - キャンセル時コールバック
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { LoaderCircle, Plus, Trash2, X } from '@lucide/svelte';
	import Input from '$lib/components/Input.svelte';
	import Textarea from '$lib/components/Textarea.svelte';
	import Select from '$lib/components/Select.svelte';
	import Button from '$lib/components/Button.svelte';

	interface Ingredient {
		name: string;
		amount?: string | null;
	}

	interface Recipe {
		id: string;
		name: string;
		description: string | null;
		imageUrl: string | null;
		ingredients: Ingredient[] | null;
		steps: string[] | null;
		sourceUrl: string | null;
		servings: number | null;
		cookingTimeMinutes: number | null;
		cookedCount: number;
		lastCookedAt: Date | null;
		rating: string | null;
		difficulty: string | null;
		memo: string | null;
	}

	let {
		mode,
		recipe,
		onSuccess,
		onCancel
	}: {
		mode: 'create' | 'edit';
		recipe?: Recipe;
		onSuccess: () => void | Promise<void>;
		onCancel: () => void;
	} = $props();

	function toDatetimeLocal(date: Date | null | undefined): string {
		if (!date) return '';
		const d = new Date(date);
		if (isNaN(d.getTime())) return '';
		const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
		return local.toISOString().slice(0, 16);
	}

	// Tab state - untrack props to intentionally capture only the initial value
	let activeTab = $state<'ai' | 'manual'>(untrack(() => (mode === 'edit' ? 'manual' : 'ai')));

	// AI extract state
	let extractText = $state('');
	let isExtracting = $state(false);
	let extractError = $state('');

	// Form fields - untrack props to intentionally capture only the initial value
	let name = $state(untrack(() => recipe?.name ?? ''));
	let description = $state(untrack(() => recipe?.description ?? ''));
	let imageUrl = $state(untrack(() => recipe?.imageUrl ?? ''));
	let sourceUrl = $state(untrack(() => recipe?.sourceUrl ?? ''));
	let servingsStr = $state(untrack(() => recipe?.servings?.toString() ?? ''));
	let cookingTimeStr = $state(untrack(() => recipe?.cookingTimeMinutes?.toString() ?? ''));
	let difficulty = $state(untrack(() => recipe?.difficulty ?? ''));
	let rating = $state(untrack(() => recipe?.rating ?? ''));
	let cookedCountStr = $state(untrack(() => recipe?.cookedCount?.toString() ?? '0'));
	let lastCookedAtStr = $state(untrack(() => toDatetimeLocal(recipe?.lastCookedAt)));
	let ingredients = $state<{ name: string; amount: string }[]>(
		untrack(() => recipe?.ingredients?.map((i) => ({ name: i.name, amount: i.amount ?? '' })) ?? [])
	);
	let steps = $state<string[]>(untrack(() => recipe?.steps ?? []));
	let memo = $state(untrack(() => recipe?.memo ?? ''));

	// Submit state
	let isSubmitting = $state(false);
	let nameError = $state('');

	// Dynamic list helpers
	function addIngredient() {
		ingredients = [...ingredients, { name: '', amount: '' }];
	}

	function removeIngredient(index: number) {
		ingredients = ingredients.filter((_, i) => i !== index);
	}

	function addStep() {
		steps = [...steps, ''];
	}

	function removeStep(index: number) {
		steps = steps.filter((_, i) => i !== index);
	}

	// AI extract
	async function handleExtract() {
		if (!extractText.trim()) return;
		isExtracting = true;
		extractError = '';
		try {
			const res = await fetch('/recipes/extract', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: extractText })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({})) as { message?: string };
				extractError = err.message ?? 'AI 解析に失敗しました。手動で入力してください。';
				activeTab = 'manual';
				return;
			}
			const data = (await res.json()) as {
				name?: string | null;
				description?: string | null;
				servings?: number | null;
				cookingTimeMinutes?: number | null;
				ingredients?: { name: string; amount?: string }[] | null;
				steps?: string[] | null;
			};

			if (data.name) name = data.name;
			if (data.description) description = data.description;
			if (data.servings) servingsStr = data.servings.toString();
			if (data.cookingTimeMinutes) cookingTimeStr = data.cookingTimeMinutes.toString();
			if (data.ingredients) {
				ingredients = data.ingredients.map((i) => ({ name: i.name, amount: i.amount ?? '' }));
			}
			if (data.steps) {
				steps = [...data.steps];
			}

			activeTab = 'manual';
		} finally {
			isExtracting = false;
		}
	}

	// Submit
	async function handleSubmit() {
		nameError = '';

		if (!name.trim()) {
			nameError = 'レシピ名は必須です';
			return;
		}

		const filteredIngredients = ingredients
			.filter((i) => i.name.trim())
			.map((i) => ({ name: i.name, ...(i.amount ? { amount: i.amount } : {}) }));

		const filteredSteps = steps.filter((s) => s.trim());

		const servings = servingsStr !== '' ? parseInt(servingsStr) : undefined;
		const cookingTimeMinutes = cookingTimeStr !== '' ? parseInt(cookingTimeStr) : undefined;

		isSubmitting = true;
		try {
			let res: Response;

			if (mode === 'create') {
				const payload: Record<string, unknown> = { name };
				if (description) payload.description = description;
				if (imageUrl) payload.imageUrl = imageUrl;
				if (sourceUrl) payload.sourceUrl = sourceUrl;
				if (servings !== undefined && !isNaN(servings)) payload.servings = servings;
				if (cookingTimeMinutes !== undefined && !isNaN(cookingTimeMinutes))
					payload.cookingTimeMinutes = cookingTimeMinutes;
				if (difficulty) payload.difficulty = difficulty;
				if (rating) payload.rating = rating;
				if (filteredIngredients.length > 0) payload.ingredients = filteredIngredients;
				if (filteredSteps.length > 0) payload.steps = filteredSteps;
				if (memo) payload.memo = memo;

				res = await fetch('/recipes', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
			} else {
				const cookedCount = parseInt(cookedCountStr) || 0;
				const payload = {
					name,
					cookedCount,
					description: description || null,
					imageUrl: imageUrl || null,
					sourceUrl: sourceUrl || null,
					servings: servings !== undefined && !isNaN(servings) ? servings : null,
					cookingTimeMinutes:
						cookingTimeMinutes !== undefined && !isNaN(cookingTimeMinutes)
							? cookingTimeMinutes
							: null,
					difficulty: difficulty || null,
					rating: rating || null,
					lastCookedAt: lastCookedAtStr ? new Date(lastCookedAtStr).toISOString() : null,
					ingredients: filteredIngredients.length > 0 ? filteredIngredients : null,
					steps: filteredSteps.length > 0 ? filteredSteps : null,
					memo: memo || null
				};

				res = await fetch(`/recipes/${recipe!.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
			}

			const json = await res.json();
			if (!res.ok) {
				if (json.code === 'VALIDATION_ERROR' && Array.isArray(json.fields)) {
					for (const field of json.fields as { field: string; message: string }[]) {
						if (field.field === 'name') nameError = field.message;
					}
				}
				return;
			}

			await onSuccess();
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex flex-col">
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-separator px-6 py-4">
		<h2 class="text-lg font-medium text-label">
			{mode === 'create' ? 'レシピを登録' : 'レシピを編集'}
		</h2>
		<button
			type="button"
			onclick={onCancel}
			aria-label="閉じる"
			class="rounded-full p-1.5 text-secondary transition-colors hover:text-label"
		>
			<X size={18} />
		</button>
	</div>

	<!-- Tabs (create mode only) -->
	{#if mode === 'create'}
		<div class="flex border-b border-separator">
			<button
				type="button"
				onclick={() => (activeTab = 'ai')}
				class="px-6 py-3 text-sm font-medium transition-colors {activeTab === 'ai'
					? 'border-b-2 border-accent text-accent'
					: 'text-secondary hover:text-label'}"
			>
				AI で解析
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'manual')}
				class="px-6 py-3 text-sm font-medium transition-colors {activeTab === 'manual'
					? 'border-b-2 border-accent text-accent'
					: 'text-secondary hover:text-label'}"
			>
				手動入力
			</button>
		</div>
	{/if}

	<!-- AI Tab -->
	{#if mode === 'create' && activeTab === 'ai'}
		<div class="p-6">
			<p class="mb-3 text-sm text-secondary">
				レシピサイトのテキストを丸ごと貼り付けてください。AI が自動でレシピ情報を抽出します。
			</p>
			<div class="mb-3 flex flex-col gap-1">
				<label for="ai-source-url" class="text-sm font-medium text-label">参照元 URL（任意）</label>
				<Input
					id="ai-source-url"
					type="url"
					data-testid="recipes-source-url-input"
					bind:value={sourceUrl}
					placeholder="https://..."
					size="lg"
					class="w-full"
				/>
			</div>
			<Textarea
				data-testid="recipes-extract-input"
				bind:value={extractText}
				placeholder="サイトからコピーしたテキストをここに貼り付け（広告・ナビゲーションが含まれていても大丈夫です）"
				rows={10}
				size="md"
				class="w-full"
			/>
			<Button
				data-testid="recipes-extract-button"
				type="button"
				onclick={() => void handleExtract()}
				disabled={isExtracting || !extractText.trim()}
				variant="primary"
				size="lg"
				class="mt-3"
			>
				{#if isExtracting}
					<LoaderCircle size={16} class="animate-spin" />
					解析中...
				{:else}
					AI で解析
				{/if}
			</Button>
		</div>
	{/if}

	<!-- Manual Tab -->
	{#if activeTab === 'manual' || mode === 'edit'}
		{#if extractError}
			<p class="mx-6 mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
				{extractError}
			</p>
		{/if}
		<form
			data-testid="recipes-form"
			novalidate
			onsubmit={(e) => {
				e.preventDefault();
				void handleSubmit();
			}}
			class="flex flex-col gap-5 p-6"
		>
			<!-- Name -->
			<div class="flex flex-col gap-1">
				<label for="recipe-name" class="text-sm font-medium text-label">
					レシピ名 <span class="text-destructive" aria-hidden="true">*</span>
				</label>
				<Input
					id="recipe-name"
					type="text"
					data-testid="recipes-name-input"
					bind:value={name}
					maxlength={100}
					size="lg"
					class="w-full"
				/>
				{#if nameError}
					<p data-testid="recipes-name-error" class="text-xs text-destructive">{nameError}</p>
				{/if}
			</div>

			<!-- Description -->
			<div class="flex flex-col gap-1">
				<label for="recipe-description" class="text-sm font-medium text-label">概要</label>
				<Textarea
					id="recipe-description"
					data-testid="recipes-description-input"
					bind:value={description}
					maxlength={500}
					rows={3}
					size="lg"
					class="w-full"
				/>
			</div>

			<!-- Servings + CookingTime -->
			<div class="grid grid-cols-2 gap-4">
				<div class="flex flex-col gap-1">
					<label for="recipe-servings" class="text-sm font-medium text-label">何人前</label>
					<Input
						id="recipe-servings"
						type="number"
						data-testid="recipes-servings-input"
						bind:value={servingsStr}
						min="1"
						size="lg"
						class="w-full"
					/>
				</div>
				<div class="flex flex-col gap-1">
					<label for="recipe-cooking-time" class="text-sm font-medium text-label">
						調理時間（分）
					</label>
					<Input
						id="recipe-cooking-time"
						type="number"
						data-testid="recipes-cooking-time-input"
						bind:value={cookingTimeStr}
						min="1"
						size="lg"
						class="w-full"
					/>
				</div>
			</div>

			<!-- Difficulty + Rating -->
			<div class="grid grid-cols-2 gap-4">
				<div class="flex flex-col gap-1">
					<label for="recipe-difficulty" class="text-sm font-medium text-label">難易度</label>
					<Select
						id="recipe-difficulty"
						data-testid="recipes-difficulty-select"
						bind:value={difficulty}
						size="lg"
						class="w-full"
					>
						<option value="">未設定</option>
						<option value="easy">簡単</option>
						<option value="medium">普通</option>
						<option value="hard">難しい</option>
					</Select>
				</div>
				<div class="flex flex-col gap-1">
					<label for="recipe-rating" class="text-sm font-medium text-label">評価</label>
					<Select
						id="recipe-rating"
						data-testid="recipes-rating-select"
						bind:value={rating}
						size="lg"
						class="w-full"
					>
						<option value="">未設定</option>
						<option value="excellent">非常に美味しい</option>
						<option value="good">美味しい</option>
						<option value="average">普通</option>
						<option value="poor">微妙</option>
					</Select>
				</div>
			</div>

			<!-- CookedCount + LastCookedAt (edit mode only) -->
			{#if mode === 'edit'}
				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-1">
						<label for="recipe-cooked-count" class="text-sm font-medium text-label">
							作った回数
						</label>
						<Input
							id="recipe-cooked-count"
							type="number"
							data-testid="recipes-cooked-count-input"
							bind:value={cookedCountStr}
							min="0"
							size="lg"
							class="w-full"
						/>
					</div>
					<div class="flex flex-col gap-1">
						<label for="recipe-last-cooked" class="text-sm font-medium text-label">
							最終調理日
						</label>
						<Input
							id="recipe-last-cooked"
							type="datetime-local"
							data-testid="recipes-last-cooked-input"
							bind:value={lastCookedAtStr}
							size="lg"
							class="w-full"
						/>
					</div>
				</div>
			{/if}

			<!-- Ingredients -->
			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium text-label">材料</span>
					<button
						type="button"
						data-testid="recipes-ingredient-add-button"
						onclick={addIngredient}
						class="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-accent hover:bg-bg-secondary"
					>
						<Plus size={14} />
						追加
					</button>
				</div>
				{#each ingredients as _ingredient, i (i)}
					<div data-testid="recipes-ingredient-item" class="flex items-center gap-2">
						<Input
							type="text"
							data-testid="recipes-ingredient-name-input"
							bind:value={ingredients[i].name}
							placeholder="材料名"
							size="md"
							class="flex-1"
						/>
						<Input
							type="text"
							data-testid="recipes-ingredient-amount-input"
							bind:value={ingredients[i].amount}
							placeholder="量（例: 300g）"
							size="md"
							class="w-32"
						/>
						<button
							type="button"
							data-testid="recipes-ingredient-remove-button"
							onclick={() => removeIngredient(i)}
							aria-label="材料を削除"
							class="rounded-xl p-2 text-secondary transition-colors hover:text-destructive"
						>
							<Trash2 size={16} />
						</button>
					</div>
				{/each}
			</div>

			<!-- Steps -->
			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium text-label">手順</span>
					<button
						type="button"
						data-testid="recipes-step-add-button"
						onclick={addStep}
						class="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-accent hover:bg-bg-secondary"
					>
						<Plus size={14} />
						追加
					</button>
				</div>
				{#each steps as _step, i (i)}
					<div data-testid="recipes-step-item" class="flex items-start gap-2">
						<span
							class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-bg-secondary text-xs font-medium text-secondary"
						>
							{i + 1}
						</span>
						<Textarea
							data-testid="recipes-step-input"
							bind:value={steps[i]}
							placeholder="手順を入力..."
							rows={2}
							size="md"
							class="flex-1"
						/>
						<button
							type="button"
							data-testid="recipes-step-remove-button"
							onclick={() => removeStep(i)}
							aria-label="手順を削除"
							class="mt-1 rounded-xl p-2 text-secondary transition-colors hover:text-destructive"
						>
							<Trash2 size={16} />
						</button>
					</div>
				{/each}
			</div>

			<!-- Image URL -->
			<div class="flex flex-col gap-1">
				<label for="recipe-image-url" class="text-sm font-medium text-label">画像 URL</label>
				<Input
					id="recipe-image-url"
					type="url"
					data-testid="recipes-image-url-input"
					bind:value={imageUrl}
					placeholder="https://..."
					size="lg"
					class="w-full"
				/>
			</div>

			<!-- Source URL -->
			<div class="flex flex-col gap-1">
				<label for="recipe-source-url" class="text-sm font-medium text-label">参照元 URL</label>
				<Input
					id="recipe-source-url"
					type="url"
					data-testid="recipes-source-url-input"
					bind:value={sourceUrl}
					placeholder="https://..."
					size="lg"
					class="w-full"
				/>
			</div>

			<!-- Memo -->
			<div class="flex flex-col gap-1">
				<label for="recipe-memo" class="text-sm font-medium text-label">メモ</label>
				<Textarea
					id="recipe-memo"
					data-testid="recipes-memo-input"
					bind:value={memo}
					maxlength={1000}
					rows={3}
					placeholder="調理後の感想や工夫したことなど"
					size="lg"
					class="w-full"
				/>
			</div>

			<!-- Action buttons -->
			<div class="flex justify-end gap-3 pt-2">
				<Button type="button" onclick={onCancel} variant="secondary" size="lg">キャンセル</Button>
				<Button
					type="submit"
					data-testid="recipes-submit-button"
					disabled={isSubmitting}
					variant="primary"
					size="lg"
				>
					{#if isSubmitting}
						<LoaderCircle size={16} class="animate-spin" />
						保存中...
					{:else}
						保存
					{/if}
				</Button>
			</div>
		</form>
	{/if}
</div>
