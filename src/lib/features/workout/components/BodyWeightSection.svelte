<!--
  @file コンポーネント: BodyWeightSection
  @module src/lib/features/workout/components/BodyWeightSection.svelte
  @feature workout

  @description
  体重記録カード。当日分の記録が既にある場合はフォームを無効化し「記録済み」を表示する。
  状態（日付・入力値・エラー・ローディング）の所有権は親（WorkoutPage.svelte）が持ち、
  このコンポーネントは bindable props と onSubmit コールバックで連携する。

  @props
  - todayBodyWeight: number | null - 本日記録済みの体重（null = 未記録）
  - today: string - 本日の日付文字列（YYYY-MM-DD、無効化時の表示用）
  - date: string ($bindable) - 記録対象日
  - input: string ($bindable) - 体重入力値
  - error: string - エラーメッセージ
  - loading: boolean - 送信中フラグ
  - onSubmit: () => void - 記録ボタン押下時のコールバック
-->
<script lang="ts">
	import Input from '$lib/components/Input.svelte';
	import Button from '$lib/components/Button.svelte';

	let {
		todayBodyWeight,
		today,
		date = $bindable(),
		input = $bindable(),
		error,
		loading,
		onSubmit
	}: {
		todayBodyWeight: number | null;
		today: string;
		date: string;
		input: string;
		error: string;
		loading: boolean;
		onSubmit: () => void;
	} = $props();
</script>

<div class="rounded-3xl bg-bg-card p-5 shadow-md">
	<h2 class="mb-3 text-sm font-medium text-secondary">体重記録</h2>
	{#if todayBodyWeight !== null}
		<div class="flex items-center gap-2">
			<input
				data-testid="workout-body-weight-date"
				type="date"
				value={today}
				disabled
				class="cursor-not-allowed rounded-2xl border border-separator bg-bg px-3 py-2 text-sm text-secondary opacity-50"
			/>
			<div class="min-w-0 flex-1">
				<Input
					data-testid="workout-body-weight-input"
					type="number"
					value={String(todayBodyWeight)}
					disabled
					class="w-full"
				/>
			</div>
			<Button
				data-testid="workout-body-weight-submit-button"
				variant="secondary"
				size="md"
				disabled
				type="button"
			>
				記録済み
			</Button>
		</div>
	{:else}
		<div class="flex items-start gap-2">
			<input
				data-testid="workout-body-weight-date"
				type="date"
				bind:value={date}
				class="rounded-2xl border border-separator bg-bg px-3 py-2 text-sm text-label focus:ring-2 focus:ring-accent focus:outline-none"
			/>
			<div class="min-w-0 flex-1">
				<Input
					data-testid="workout-body-weight-input"
					type="number"
					step="0.1"
					min="0"
					max="300"
					bind:value={input}
					placeholder="体重 (kg)"
					class="w-full"
				/>
			</div>
			<Button
				data-testid="workout-body-weight-submit-button"
				variant="secondary"
				size="md"
				onclick={onSubmit}
				disabled={loading}
				type="button"
			>
				{loading ? '記録中...' : '記録'}
			</Button>
		</div>
		{#if error}
			<p role="alert" class="mt-2 text-xs text-destructive">{error}</p>
		{/if}
	{/if}
</div>
