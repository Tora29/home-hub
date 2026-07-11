<!--
  @file コンポーネント: EventModal
  @module src/lib/features/calendar/components/EventModal.svelte
  @feature calendar

  @description
  予定の作成・編集をモーダルダイアログで行うコンポーネント。
  作成者本人の場合のみ入力フォーム・削除ボタンを表示し、
  作成者以外は読み取り専用表示にする。

  @props
  - open: boolean - 表示状態
  - mode: 'create' | 'edit' - フォームモード
  - event?: CalendarEvent | null - 編集対象（edit mode のみ）
  - defaultDate?: string - 作成時の日付プリセット（YYYY-MM-DD）
  - currentUserId: string - ログイン中ユーザーID
  - onSuccess: (event: CalendarEvent) => void - 送信成功時コールバック
  - onDelete: (id: string) => void - 削除成功時コールバック
  - onClose: () => void - 閉じる時コールバック
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import Dialog from '$lib/components/Dialog.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Input from '$lib/components/Input.svelte';
	import Textarea from '$lib/components/Textarea.svelte';
	import Button from '$lib/components/Button.svelte';
	import type { CalendarEvent } from '../types';

	let {
		open,
		mode,
		event = null,
		defaultDate,
		currentUserId,
		onSuccess,
		onDelete,
		onClose
	}: {
		open: boolean;
		mode: 'create' | 'edit';
		event?: CalendarEvent | null;
		defaultDate?: string;
		currentUserId: string;
		onSuccess: (event: CalendarEvent) => void;
		onDelete: (id: string) => void;
		onClose: () => void;
	} = $props();

	const isOwner = $derived(mode === 'create' || event?.createdByUserId === currentUserId);

	let title = $state(untrack(() => event?.title ?? ''));
	let description = $state(untrack(() => event?.description ?? ''));
	let date = $state(untrack(() => event?.date ?? defaultDate ?? ''));
	let titleError = $state('');
	let dateError = $state('');
	let errorMessage = $state('');
	let isLoading = $state(false);
	let deleteDialogOpen = $state(false);
	let deleteLoading = $state(false);
	let deleteError = $state('');

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

	async function handleDelete() {
		if (!event) return;
		deleteLoading = true;
		deleteError = '';
		try {
			const res = await fetch(`/calendar/events/${event.id}`, { method: 'DELETE' });
			if (!res.ok) {
				const err = (await res.json()) as { message?: string };
				deleteError = err.message ?? '削除に失敗しました';
				return;
			}
			deleteDialogOpen = false;
			onDelete(event.id);
		} catch {
			deleteError = '通信エラーが発生しました';
		} finally {
			deleteLoading = false;
		}
	}
</script>

<Dialog {open} {onClose} role="dialog" aria-label={mode === 'create' ? '予定を追加' : '予定を編集'}>
	{#if open}
		<div class="w-full max-w-md rounded-3xl bg-bg-card shadow-md">
			<div class="p-6">
				<h2 class="mb-6 text-lg font-medium text-label">
					{mode === 'create' ? '予定を追加' : '予定を編集'}
				</h2>

				{#if mode === 'edit' && !isOwner}
					<!-- 作成者以外は読み取り専用表示 -->
					<div class="flex flex-col gap-3">
						<div>
							<p class="text-xs text-secondary">タイトル</p>
							<p data-testid="calendar-event-view-title" class="text-sm text-label">
								{event?.title}
							</p>
						</div>
						<div>
							<p class="text-xs text-secondary">日付</p>
							<p class="text-sm text-label">{event?.date}</p>
						</div>
						{#if event?.description}
							<div>
								<p class="text-xs text-secondary">概要</p>
								<p class="text-sm whitespace-pre-wrap text-label">{event.description}</p>
							</div>
						{/if}
						<div>
							<p class="text-xs text-secondary">作成者</p>
							<p class="text-sm text-label">{event?.createdByName}</p>
						</div>
					</div>
					<div class="mt-6 flex justify-end">
						<Button variant="secondary" onclick={onClose} type="button">閉じる</Button>
					</div>
				{:else}
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
							<label
								for="calendar-event-description"
								class="mb-1 block text-sm font-medium text-label"
							>
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
							{#if mode === 'edit'}
								<Button
									data-testid="calendar-event-delete-button"
									variant="ghost-destructive"
									onclick={() => (deleteDialogOpen = true)}
									disabled={isLoading}
									type="button"
								>
									削除
								</Button>
							{:else}
								<span></span>
							{/if}
							<div class="flex gap-3">
								<Button variant="secondary" onclick={onClose} disabled={isLoading} type="button">
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
				{/if}
			</div>
		</div>
	{/if}
</Dialog>

<ConfirmDialog
	open={deleteDialogOpen}
	title="予定を削除しますか？"
	description={event ? `「${event.title}」を削除します。この操作は元に戻せません。` : ''}
	confirmLabel="削除する"
	confirmVariant="destructive"
	loading={deleteLoading}
	error={deleteError}
	data-testid="calendar-event-delete-dialog"
	confirmTestid="calendar-event-delete-confirm-button"
	onConfirm={() => void handleDelete()}
	onCancel={() => {
		deleteDialogOpen = false;
		deleteError = '';
	}}
/>
