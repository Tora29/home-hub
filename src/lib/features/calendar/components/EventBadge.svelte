<!--
  @file コンポーネント: EventBadge
  @module src/lib/features/calendar/components/EventBadge.svelte
  @feature calendar

  @description
  カレンダーグリッドの日付セル内に表示するイベントバッジ。
  作成者が自分の場合は青系、パートナーの場合は橙系で色分けする。

  @props
  - event: CalendarEvent - 表示対象のイベント
  - currentUserId: string - ログイン中ユーザーID
  - onClick: () => void - タップ時コールバック
-->
<script lang="ts">
	import type { CalendarEvent } from '../types';

	let {
		event,
		currentUserId,
		onClick
	}: {
		event: CalendarEvent;
		currentUserId: string;
		onClick: () => void;
	} = $props();

	const isOwner = $derived(event.createdByUserId === currentUserId);
</script>

<button
	type="button"
	data-testid="calendar-event-badge"
	title={event.title}
	onclick={(e) => {
		e.stopPropagation();
		onClick();
	}}
	class="block w-full truncate rounded-lg px-1.5 py-0.5 text-left text-xs text-white {isOwner
		? 'bg-accent'
		: 'bg-warning'}"
>
	{event.title}
</button>
