<!--
  @file コンポーネント: ExpenseForm
  @module src/routes/expenses/components/ExpenseForm.svelte
  @feature expenses

  @description
  支出の登録・編集フォームダイアログ内コンポーネント。
  登録時は POST /expenses、編集時は PUT /expenses/[id] を呼ぶ。
  FE バリデーションで空入力・未選択を即時フィードバックする。
  全角数字を半角に自動変換し、金額をカンマ区切りで整形する（AC-206, AC-207）。

  @spec specs/expenses/spec.md
  @acceptance AC-003, AC-006, AC-033, AC-034, AC-111, AC-112, AC-206, AC-207

  @props
  - mode: 'create' | 'edit' - フォームモード
  - expense?: ExpenseWithRelations - 編集対象（edit mode のみ）
  - categories: Category[] - カテゴリ一覧
  - users: User[] - システムユーザー一覧（支払者選択用）
  - onSuccess: () => void | Promise<void> - 送信成功時コールバック
  - onCancel: () => void - キャンセル時コールバック
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { LoaderCircle } from '@lucide/svelte';
	import Input from '$lib/components/Input.svelte';
	import Select from '$lib/components/Select.svelte';
	import Button from '$lib/components/Button.svelte';
	import type { Category, User, ExpenseWithRelations } from '../types';

	let {
		mode,
		expense,
		categories,
		users,
		onSuccess,
		onCancel
	}: {
		mode: 'create' | 'edit';
		expense?: ExpenseWithRelations;
		categories: Category[];
		users: User[];
		onSuccess: () => void | Promise<void>;
		onCancel: () => void;
	} = $props();

	// 内部値はカンマなしの半角数字文字列
	let amountRaw = $state(untrack(() => (expense ? String(expense.amount) : '')));
	let categoryId = $state(untrack(() => expense?.categoryId ?? ''));
	let payerUserId = $state(untrack(() => expense?.payerUserId ?? ''));
	let amountError = $state('');
	let categoryError = $state('');
	let payerError = $state('');
	let serverError = $state('');
	let isSubmitting = $state(false);

	// 全角数字→半角、カンマ・非数字を除去して内部値を更新し、入力欄をカンマ整形で再描画
	function handleAmountInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const raw = input.value
			.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
			.replace(/[,，]/g, '')
			.replace(/[^0-9]/g, '');
		amountRaw = raw;
		// カンマ整形で再描画
		input.value = raw ? Number(raw).toLocaleString('ja-JP') : '';
		// 入力変更時にエラーをクリア（AC: タイミング）
		if (amountError) amountError = '';
	}

	function validate(): boolean {
		amountError = '';
		categoryError = '';
		payerError = '';
		let valid = true;

		if (!amountRaw) {
			amountError = '金額は必須です';
			valid = false;
		} else {
			const n = Number(amountRaw);
			if (n < 1) {
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

		if (!payerUserId) {
			payerError = '支払者は必須です';
			valid = false;
		}

		return valid;
	}

	async function handleSubmit() {
		if (!validate()) return;

		isSubmitting = true;
		serverError = '';

		const amount = Number(amountRaw);
		const body = { amount, categoryId, payerUserId };

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
						if (f.field === 'payerUserId') payerError = f.message;
					}
				} else {
					serverError = err.message ?? 'エラーが発生しました';
				}
				return;
			}

			await onSuccess();
		} catch {
			serverError = '通信エラーが発生しました';
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
		class="flex flex-col gap-4"
		onsubmit={(e) => {
			e.preventDefault();
			void handleSubmit();
		}}
	>
		<!-- 金額 -->
		<div>
			<label for="expense-amount" class="mb-1 block text-sm font-medium text-label">
				金額（円）<span class="ml-1 text-destructive">*</span>
			</label>
			<Input
				id="expense-amount"
				data-testid="expense-amount-input"
				type="text"
				inputmode="numeric"
				value={amountRaw ? Number(amountRaw).toLocaleString('ja-JP') : ''}
				oninput={handleAmountInput}
				placeholder="例: 3,000"
				class="w-full"
			/>
			{#if amountError}
				<p data-testid="expense-amount-error" class="mt-1 text-xs text-destructive">
					{amountError}
				</p>
			{/if}
		</div>

		<!-- カテゴリ -->
		<div>
			<label for="expense-category" class="mb-1 block text-sm font-medium text-label">
				カテゴリ<span class="ml-1 text-destructive">*</span>
			</label>
			<Select
				id="expense-category"
				data-testid="expense-category-select"
				bind:value={categoryId}
				onchange={() => {
					if (categoryError) categoryError = '';
				}}
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

		<!-- 支払者 -->
		<div>
			<label for="expense-payer" class="mb-1 block text-sm font-medium text-label">
				支払者<span class="ml-1 text-destructive">*</span>
			</label>
			<Select
				id="expense-payer"
				data-testid="expense-payer-select"
				bind:value={payerUserId}
				onchange={() => {
					if (payerError) payerError = '';
				}}
				class="w-full"
			>
				<option value="">選択してください</option>
				{#each users as u (u.id)}
					<option value={u.id}>{u.name}</option>
				{/each}
			</Select>
			{#if payerError}
				<p data-testid="expense-payer-error" class="mt-1 text-xs text-destructive">
					{payerError}
				</p>
			{/if}
		</div>

		{#if serverError}
			<p role="alert" class="text-sm text-destructive">{serverError}</p>
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
