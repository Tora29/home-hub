<!--
  @file コンポーネント: CalendarPage
  @module src/lib/features/calendar/components/CalendarPage.svelte
  @feature calendar

  @description
  カレンダー画面のUIロジック全体を担うコンポーネント。
  月ナビゲーション・イベント作成/編集モーダルの開閉を制御する。

  @props
  - data: { events: CalendarEvent[], currentMonth: string, selectedMonth: string, currentUserId: string }
-->
<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Calendar, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import Button from '$lib/components/Button.svelte';
	import CalendarGrid from './CalendarGrid.svelte';
	import EventModal from './EventModal.svelte';
	import type { CalendarEvent } from '../types';
	import { formatYearMonth } from '$lib/utils/date';

	let {
		data
	}: {
		data: {
			events: CalendarEvent[];
			currentMonth: string;
			selectedMonth: string;
			currentUserId: string;
		};
	} = $props();

	let modalOpen = $state(false);
	let modalMode = $state<'create' | 'edit'>('create');
	let selectedDate = $state<string | undefined>(undefined);
	let selectedEvent = $state<CalendarEvent | null>(null);

	const monthLabel = $derived.by(() => {
		const [y, m] = data.selectedMonth.split('-');
		return `${y}年${Number(m)}月`;
	});

	function openCreateModal(date: string) {
		modalMode = 'create';
		selectedDate = date;
		selectedEvent = null;
		modalOpen = true;
	}

	function openEditModal(event: CalendarEvent) {
		modalMode = 'edit';
		selectedEvent = event;
		selectedDate = undefined;
		modalOpen = true;
	}

	function closeModal() {
		modalOpen = false;
	}

	async function handleModalChange() {
		modalOpen = false;
		await invalidateAll();
	}

	async function navigateMonth(delta: number) {
		const [y, m] = data.selectedMonth.split('-').map(Number);
		const d = new Date(y, m - 1 + delta, 1);
		await goto(`/calendar?month=${formatYearMonth(d)}`, { keepFocus: true, replaceState: true });
	}

	async function goToday() {
		await goto(`/calendar?month=${data.currentMonth}`, { keepFocus: true, replaceState: true });
	}
</script>

<div class="mx-auto max-w-4xl">
	<div class="mb-4 flex items-center gap-3">
		<Calendar size={24} class="text-accent" />
		<h1 class="flex-1 text-2xl font-medium text-label">カレンダー</h1>
	</div>

	<div class="mb-4 flex items-center justify-between gap-2">
		<div class="flex items-center gap-1">
			<Button
				data-testid="calendar-prev-month-button"
				variant="secondary"
				size="sm"
				onclick={() => void navigateMonth(-1)}
				aria-label="前月"
				type="button"
			>
				<ChevronLeft size={16} />
			</Button>
			<span
				data-testid="calendar-month-label"
				class="min-w-24 text-center text-sm font-medium text-label"
			>
				{monthLabel}
			</span>
			<Button
				data-testid="calendar-next-month-button"
				variant="secondary"
				size="sm"
				onclick={() => void navigateMonth(1)}
				aria-label="翌月"
				type="button"
			>
				<ChevronRight size={16} />
			</Button>
		</div>
		<Button
			data-testid="calendar-today-button"
			variant="secondary"
			size="sm"
			onclick={() => void goToday()}
			type="button"
		>
			今日
		</Button>
	</div>

	<CalendarGrid
		month={data.selectedMonth}
		events={data.events}
		currentUserId={data.currentUserId}
		onDateClick={openCreateModal}
		onEventClick={openEditModal}
	/>
</div>

<EventModal
	open={modalOpen}
	mode={modalMode}
	event={selectedEvent}
	defaultDate={selectedDate}
	currentUserId={data.currentUserId}
	onSuccess={() => void handleModalChange()}
	onDelete={() => void handleModalChange()}
	onClose={closeModal}
/>
