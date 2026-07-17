<!--
  @file コンポーネント: RecipeIngredientsStepsEditor
  @module src/lib/features/recipes/components/RecipeIngredientsStepsEditor.svelte
  @feature recipes

  @description
  材料・手順の動的リスト編集 UI。行の追加・削除・入力を担当する。

  @props
  - ingredients: { name: string; amount: string }[] - 材料リスト（bindable）
  - steps: string[] - 手順リスト（bindable）
-->
<script lang="ts">
	import { Plus, Trash2 } from '@lucide/svelte';
	import Input from '$lib/components/Input.svelte';
	import Textarea from '$lib/components/Textarea.svelte';

	let {
		ingredients = $bindable([]),
		steps = $bindable([])
	}: {
		ingredients?: { name: string; amount: string }[];
		steps?: string[];
	} = $props();

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
</script>

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
