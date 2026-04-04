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

- scaffold-fe スキルがコンポーネントを生成する際の規約
- `$state` / `SvelteSet` の誤用による reactivity バグを防ぐ
- ESLint ルール（`svelte/no-unnecessary-state-wrap`）との整合性を保つ

## 参照するスキル

- scaffold-fe, scaffold-test-unit, scaffold-test-e2e
