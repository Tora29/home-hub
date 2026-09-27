# Svelte

Svelte 5（Runes モード）固有の実装規約。

---

## リアクティブ宣言（$state）

### 基本方針

プリミティブ値・オブジェクト・配列は `$state` で宣言する。

```typescript
let count = $state(0);
let user = $state<User | null>(null);
let items = $state<string[]>([]);
```

### Svelte リアクティブコレクション

`SvelteSet` / `SvelteMap` / `SvelteURL` などの Svelte 組み込みリアクティブコレクションは **`$state` でラップしない**。

```typescript
// ✅ 正しい
let selectedIds = new SvelteSet<string>();

// ❌ 誤り（ESLint: svelte/no-unnecessary-state-wrap）
let selectedIds = $state(new SvelteSet<string>());
```

### 再代入禁止

`SvelteSet` / `SvelteMap` を **変数ごと再代入しない**。メソッドで操作する。

```typescript
// ✅ 正しい
selectedIds.add(id);
selectedIds.delete(id);
selectedIds.clear();

// ❌ 誤り（再代入すると reactivity が壊れる）
selectedIds = new SvelteSet();
selectedIds = new SvelteSet(selectedIds);
```

> **背景**: 再代入すると Svelte コンパイラが `$state` なしで更新されたと警告し、UI が更新されない。`SvelteSet` はメソッド呼び出しで内部状態が自動的に reactivity を発火するため、再代入は不要。

---

## $bindable（双方向バインド）

コンポーネントが受け取る prop を親から `bind:` で双方向バインドさせたい場合に使う。
`Input` / `Textarea` / `Select` の `value` prop が典型例。

```typescript
// コンポーネント側
let { value = $bindable(''), ...rest }: Props = $props();
```

```svelte
<!-- 呼び出し側 -->
<Input bind:value={name} />
```

- `$bindable()` の引数はデフォルト値（親が `bind:` を使わない場合に適用）
- `$bindable` なしの prop に対して親から `bind:` を使うとコンパイルエラーになる
- 単独コンポーネントでは、フォームの `value` 以外に基本使わない。状態の所有権は親に置き、イベントで通知する設計を優先する
- 例外: 下記「パターン A」で親が状態を所有し、子がフォームフィールドを描画するだけの場合は `bind:exerciseId` 等に使ってよい

---

## コンポーネント分割時の状態所有パターン

ページコンポーネントが肥大化した場合にサブコンポーネントへ分割する際、状態をどちらが持つかは
「親・兄弟コンポーネントが入力途中の値を参照する必要があるか」で判断する。

### パターン A: 親がすべての状態を所有（迷ったらこちらを優先）

親（コンテナ）が `$state` とハンドラを持ち、子は `$bindable`（フォームフィールド）・素の `props`（読み取り専用データ）・
`onXxx` コールバック props（アクション通知）で受け取る。兄弟コンポーネント間で状態を共有する必要がある場合
（例: 選択中の種目 ID をフォームとグラフの両方が参照する）に使う。

```svelte
<!-- 親: WorkoutPage.svelte -->
<RecordForm bind:exerciseId={formExerciseId} {bestRecord} onSubmit={() => void handleAddRecord()} />
<WeightChartSection bind:exerciseId={chartExerciseId} data={chartData} />
```

複数の子で共有する描画フラグメントは `Snippet` として親から渡す。

```svelte
{#snippet exerciseOptions()}
	...
{/snippet}
<RecordForm {exerciseOptions} />
<RecordList {exerciseOptions} />
```

### パターン B: 子が状態を自己完結

子（フォーム・モーダル本体）が入力途中の状態を自身の `$state` で持ち、親には成功・削除などの最終結果のみ
`onSuccess` / `onDelete` コールバックで通知する。親・兄弟が入力途中の値を参照する必要がないモーダルフォーム等に使う。

```svelte
<!-- 親: ExpenseFormDialog.svelte -->
<Dialog {open} {onClose} aria-label="支出を登録">
	{#if open}
		<ExpenseForm {mode} {expense} {onSuccess} onCancel={onClose} />
	{/if}
</Dialog>
```

- `{#if open}` の中でマウントする: `open` が `false` になるとコンポーネントが破棄され、再度 `true` になると
  新しいインスタンスとしてマウントされる（前回の内部状態は引き継がれない）ため、入力値の残留を防げる
  （`key` ブロックによる強制再マウントハックは不要）

---

## $derived / $effect

- `$derived`: 他の state / props から計算できる値（getter の代替）。複数行の計算は `$derived.by(() => ...)`
- 書き込み可能な `$derived`（Svelte 5.25+）: props 由来の値を CSR で一時的に上書きしたい場合に使う（→ `csr-patterns.md`「SSR 初期値との整合」）
- `$effect`: 副作用（DOM 操作・外部 API 呼び出し・タイマー等）。**state の同期（A が変わったら B に代入）には使わない** → `$derived` で書く
- `$effect` 内で登録したタイマー・リスナーはクリーンアップ関数を return して解除する（内部で追加に張った `setTimeout` も含む）
- `$derived.by` 内の一時集計（計算後に捨てる `Map` / `Set`）は plain `Map` を使う。
  `svelte/prefer-svelte-reactivity` が反応するため `// eslint-disable-next-line svelte/prefer-svelte-reactivity` で意図を残す
- モジュール間で共有する状態は `*.svelte.ts` の `$state` で持つ（`svelte/store` の `writable` は新規に使わない）

```typescript
let total = $derived(items.reduce((sum, item) => sum + item.price, 0));

$effect(() => {
	const id = setInterval(tick, 1000);
	return () => clearInterval(id);
});
```

---

## {@html} 禁止

XSS リスクのため `{@html}` は使用しない（→ `security.md` 参照）。

---

## a11y linter の既知の制限

### モーダル

モーダルは `src/lib/components/Dialog.svelte`（ネイティブ `<dialog>` + `showModal()`）を使う（→ `ui-components.md`）。
`role="dialog"` の div に `tabindex="-1"` を付ける自前実装はしない（フォーカス管理が不完全になるため）。

### ドロップダウンメニューの role

`role="menu"` / `menuitem` は WAI-ARIA 上「矢印キーで項目移動・Escape で閉じる・開いたら先頭項目へフォーカス」の
キーボード操作実装が前提。これを実装しない場合は `role="menu"` を付けず、ボタン + `aria-expanded` の
**disclosure パターン**（中身は普通の `<button>` の並び）にする。

外側クリック判定のために `onclick={(e) => e.stopPropagation()}` だけを付けたい場合、linter 回避目的で
`tabindex={0}` を足さない（意味のないタブ停止点が増える）。`svelte-ignore` で抑制し意図を残す。

```svelte
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<!-- 外側クリックで閉じる判定から除外するためだけの stopPropagation（操作要素は内部の button） -->
<div onclick={(e) => e.stopPropagation()}>
	<button type="button" onclick={onEdit}>編集</button>
	<button type="button" onclick={onDelete}>削除</button>
</div>
```

> 実装例: `ExpenseItem.svelte`（ボタンに `aria-expanded` / `aria-controls`、Escape は `ExpensesPage.svelte` の `svelte:window` で閉じる）。

---

## なぜ必要か

- `$state` / `SvelteSet` の誤用による reactivity バグを防ぐ
- ESLint ルール（`svelte/no-unnecessary-state-wrap`）との整合性を保つ
