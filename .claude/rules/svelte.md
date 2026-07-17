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
- フォームの `value` 以外では基本使わない。状態の所有権は親に置き、イベントで通知する設計を優先する

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
<!-- 親: EventModal.svelte -->
{#if open}
	<EventForm {mode} {event} onSuccess={(event) => handleSuccess(event)} {onClose} />
{/if}
```

- `{#if open}` の中でマウントする: `open` が `false` になるとコンポーネントが破棄され、再度 `true` になると
  新しいインスタンスとしてマウントされる（前回の内部状態は引き継がれない）ため、入力値の残留を防げる
  （`key` ブロックによる強制再マウントハックは不要）

---

## $derived / $effect

- `$derived`: 他の state から計算できる値（getter の代替）
- `$effect`: 副作用（DOM 操作・外部 API 呼び出し等）。**乱用しない**

```typescript
let total = $derived(items.reduce((sum, item) => sum + item.price, 0));
```

---

## {@html} 禁止

XSS リスクのため `{@html}` は使用しない（→ `security.md` 参照）。

---

## a11y linter の既知の制限

### `dialog` / `alertdialog` ロールと `tabindex="-1"`

Svelte の linter は `dialog` / `alertdialog` ロールを non-interactive と判定するため、`tabindex="-1"` に `a11y_no_noninteractive_tabindex` 警告が出る。
しかし `tabindex="-1"` はモーダルへのプログラマティックフォーカス（`element.focus()`）に必要な正しいパターンであるため、`svelte-ignore` で抑制し意図をコメントで残す。

```svelte
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- dialog/alertdialog ロールは Svelte linter が non-interactive と判定するが、tabindex="-1" はフォーカス管理に必要な正しいパターン -->
<div role="dialog" aria-modal="true" tabindex={-1}>
```

### `role="menu"` を持つ `<div>` の `onclick`

`<div role="menu">` に `onclick` を付ける場合、対応する `onkeydown` と `tabindex={0}` が必要。

```svelte
<div
  role="menu"
  tabindex={0}
  onclick={(e) => e.stopPropagation()}
  onkeydown={(e) => e.stopPropagation()}
>
```

---

## なぜ必要か

- `$state` / `SvelteSet` の誤用による reactivity バグを防ぐ
- ESLint ルール（`svelte/no-unnecessary-state-wrap`）との整合性を保つ
