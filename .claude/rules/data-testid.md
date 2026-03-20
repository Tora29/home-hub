# data-testid

E2E テスト（Playwright）用セレクタの規約。このファイルが **唯一の定義元**。

---

## セレクタ戦略

- 属性名は **`data-testid`** を使用する（`data-cy` / `data-test` は使わない）
- Playwright のセレクタ優先順位: `data-testid` > `role` > テキスト
- `data-testid` は E2E テスト専用。ユニットテスト・スタイリングには使わない
- CSS クラスや `id` をテストセレクタに使わない（リファクタリングで壊れやすいため）

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

---

## 維持ルール

- コンポーネント分割・リファクタリング後も `data-testid` の値を変えない
- セレクタを変更する場合は、対応する E2E テストも同時に更新する
- 新機能追加時は以下の命名テーブルに追記してから実装する

---

## 命名テーブル

新機能を追加する際は必ずここに追記する。scaffold-fe / scaffold-test-e2e スキルはこのテーブルを参照してコードを生成する。

| feature    | testid | 要素種別 | 説明                 |
| ---------- | ------ | -------- | -------------------- |
| （未定義） | —      | —        | 機能追加時に記載する |

---

## なぜ必要か

- scaffold-fe スキルが UI にテスト用属性を付与する際の規約
- scaffold-test-e2e スキルがセレクタを使用する際の規約
- E2E テストの安定性を保つため（CSS クラス変更・DOM 構造変更の影響を受けない）

## 参照するスキル

- scaffold-fe, scaffold-test-e2e, review-changes
