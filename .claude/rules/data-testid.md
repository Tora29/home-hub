# data-testid

E2E テスト用セレクタの規約。

## セレクタ戦略

- 属性名: **`data-testid`**
- 優先順位: `data-testid` > role > テキスト

## 命名規則

- パターン: `{feature}-{element}-{type}`
- 動的要素: `{feature}-item-{id}`（例: `dish-item-42`）
- 編集モード区別: `{feature}-view` / `{feature}-edit-form`

## 命名テーブル（唯一の定義元）

| セレクタ | 要素 | 例 |
|---------|------|----|
| `{feature}-list` | 一覧コンテナ | `dish-list` |
| `{feature}-item-{id}` | リストアイテム | `dish-item-42` |
| `{feature}-create-button` | 新規作成ボタン | `dish-create-button` |
| `{feature}-edit-button-{id}` | 編集ボタン | `dish-edit-button-42` |
| `{feature}-delete-button-{id}` | 削除ボタン | `dish-delete-button-42` |
| `{feature}-create-form` | 作成フォーム | `dish-create-form` |
| `{feature}-edit-form` | 編集フォーム | `dish-edit-form` |
| `{feature}-{field}-input` | 入力フィールド | `dish-name-input` |
| `{feature}-submit-button` | フォーム送信ボタン | `dish-submit-button` |
| `{feature}-cancel-button` | キャンセルボタン | `dish-cancel-button` |

## 維持ルール

- コンポーネント分割・リファクタリング時もセレクタ値を変更しない
- セレクタを変更する場合は上記テーブルを必ず更新し、対応する E2E テストも修正する

## 参照するスキル

- scaffold-fe, scaffold-test-e2e, review-changes
