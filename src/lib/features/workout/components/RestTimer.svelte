<!--
  @file コンポーネント: RestTimer
  @module src/lib/features/workout/components/RestTimer.svelte
  @feature workout

  @description
  セット間インターバル（90秒固定）を計測するフローティングタイマー。
  画面右下に常時固定表示され、タップで開始・再タップで90秒にリセットして再スタートする。
  終了時は視覚的な変化（チェックマーク表示）のみで通知し、音・バイブレーションは使わない。
  状態は自己完結（親・兄弟コンポーネントとの共有なし）。
-->
<script lang="ts">
	import { Timer, Check } from '@lucide/svelte';

	const DURATION_SECONDS = 90;
	const TICK_INTERVAL_MS = 250;

	let remaining = $state(0);
	let running = $state(false);
	let finished = $state(false);
	let endAt = 0;

	function start() {
		endAt = Date.now() + DURATION_SECONDS * 1000;
		remaining = DURATION_SECONDS;
		finished = false;
		running = true;
	}

	$effect(() => {
		if (!running) return;
		const id = setInterval(() => {
			const left = Math.ceil((endAt - Date.now()) / 1000);
			if (left <= 0) {
				remaining = 0;
				running = false;
				finished = true;
				setTimeout(() => (finished = false), 800);
			} else {
				remaining = left;
			}
		}, TICK_INTERVAL_MS);
		return () => clearInterval(id);
	});
</script>

<button
	type="button"
	onclick={start}
	class="fixed right-4 bottom-4 z-40 flex h-16 w-16 flex-col items-center justify-center rounded-full shadow-lg transition-colors {finished
		? 'bg-success text-white'
		: 'bg-accent text-white hover:opacity-90'}"
	aria-label="90秒インターバルタイマー"
>
	{#if finished}
		<Check size={28} />
	{:else if running}
		<span class="text-xl font-medium">{remaining}</span>
	{:else}
		<Timer size={20} />
		<span class="text-xs">{DURATION_SECONDS}s</span>
	{/if}
</button>
