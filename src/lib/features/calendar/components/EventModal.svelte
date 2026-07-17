<!--
  @file コンポーネント: EventModal
  @module src/lib/features/calendar/components/EventModal.svelte
  @feature calendar

  @description
  予定の作成・編集をモーダルダイアログで行うシェルコンポーネント。
  Dialog ラッパー・open/onClose 制御・作成者以外向けの読み取り専用表示・
  削除確認 ConfirmDialog を担当する。
  フォーム本体（title/description/date の状態管理）は EventForm に委譲し、
  {#if open} の中で子コンポーネントとしてマウントする。
  これにより open が true になるたびに EventForm が新規インスタンス化され、
  前回入力値が残留しない（旧実装の modalSessionId 強制再マウントハックは不要）。

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
	import Dialog from '$lib/components/Dialog.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Button from '$lib/components/Button.svelte';
	import EventForm from './EventForm.svelte';
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

	let deleteDialogOpen = $state(false);
	let deleteLoading = $state(false);
	let deleteError = $state('');

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
					<EventForm
						{mode}
						{event}
						{defaultDate}
						{onSuccess}
						onCancel={onClose}
						onDeleteClick={mode === 'edit' ? () => (deleteDialogOpen = true) : undefined}
					/>
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
