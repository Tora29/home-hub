# data-testid

テスト用セレクタの規約。**ルールはこのファイルが唯一の定義元。testid 値の一覧は各機能の `spec.md` が定義元**。

---

## セレクタ戦略

- 属性名は **`data-testid`** を使用する（`data-cy` / `data-test` は使わない）
- CSS クラスや `id` をテストセレクタに使わない（リファクタリングで壊れやすいため）
- スタイリング目的で `data-testid` を使わない

### テスト種別ごとのセレクタ優先順位

**ユニット・コンポーネントテスト（Vitest）**

```
getByRole     ← 最優先（アクセシビリティも同時に検証できる）
getByLabelText
getByText
getByTestId   ← 最終手段（上記で一意に特定できない場合のみ）
```

**E2E テスト（Playwright）**

```
getByTestId   ← 推奨（複雑なフローの安定したアンカー）
getByRole
getByText
```

### `data-testid` をプロダクションコードに追加するタイミング

- **追加してよい**: E2E テストで必要、またはユニットテストで role/text で一意に特定できない要素
- **追加しない**: ユニットテスト専用目的（role/text で代替できる場合）

---

## 命名規則

### フォーマット

```
{feature}-{element}
{feature}-{entity}-{action}-{element}   # 複数アクションがある場合
```

- ケバブケース（kebab-case）を使用する
- `{feature}` は `src/routes/{feature}/` のディレクトリ名と一致させる
- 冗長にしすぎない。`task-list-container-wrapper` ではなく `task-list`

### 要素種別サフィックス

| サフィックス | 対象要素                         | 例                                         |
| ------------ | -------------------------------- | ------------------------------------------ |
| `-list`      | `<ul>` / `<ol>` / リストコンテナ | `task-list`                                |
| `-item`      | リストの各行                     | `task-item`                                |
| `-form`      | `<form>`                         | `task-create-form`                         |
| `-input`     | `<input>` / `<textarea>`         | `task-name-input`                          |
| `-select`    | `<select>`                       | `task-category-select`                     |
| `-button`    | `<button>`                       | `task-create-button`, `task-delete-button` |
| `-dialog`    | モーダル・ダイアログ             | `task-delete-dialog`                       |
| `-error`     | フィールドエラーメッセージ       | `task-name-error`                          |
| `-empty`     | 空状態（0件表示）                | `task-empty`                               |
| `-loading`   | ローディング表示                 | `task-loading`                             |

---

## 動的要素の選択

### 匿名リスト（テキストや順序で区別する場合）

リストアイテムは `data-testid="task-item"` を全行に付与し、Playwright 側で絞り込む。

```svelte
<!-- +page.svelte -->
{#each tasks as task}
	<li data-testid="task-item">
		<span data-testid="task-item-name">{task.name}</span>
		<button data-testid="task-delete-button">削除</button>
	</li>
{/each}
```

```typescript
// e2e/task.e2e.ts
// 特定テキストの行を選択
const row = page.getByTestId('task-item').filter({ hasText: '買い物' });
await row.getByTestId('task-delete-button').click();

// インデックスで選択
await page.getByTestId('task-item').nth(0).click();
```

### 名前付きアイテム（ID で区別する場合）

要素数が少なく ID が静的に決まっている場合は `{feature}-{element}-{id}` を使ってよい。

```svelte
<!-- Sidebar.svelte -->
{#each NAV_CATEGORIES as category}
  <button data-testid="sidebar-category-{category.id}">
```

```typescript
// sidebar.e2e.ts
await page.getByTestId('sidebar-category-meal').click();
await page.getByTestId('sidebar-category-expense').click();
```

---

## 汎用UIコンポーネントでの data-testid

`Button.svelte` / `Input.svelte` / `Dialog.svelte` などの汎用コンポーネントは、**内部に `data-testid` を固定で持たない**。

同じコンポーネントを同一画面に複数配置した際に testid が重複するため。代わりに `{...restProps}` で親から伝搬させる。

```svelte
<!-- src/lib/components/Button.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		children,
		onclick,
		...restProps
	}: {
		children: Snippet;
		onclick?: () => void;
		[key: string]: unknown;
	} = $props();
</script>

<button {onclick} {...restProps}>
	{@render children()}
</button>
```

```svelte
<!-- 呼び出し側（機能コンポーネント） -->
<Button data-testid="expense-delete-button">削除</Button>
<Button data-testid="expense-edit-button">編集</Button>
```

- `data-testid` の命名責任は**親（機能側）**が持つ → `spec.md` の testid 定義と一致する
- 機能固有コンポーネント（`ExpenseFormDialog.svelte` 等）は内部要素に固有の testid を持ってよい

### 複合コンポーネント（sub-element に testid が必要な場合）

`ConfirmDialog` のように内部に複数のテスト対象要素を持つ場合、サブ要素には**名前付き prop** を使う。
メイン要素は `{...rest}` で透過し、サブ要素は `{element}Testid` という命名で明示する。

```svelte
<!-- ConfirmDialog.svelte -->
<script lang="ts">
	let {
		confirmTestid,
		...rest
	}: {
		confirmTestid?: string;
		[key: string]: unknown;
	} = $props();
</script>

<!-- メイン要素: {...rest} で data-testid を透過 -->
<div {...rest} class="...">
	<!-- サブ要素: 名前付き prop で受け取る -->
	<Button data-testid={confirmTestid}>確定</Button>
</div>
```

```svelte
<!-- 呼び出し側 -->
<ConfirmDialog data-testid="expense-delete-dialog" confirmTestid="expense-delete-confirm-button" />
```

---

## 維持ルール

- コンポーネント分割・リファクタリング後も `data-testid` の値を変えない
- セレクタを変更する場合は、対応するテストも同時に更新する
- 新機能追加時は **`specs/{feature}/spec.md` の `## data-testid` セクション**に追記してから実装する

---

## testid の定義場所

testid の一覧は機能ごとの `specs/{feature}/spec.md` が唯一の定義元。
scaffold-fe / scaffold-test-e2e スキルは `specs/{feature}/spec.md` の `## data-testid` セクションを参照してコードを生成する。

---

## なぜ必要か

- scaffold-fe スキルが UI にテスト用属性を付与する際の規約
- scaffold-test-unit / scaffold-test-e2e スキルがセレクタを選択する際の規約
- E2E テストの安定性を保つため（CSS クラス変更・DOM 構造変更の影響を受けない）
- ユニットテストで `getByRole` を優先することでアクセシビリティの問題を早期検出できる

## 参照するスキル

- scaffold-fe, scaffold-test-unit, scaffold-test-e2e, review-changes
