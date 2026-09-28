<!--
  @file コンポーネント: FormField テスト用ラッパー
  @module src/lib/components/FormField.test-wrapper.svelte

  @description
  Input / Textarea / Select の bind:value による双方向バインドを検証するためのテスト専用ラッパー。
  親側の値を output に表示し、ボタンで親側から値を書き換えられる。

  @props
  - kind: 'input' | 'textarea' | 'select' - 対象コンポーネント
  - initial: string - 初期値
  - next: string - 「親から更新」ボタンで設定する値
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import Input from './Input.svelte';
	import Textarea from './Textarea.svelte';
	import Select from './Select.svelte';

	let {
		kind,
		initial = '',
		next = ''
	}: { kind: 'input' | 'textarea' | 'select'; initial?: string; next?: string } = $props();

	let value = $state(untrack(() => initial));
</script>

{#if kind === 'input'}
	<Input bind:value aria-label="対象" />
{:else if kind === 'textarea'}
	<Textarea bind:value aria-label="対象" />
{:else}
	<Select bind:value aria-label="対象">
		<option value="food">食費</option>
		<option value="daily">日用品</option>
		<option value="rent">家賃</option>
	</Select>
{/if}
<output data-testid="parent-value">{value}</output>
<button type="button" onclick={() => (value = next)}>親から更新</button>
