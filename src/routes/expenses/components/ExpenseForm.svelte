<!--
  @file コンポーネント: ExpenseForm
  @module src/routes/expenses/components/ExpenseForm.svelte
  @feature expenses

  @description
  支出の登録・編集フォームダイアログ内コンポーネント。
  登録時は POST /expenses、編集時は PUT /expenses/[id] を呼ぶ。
  FE バリデーションで空入力・未選択を即時フィードバックする。

  @spec specs/expenses/spec.md
  @acceptance AC-003, AC-006, AC-111, AC-112

  @props
  - mode: 'create' | 'edit' - フォームモード
  - expense?: ExpenseWithCategory - 編集対象（edit mode のみ）
  - categories: Category[] - カテゴリ一覧
  - onSuccess: () => void | Promise<void> - 送信成功時コールバック
  - onCancel: () => void - キャンセル時コールバック
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { LoaderCircle } from '@lucide/svelte';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import Button from '$lib/components/Button.svelte';

	type Category = { id: string; userId: string; name: string; createdAt: Date };
	type ExpenseWithCategory = {
		id: string;
		userId: string;
		amount: number;
		categoryId: string;
		approvedAt: Date | null;
		createdAt: Date;
		category: Category;
	};

	let {
		mode,
		expense,
		categories,
		onSuccess,
		onCancel
	}: {
		mode: 'create' | 'edit';
		expense?: ExpenseWithCategory;
		categories: Category[];
		onSuccess: () => void | Promise<void>;
		onCancel: () => void;
	} = $props();

	let amountStr = $state(untrack(() => (expense ? String(expense.amount) : '')));
	let categoryId = $state(untrack(() => expense?.categoryId ?? ''));
	let amountError = $state('');
	let categoryError = $state('');
	let serverError = $state('');
	let isSubmitting = $state(false);

	function validate(): boolean {
		amountError = '';
		categoryError = '';
		let valid = true;

		if (!amountStr.trim()) {
			amountError = '金額は必須です';
			valid = false;
		} else {
			const n = Number(amountStr);
			if (!Number.isInteger(n) || isNaN(n) || n < 1) {
				amountError = '1円以上の金額を入力してください';
				valid = false;
			} else if (n > 9999999) {
				amountError = '9,999,999円以下の金額を入力してください';
				valid = false;
			}
		}

		if (!categoryId) {
			categoryError = 'カテゴリは必須です';
			valid = false;
		}

		return valid;
	}

	async function handleSubmit() {
		if (!validate()) return;

		isSubmitting = true;
		serverError = '';

		const amount = Number(amountStr);
		const approved = expense?.approvedAt !== null && expense?.approvedAt !== undefined;
		const body = mode === 'create' ? { amount, categoryId } : { amount, categoryId, approved };

		const url = mode === 'create' ? '/expenses' : `/expenses/${expense!.id}`;
		const method = mode === 'create' ? 'POST' : 'PUT';

		try {
			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			if (!res.ok) {
				const err = (await res.json()) as {
					code?: string;
					message?: string;
					fields?: { field: string; message: string }[];
				};
				if (err.code === 'VALIDATION_ERROR' && err.fields) {
					for (const f of err.fields) {
						if (f.field === 'amount') amountError = f.message;
						if (f.field === 'categoryId') categoryError = f.message;
					}
				} else {
					serverError = err.message ?? 'エラーが発生しました';
				}
				return;
			}

			await onSuccess();
		} catch {
			serverError = 'エラーが発生しました';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="p-6">
	<h2 class="mb-6 text-lg font-medium text-label">
		{mode === 'create' ? '支出を登録' : '支出を編集'}
	</h2>

	<form
		data-testid="expense-form"
		onsubmit={(e) => {
			e.preventDefault();
			void handleSubmit();
		}}
	>
		<!-- 金額 -->
		<div class="mb-4">
			<label for="expense-amount" class="mb-1 block text-sm font-medium text-label">
				金額（円）<span class="ml-1 text-destructive">*</span>
			</label>
			<Input
				id="expense-amount"
				data-testid="expense-amount-input"
				type="text"
				inputmode="numeric"
				pattern="[0-9]*"
				bind:value={amountStr}
				placeholder="例: 3000"
				class="w-full"
			/>
			{#if amountError}
				<p data-testid="expense-amount-error" class="mt-1 text-xs text-destructive">
					{amountError}
				</p>
			{/if}
		</div>

		<!-- カテゴリ -->
		<div class="mb-6">
			<label for="expense-category" class="mb-1 block text-sm font-medium text-label">
				カテゴリ<span class="ml-1 text-destructive">*</span>
			</label>
			<Select
				id="expense-category"
				data-testid="expense-category-select"
				bind:value={categoryId}
				class="w-full"
			>
				<option value="">選択してください</option>
				{#each categories as cat (cat.id)}
					<option value={cat.id}>{cat.name}</option>
				{/each}
			</Select>
			{#if categoryError}
				<p data-testid="expense-category-error" class="mt-1 text-xs text-destructive">
					{categoryError}
				</p>
			{/if}
		</div>

		{#if serverError}
			<p class="mb-4 text-sm text-destructive">{serverError}</p>
		{/if}

		<div class="flex justify-end gap-3">
			<Button variant="secondary" onclick={onCancel} type="button">キャンセル</Button>
			<Button
				data-testid="expense-submit-button"
				type="submit"
				variant="primary"
				disabled={isSubmitting}
			>
				{#if isSubmitting}
					<LoaderCircle size={16} class="animate-spin" />
				{/if}
				確定
			</Button>
		</div>
	</form>
</div>
