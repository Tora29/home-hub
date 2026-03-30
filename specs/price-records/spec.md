# Feature: PriceRecord（食品価格記録）

## Overview

特定の食品がどのスーパーでいくらで売っていたかを記録・管理する機能。
スーパー・カテゴリ・品目名・金額・備考を登録し、品目名で検索・絞り込みができる。

スーパーとカテゴリのマスタ管理は同一feature内のサブページとして提供される（`/price-records/supermarkets`、`/price-records/categories`）。

## User Stories

- ユーザーとして、スーパーと品目・金額を記録したい。どのお店が安いか把握するため。
- ユーザーとして、品目名で過去の記録を絞り込みたい。特定食品の価格履歴を素早く確認するため。
- ユーザーとして、登録した記録を編集・削除したい。入力ミスや不要な記録を修正するため。
- ユーザーとして、スーパーを自由に追加・編集したい。よく行くお店に合わせた管理をするため。
- ユーザーとして、食品カテゴリを自由に追加・編集したい。ライフスタイルに合わせた分類をするため。

## API Endpoints

API 詳細は [openapi.yaml](./openapi.yaml) を参照。

> 型定義・スキーマ・ステータスコード・エラーレスポンスは openapi.yaml が Single Source of Truth。

| メソッド | パス                               | 説明                                                 |
| -------- | ---------------------------------- | ---------------------------------------------------- |
| GET      | `/price-records`                   | 価格記録一覧取得（品目名検索・ページネーション付き） |
| POST     | `/price-records`                   | 価格記録登録                                         |
| PUT      | `/price-records/[id]`              | 価格記録更新                                         |
| DELETE   | `/price-records/[id]`              | 価格記録削除                                         |
| GET      | `/price-records/supermarkets`      | スーパー一覧取得                                     |
| POST     | `/price-records/supermarkets`      | スーパー登録                                         |
| PUT      | `/price-records/supermarkets/[id]` | スーパー更新                                         |
| DELETE   | `/price-records/supermarkets/[id]` | スーパー削除                                         |
| GET      | `/price-records/categories`        | カテゴリ一覧取得                                     |
| POST     | `/price-records/categories`        | カテゴリ登録                                         |
| PUT      | `/price-records/categories/[id]`   | カテゴリ更新                                         |
| DELETE   | `/price-records/categories/[id]`   | カテゴリ削除                                         |

## Acceptance Criteria

### 正常系

- AC-001: `/price-records` にアクセスすると、登録済みの価格記録一覧が登録日時の新しい順で表示される
- AC-002: 検索ボックスに品目名を入力すると、品目名に部分一致する記録のみ表示される
- AC-003: 検索ボックスを空にすると、全件が表示される
- AC-004: スーパー・カテゴリ・品目名・金額を入力して「登録」ボタンを押すと 201 が返り、一覧の先頭に追加される（登録日時は自動セット）
- AC-005: 備考を入力して登録すると、備考も保存される
- AC-006: 備考を省略して登録できる
- AC-007: 編集ボタンをクリックすると編集フォームダイアログが開き、各フィールドに現在の値がセットされた状態で表示される
- AC-008: 編集フォームで内容を変更して送信すると 200 が返り、一覧の該当行が更新される
- AC-009: 削除ボタンをクリックし確認ダイアログで確定すると 204 が返り、一覧から消える
- AC-010: 削除確認ダイアログで「キャンセル」を押すと削除されず一覧は変わらない
- AC-011: `/price-records/supermarkets` でスーパーを追加すると、価格記録フォームのスーパー選択セレクトに反映される
- AC-012: スーパーを編集すると、一覧に表示されているスーパー名が更新される
- AC-013: スーパーに紐付く価格記録が 0 件の場合、スーパーを削除できる
- AC-014: `/price-records/categories` でカテゴリを追加すると、価格記録フォームのカテゴリ選択セレクトに反映される
- AC-015: カテゴリを編集すると、一覧に表示されているカテゴリ名が更新される
- AC-016: カテゴリに紐付く価格記録が 0 件の場合、カテゴリを削除できる

### 異常系

- AC-101: 品目名が未入力の場合、400 VALIDATION_ERROR「品目名は必須です」が返る
- AC-102: 金額が未入力の場合、400 VALIDATION_ERROR「金額は必須です」が返る
- AC-103: 金額が 0 以下の場合、400 VALIDATION_ERROR「1円以上の金額を入力してください」が返る
- AC-104: 金額が 9,999,999 を超える場合、400 VALIDATION_ERROR「9,999,999円以下の金額を入力してください」が返る
- AC-105: 金額が整数でない（小数・文字列）場合、400 VALIDATION_ERROR が返る
- AC-106: スーパー ID が未指定の場合、400 VALIDATION_ERROR「スーパーは必須です」が返る
- AC-107: カテゴリ ID が未指定の場合、400 VALIDATION_ERROR「カテゴリは必須です」が返る
- AC-108: 存在しない記録 ID に対して PUT/DELETE した場合、404 NOT_FOUND「該当データが見つかりません」が返る
- AC-109: フロント側で品目名が空のまま「登録」を押すと「品目名は必須です」とインライン表示される（サーバー非通信）
- AC-110: フロント側で金額が空のまま「登録」を押すと「金額は必須です」とインライン表示される（サーバー非通信）
- AC-111: フロント側でスーパーが未選択のまま「登録」を押すと「スーパーは必須です」とインライン表示される（サーバー非通信）
- AC-112: フロント側でカテゴリが未選択のまま「登録」を押すと「カテゴリは必須です」とインライン表示される（サーバー非通信）
- AC-113: スーパー名が空の場合、400 VALIDATION_ERROR「スーパー名は必須です」が返る
- AC-114: スーパー名が 51 文字以上の場合、400 VALIDATION_ERROR「50文字以内で入力してください」が返る
- AC-115: 存在しないスーパー ID に対して PUT/DELETE した場合、404 NOT_FOUND「該当データが見つかりません」が返る
- AC-116: スーパーに紐付く価格記録が 1 件以上ある場合、削除できず 409 CONFLICT「このスーパーは使用中のため削除できません」が返る
- AC-117: カテゴリ名が空の場合、400 VALIDATION_ERROR「カテゴリ名は必須です」が返る
- AC-118: カテゴリ名が 51 文字以上の場合、400 VALIDATION_ERROR「50文字以内で入力してください」が返る
- AC-119: 存在しないカテゴリ ID に対して PUT/DELETE した場合、404 NOT_FOUND「該当データが見つかりません」が返る
- AC-120: カテゴリに紐付く価格記録が 1 件以上ある場合、削除できず 409 CONFLICT「このカテゴリは使用中のため削除できません」が返る

### 境界値

- AC-201: 金額が 1 の場合、登録できる
- AC-202: 金額が 9,999,999 の場合、登録できる
- AC-203: 品目名が 100 文字の場合、登録できる
- AC-204: 品目名が 101 文字以上の場合、400 VALIDATION_ERROR「100文字以内で入力してください」が返る
- AC-205: 備考が 500 文字の場合、登録できる
- AC-206: 備考が 501 文字以上の場合、400 VALIDATION_ERROR「500文字以内で入力してください」が返る
- AC-207: 検索結果が 0 件の場合、空状態メッセージ（`price-records-empty`）が表示される
- AC-208: 記録が 0 件の場合、空状態メッセージ（`price-records-empty`）が表示される
- AC-209: スーパー名が 50 文字の場合、登録できる
- AC-210: カテゴリ名が 50 文字の場合、登録できる

## UI Requirements

### 一覧画面（`/price-records`）

#### 画面構成

- **検索ボックス** (`price-records-search-input`): 品目名で部分一致フィルタ。入力するたびに `?search=` クエリを更新してフィルタ
- **新規登録ボタン** (`price-records-create-button`): 右上。クリックで登録フォームダイアログを開く
- **価格記録一覧** (`price-records-list`): 各行にスーパー名・カテゴリ名・品目名・金額・備考（あれば）・登録日時・編集ボタン・削除ボタン
  - **編集ボタン** (`price-records-edit-button`): 全行に表示
  - **削除ボタン** (`price-records-delete-button`): 全行に表示
- **空状態** (`price-records-empty`): 記録が 0 件・検索結果 0 件の場合に表示

#### インタラクション

- 検索ボックス入力 → `?search=` クエリを URL に反映し `GET /price-records?search=` を再取得
- 新規登録ボタンクリック → 登録フォームダイアログを表示
- 編集ボタンクリック → 編集フォームダイアログを表示（現在の値を初期値にセット）
- 削除ボタンクリック → `price-records-delete-dialog` を表示し確定で `DELETE /price-records/[id]` を呼ぶ

#### バリデーション表示

- `price-records-item-name-error`: 品目名が不正な場合に表示
- `price-records-price-error`: 金額が不正な場合に表示
- `price-records-supermarket-error`: スーパーが未選択の場合に表示
- `price-records-category-error`: カテゴリが未選択の場合に表示

### 登録・編集フォーム（ダイアログ）

登録と編集で同じフォームコンポーネント（`PriceRecordForm`）を使い回す。

#### 画面構成

- スーパー選択セレクト（必須。`GET /price-records/supermarkets` から取得）
- カテゴリ選択セレクト（必須。`GET /price-records/categories` から取得）
- 品目名入力欄（テキスト・必須）
- 金額入力欄（数値・必須）
- 備考入力欄（テキストエリア・任意）
- 「登録」ボタン（新規時）/ 「更新」ボタン（編集時）（`price-records-submit-button`）
- 「キャンセル」ボタン

#### インタラクション

- 登録時: `POST /price-records` を呼ぶ（201 返却後、一覧に追加）
- 編集時: `PUT /price-records/[id]` を呼ぶ（200 返却後、一覧を更新）

### スーパー管理画面（`/price-records/supermarkets`）

#### 画面構成

- **スーパー一覧** (`price-records-supermarket-list`): 各行にスーパー名・編集ボタン・削除ボタン
- **追加フォーム**: スーパー名入力欄 + 追加ボタン（`price-records-supermarket-add-button`）

#### インタラクション

- 追加ボタンクリック → `POST /price-records/supermarkets` を呼び一覧を更新
- 編集ボタンクリック → インライン編集モードに切り替え、確定で `PUT /price-records/supermarkets/[id]` を呼ぶ
- 削除ボタンクリック → `price-records-supermarket-delete-dialog` を表示し確定で `DELETE /price-records/supermarkets/[id]` を呼ぶ

### カテゴリ管理画面（`/price-records/categories`）

#### 画面構成

- **カテゴリ一覧** (`price-records-category-list`): 各行にカテゴリ名・編集ボタン・削除ボタン
- **追加フォーム**: カテゴリ名入力欄 + 追加ボタン（`price-records-category-add-button`）

#### インタラクション

- 追加ボタンクリック → `POST /price-records/categories` を呼び一覧を更新
- 編集ボタンクリック → インライン編集モードに切り替え、確定で `PUT /price-records/categories/[id]` を呼ぶ
- 削除ボタンクリック → `price-records-category-delete-dialog` を表示し確定で `DELETE /price-records/categories/[id]` を呼ぶ

## data-testid

| testid                                            | 要素種別     | 説明                       |
| ------------------------------------------------- | ------------ | -------------------------- |
| `price-records-list`                              | `<ul>`       | 価格記録一覧               |
| `price-records-item`                              | `<li>`       | 価格記録行                 |
| `price-records-search-input`                      | `<input>`    | 品目名検索ボックス         |
| `price-records-create-button`                     | `<button>`   | 新規登録ボタン             |
| `price-records-edit-button`                       | `<button>`   | 編集ボタン                 |
| `price-records-delete-button`                     | `<button>`   | 削除ボタン                 |
| `price-records-delete-dialog`                     | `<dialog>`   | 削除確認ダイアログ         |
| `price-records-delete-confirm-button`             | `<button>`   | 削除確定ボタン             |
| `price-records-form`                              | `<form>`     | 登録・編集フォーム         |
| `price-records-supermarket-select`                | `<select>`   | スーパー選択セレクト       |
| `price-records-category-select`                   | `<select>`   | カテゴリ選択セレクト       |
| `price-records-item-name-input`                   | `<input>`    | 品目名入力欄               |
| `price-records-price-input`                       | `<input>`    | 金額入力欄                 |
| `price-records-notes-input`                       | `<textarea>` | 備考入力欄                 |
| `price-records-submit-button`                     | `<button>`   | 登録・更新確定ボタン       |
| `price-records-item-name-error`                   | `<p>`        | 品目名エラーメッセージ     |
| `price-records-price-error`                       | `<p>`        | 金額エラーメッセージ       |
| `price-records-supermarket-error`                 | `<p>`        | スーパーエラーメッセージ   |
| `price-records-category-error`                    | `<p>`        | カテゴリエラーメッセージ   |
| `price-records-notes-error`                       | `<p>`        | 備考エラーメッセージ       |
| `price-records-empty`                             | `<p>`        | 空状態メッセージ           |
| `price-records-supermarket-list`                  | `<ul>`       | スーパー一覧               |
| `price-records-supermarket-item`                  | `<li>`       | スーパー行                 |
| `price-records-supermarket-name-input`            | `<input>`    | スーパー名入力欄           |
| `price-records-supermarket-add-button`            | `<button>`   | スーパー追加ボタン         |
| `price-records-supermarket-edit-button`           | `<button>`   | スーパー編集ボタン         |
| `price-records-supermarket-delete-button`         | `<button>`   | スーパー削除ボタン         |
| `price-records-supermarket-delete-dialog`         | `<dialog>`   | スーパー削除確認ダイアログ |
| `price-records-supermarket-delete-confirm-button` | `<button>`   | スーパー削除確定ボタン     |
| `price-records-supermarket-name-error`            | `<p>`        | スーパー名エラーメッセージ |
| `price-records-category-list`                     | `<ul>`       | カテゴリ一覧               |
| `price-records-category-item`                     | `<li>`       | カテゴリ行                 |
| `price-records-category-name-input`               | `<input>`    | カテゴリ名入力欄           |
| `price-records-category-add-button`               | `<button>`   | カテゴリ追加ボタン         |
| `price-records-category-edit-button`              | `<button>`   | カテゴリ編集ボタン         |
| `price-records-category-delete-button`            | `<button>`   | カテゴリ削除ボタン         |
| `price-records-category-delete-dialog`            | `<dialog>`   | カテゴリ削除確認ダイアログ |
| `price-records-category-delete-confirm-button`    | `<button>`   | カテゴリ削除確定ボタン     |
| `price-records-category-name-error`               | `<p>`        | カテゴリ名エラーメッセージ |

## テスト戦略

| AC          | 種別        | 対象ファイル                                                                         | 備考                                                    |
| ----------- | ----------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| AC-001〜003 | Integration | `page.server.integration.test.ts`                                                    | load 関数の検索フィルタ動作を実 D1 で検証               |
| AC-004〜010 | Integration | `service.integration.test.ts`                                                        | 価格記録 CRUD を実 D1 で検証                            |
| AC-101〜107 | Unit        | `schema.test.ts`, `server.test.ts`                                                   | Zod バリデーション・API ハンドラの 400 レスポンスを検証 |
| AC-108      | Unit        | `[id]/server.test.ts`                                                                | PUT/DELETE の 404 レスポンスを検証                      |
| AC-109〜112 | Unit        | `components/PriceRecordForm.svelte.test.ts`                                          | フォームの FE インラインバリデーション表示を検証        |
| AC-201〜206 | Unit        | `schema.test.ts`                                                                     | Zod 境界値検証                                          |
| AC-207〜208 | E2E         | `e2e/price-records.e2e.ts`                                                           | 空状態表示はブラウザ全体が必要                          |
| AC-011〜016 | Integration | `supermarkets/service.integration.test.ts`, `categories/service.integration.test.ts` | マスタ CRUD を実 D1 で検証                              |
| AC-113〜115 | Unit        | `supermarkets/schema.test.ts`, `supermarkets/server.test.ts`                         | スーパーのバリデーション・400 を検証                    |
| AC-116      | Unit        | `supermarkets/[id]/server.test.ts`                                                   | スーパーの 404・409 を検証                              |
| AC-117〜119 | Unit        | `categories/schema.test.ts`, `categories/server.test.ts`                             | カテゴリのバリデーション・400 を検証                    |
| AC-120      | Unit        | `categories/[id]/server.test.ts`                                                     | カテゴリの 404・409 を検証                              |
| AC-209〜210 | Unit        | `supermarkets/schema.test.ts`, `categories/schema.test.ts`                           | Zod 境界値検証                                          |

## Non-Functional Requirements

### Performance

- 価格記録一覧はページネーション対応（デフォルト 20 件）
- 検索フィルタは SQLite の LIKE 演算子で実装

### Security

- `hooks.server.ts` の認証ガードにより全エンドポイント認証済み
- `userId` でデータを絞り込み、他ユーザーの記録は 404 として扱う（存在を露出しない）
- `{@html}` は不使用

### Accessibility

- フォームの各入力要素に `<label>` を関連付ける
- 削除確認ダイアログに `role="alertdialog"` を付与する
