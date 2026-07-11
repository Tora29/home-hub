<!--
  @file コンポーネント: CalendarGrid
  @module src/lib/features/calendar/components/CalendarGrid.svelte
  @feature calendar

  @description
  月ビューのカレンダーグリッド（7列 × 5〜6行）を表示する。
  日曜始まりで前月・翌月の端数日も含めて描画し、当日は日付番号を強調表示する。

  @props
  - month: string - 表示対象月 YYYY-MM
  - events: CalendarEvent[] - 表示対象のイベント一覧（月内の全件）
  - currentUserId: string - ログイン中ユーザーID
  - onDateClick: (date: string) => void - 日付セルタップ時コールバック
  - onEventClick: (event: CalendarEvent) => void - イベントバッジタップ時コールバック
-->
<script lang="ts">
	import Dialog from '$lib/components/Dialog.svelte';
	import Button from '$lib/components/Button.svelte';
	import EventBadge from './EventBadge.svelte';
	import type { CalendarDay, CalendarEvent } from '../types';

	let {
		month,
		events,
		currentUserId,
		onDateClick,
		onEventClick
	}: {
		month: string;
		events: CalendarEvent[];
		currentUserId: string;
		onDateClick: (date: string) => void;
		onEventClick: (event: CalendarEvent) => void;
	} = $props();

	const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
	const MAX_VISIBLE_EVENTS = 3;

	function formatDate(d: Date): string {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	function buildDays(targetMonth: string, targetEvents: CalendarEvent[]): CalendarDay[] {
		const [year, mon] = targetMonth.split('-').map(Number);
		const firstOfMonth = new Date(year, mon - 1, 1);
		const startOffset = firstOfMonth.getDay(); // 0=日曜
		const daysInMonth = new Date(year, mon, 0).getDate();
		const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
		const todayStr = formatDate(new Date());

		return Array.from({ length: totalCells }, (_, i) => {
			const dayOffset = i - startOffset + 1;
			const date = new Date(year, mon - 1, dayOffset);
			const dateStr = formatDate(date);
			return {
				date: dateStr,
				isCurrentMonth: dayOffset >= 1 && dayOffset <= daysInMonth,
				isToday: dateStr === todayStr,
				events: targetEvents.filter((e) => e.date === dateStr)
			};
		});
	}

	const days = $derived(buildDays(month, events));

	let expandedDate = $state<string | null>(null);
	const expandedDay = $derived(days.find((d) => d.date === expandedDate) ?? null);

	function openDayDetail(date: string) {
		expandedDate = date;
	}

	function closeDayDetail() {
		expandedDate = null;
	}
</script>

<div class="grid grid-cols-7 gap-1 text-center text-xs font-medium text-secondary">
	{#each WEEKDAYS as wd (wd)}
		<div class="py-1">{wd}</div>
	{/each}
</div>
<div class="grid grid-cols-7 gap-1">
	{#each days as day (day.date)}
		<div
			role="button"
			tabindex="0"
			data-testid="calendar-date-cell"
			data-date={day.date}
			aria-label={day.date}
			onclick={() => onDateClick(day.date)}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					onDateClick(day.date);
				}
			}}
			class="flex min-h-16 flex-col items-start gap-0.5 rounded-xl border border-separator p-1 text-left hover:bg-bg-secondary focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none md:min-h-24 {day.isCurrentMonth
				? ''
				: 'text-tertiary'}"
		>
			<span
				class="flex h-6 w-6 items-center justify-center rounded-full text-xs {day.isToday
					? 'bg-accent text-white'
					: ''}"
			>
				{Number(day.date.split('-')[2])}
			</span>
			<div class="flex w-full flex-col gap-0.5">
				{#each day.events.slice(0, MAX_VISIBLE_EVENTS) as event (event.id)}
					<EventBadge {event} {currentUserId} onClick={() => onEventClick(event)} />
				{/each}
				{#if day.events.length > MAX_VISIBLE_EVENTS}
					<button
						type="button"
						data-testid="calendar-date-more-button"
						class="text-xs text-secondary hover:text-label hover:underline"
						onclick={(e) => {
							e.stopPropagation();
							openDayDetail(day.date);
						}}
					>
						+{day.events.length - MAX_VISIBLE_EVENTS}件
					</button>
				{/if}
			</div>
		</div>
	{/each}
</div>

<Dialog
	open={expandedDate !== null}
	onClose={closeDayDetail}
	role="dialog"
	aria-label="{expandedDate ?? ''}の予定一覧"
>
	{#if expandedDate}
		<div class="w-full max-w-sm rounded-3xl bg-bg-card p-6 shadow-md">
			<h2 class="mb-4 text-base font-medium text-label">{expandedDate}の予定</h2>
			<ul data-testid="calendar-date-detail-list" class="flex flex-col gap-2">
				{#each expandedDay?.events ?? [] as event (event.id)}
					<li>
						<EventBadge
							{event}
							{currentUserId}
							onClick={() => {
								closeDayDetail();
								onEventClick(event);
							}}
						/>
					</li>
				{/each}
			</ul>
			<div class="mt-4 flex justify-end">
				<Button variant="secondary" onclick={closeDayDetail} type="button">閉じる</Button>
			</div>
		</div>
	{/if}
</Dialog>
