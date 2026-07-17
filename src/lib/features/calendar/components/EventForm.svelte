<!--
  @file コンポーネント: EventForm
  @module src/lib/features/calendar/components/EventForm.svelte
  @feature calendar

  @description
  予定の作成・編集フォーム本体。EventModal から {#if open} の中で子コンポーネントとして
  マウントされるため、モーダルを開くたびに新規インスタンス化され title/description/date の
  $state 初期値が毎回フレッシュに評価される（前回入力値が残留しない）。
  登録時は POST /calendar/events、編集時は PUT /calendar/events/[id] を呼ぶ。

  @props
  - mode: 'create' | 'edit' - フォームモード
  - event?: CalendarEvent | null - 編集対象（edit mode のみ）
  - defaultDate?: string - 作成時の日付プリセット（YYYY-MM-DD）
  - onSuccess: (event: CalendarEvent) => void - 送信成功時コールバック
  - onCancel: () => void - キャンセル時コールバック
  - onDeleteClick?: () => void - 削除ボタン押下時コールバック（edit mode のみ表示）
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import Input from '$lib/components/Input.svelte';
	import Textarea from '$lib/components/Textarea.svelte';
	import Button from '$lib/components/Button.svelte';
	import type { CalendarEvent } from '../types';

	let {
		mode,
		event = null,
		defaultDate,
		onSuccess,
		onCancel,
		onDeleteClick
	}: {
		mode: 'create' | 'edit';
		event?: CalendarEvent | null;
		defaultDate?: string;
		onSuccess: (event: CalendarEvent) => void;
		onCancel: () => void;
		onDeleteClick?: () => void;
	} = $props();

	let title = $state(untrack(() => event?.title ?? ''));
	let description = $state(untrack(() => event?.description ?? ''));
	let date = $state(untrack(() => event?.date ?? defaultDate ?? ''));
	let titleError = $state('');
	let dateError = $state('');
	let errorMessage = $state('');
	let isLoading = $state(false);

	function validate(): boolean {
		titleError = '';
		dateError = '';
		let valid = true;

		if (!title.trim()) {
			titleError = 'タイトルは必須です';
			valid = false;
		} else if (title.length > 100) {
			titleError = '100文字以内で入力してください';
			valid = false;
		}

		if (!date) {
			dateError = '日付は必須です';
			valid = false;
		}

		return valid;
	}

	async function handleSubmit() {
		if (!validate()) return;

		isLoading = true;
		errorMessage = '';

		const body = { title: title.trim(), description: description.trim() || null, date };
		const url = mode === 'create' ? '/calendar/events' : `/calendar/events/${event!.id}`;
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
						if (f.field === 'title') titleError = f.message;
						if (f.field === 'date') dateError = f.message;
					}
				} else {
					errorMessage = err.message ?? '操作に失敗しました';
				}
				return;
			}

			const saved = (await res.json()) as CalendarEvent;
			onSuccess(saved);
		} catch {
			errorMessage = '通信エラーが発生しました';
		} finally {
			isLoading = false;
		}
	}
</script>

<form
	data-testid="calendar-event-form"
	class="flex flex-col gap-4"
	onsubmit={(e) => {
		e.preventDefault();
		void handleSubmit();
	}}
>
	<div>
		<label for="calendar-event-title" class="mb-1 block text-sm font-medium text-label">
			タイトル<span class="ml-1 text-destructive">*</span>
		</label>
		<Input
			id="calendar-event-title"
			data-testid="calendar-event-title-input"
			type="text"
			bind:value={title}
			maxlength={100}
			class="w-full"
		/>
		{#if titleError}
			<p class="mt-1 text-xs text-destructive">{titleError}</p>
		{/if}
	</div>

	<div>
		<label for="calendar-event-date" class="mb-1 block text-sm font-medium text-label">
			日付<span class="ml-1 text-destructive">*</span>
		</label>
		<Input
			id="calendar-event-date"
			data-testid="calendar-event-date-input"
			type="date"
			bind:value={date}
			class="w-full"
		/>
		{#if dateError}
			<p class="mt-1 text-xs text-destructive">{dateError}</p>
		{/if}
	</div>

	<div>
		<label for="calendar-event-description" class="mb-1 block text-sm font-medium text-label">
			概要
		</label>
		<Textarea
			id="calendar-event-description"
			data-testid="calendar-event-description-input"
			bind:value={description}
			maxlength={500}
			class="w-full"
		/>
	</div>

	{#if mode === 'edit'}
		<p class="text-xs text-secondary">作成者: {event?.createdByName}</p>
	{/if}

	{#if errorMessage}
		<p role="alert" class="text-sm text-destructive">{errorMessage}</p>
	{/if}

	<div class="flex items-center justify-between gap-3">
		{#if mode === 'edit' && onDeleteClick}
			<Button
				data-testid="calendar-event-delete-button"
				variant="ghost-destructive"
				onclick={onDeleteClick}
				disabled={isLoading}
				type="button"
			>
				削除
			</Button>
		{:else}
			<span></span>
		{/if}
		<div class="flex gap-3">
			<Button variant="secondary" onclick={onCancel} disabled={isLoading} type="button">
				キャンセル
			</Button>
			<Button
				data-testid="calendar-event-submit-button"
				type="submit"
				variant="primary"
				disabled={isLoading}
			>
				保存
			</Button>
		</div>
	</div>
</form>
