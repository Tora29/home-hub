<!--
  @file コンポーネント: BodyWeightSection テスト用ラッパー
  @module src/lib/features/workout/components/BodyWeightSection.test-wrapper.svelte
  @feature workout

  @description
  BodyWeightSection の bindable props（日付・体重入力値）を親側 state で保持し、
  onSubmit 時点の親側の値を検証するためのテスト専用ラッパー。

  @props
  - todayBodyWeight: number | null - 本日記録済みの体重
  - error: string - エラーメッセージ
  - loading: boolean - 送信中フラグ
  - onSubmit: (value: { date: string; input: string }) => void - 送信時の親側の値を受け取るコールバック
-->
<script lang="ts">
	import BodyWeightSection from './BodyWeightSection.svelte';

	let {
		todayBodyWeight = null,
		error = '',
		loading = false,
		onSubmit = () => {}
	}: {
		todayBodyWeight?: number | null;
		error?: string;
		loading?: boolean;
		onSubmit?: (value: { date: string; input: string }) => void;
	} = $props();

	let date = $state('2026-09-27');
	let input = $state<number | null>(null);
</script>

<BodyWeightSection
	{todayBodyWeight}
	today="2026-09-27"
	bind:date
	bind:input
	{error}
	{loading}
	onSubmit={() => onSubmit({ date, input: String(input) })}
/>
