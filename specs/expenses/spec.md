# Feature: Expense（収支管理）

## Overview

同居人と共有する支出（食費・家賃など）を記録し、承認ステータスを管理する機能。
支出をカテゴリ・金額とともに登録し、同居人と口頭で確認した後「確認済み」ボタンを自分で押して記録する。
承認済みに間違えた場合は「未承認に戻す」で取り消しも可能。
全期間で未承認の支出が 1 件以上存在する場合、ダッシュボード（`/`）に警告バナーを表示する。

## User Stories

- ユーザーとして、支出の金額とカテゴリを登録したい。家計の支出を記録するため。
- ユーザーとして、登録した支出の金額・カテゴリを後から修正したい。入力ミスを直すため。
- ユーザーとして、月ごとの支出一覧と合計金額を確認したい。月の支出状況を把握するため。
- ユーザーとして、同居人の承認を得た支出を「確認済み」に更新したい。承認状況を正確に記録するため。
- ユーザーとして、誤って「確認済み」にした支出を「未承認」に戻したい。操作ミスを修正するため。
- ユーザーとして、未承認の支出がある場合にダッシュボードで通知を受けたい。支出を見落とさないため。
- ユーザーとして、支出カテゴリを自由に追加・編集したい。ライフスタイルに合わせた分類をするため。

## API Endpoints

API 詳細は [openapi.yaml](./openapi.yaml) を参照。

> 型定義・スキーマ・ステータスコード・エラーレスポンスは openapi.yaml が Single Source of Truth。

| メソッド | パス                        | 説明                                 |
| -------- | --------------------------- | ------------------------------------ |
| GET      | `/expenses`                 | 支出一覧取得（月フィルタ付き）       |
| POST     | `/expenses`                 | 支出登録                             |
| PUT      | `/expenses/[id]`            | 支出更新（金額・カテゴリ・承認状態） |
| DELETE   | `/expenses/[id]`            | 支出削除                             |
| GET      | `/expenses/categories`      | カテゴリ一覧取得                     |
| POST     | `/expenses/categories`      | カテゴリ登録                         |
| PUT      | `/expenses/categories/[id]` | カテゴリ更新                         |
| DELETE   | `/expenses/categories/[id]` | カテゴリ削除                         |

## Acceptance Criteria

### 正常系

- AC-001: `/expenses` にアクセスすると、当月の支出一覧が登録日時の新しい順で表示される
- AC-002: 月切り替えセレクトで別の月を選択すると、対象月の支出一覧が表示される
- AC-003: 金額とカテゴリを入力して「確定」ボタンを押すと 201 が返り、一覧の先頭に支出が追加される（登録日は自動セット）
- AC-004: 未承認の支出の「確認済み」ボタンを押すと 200 が返り、承認状態が「確認済み」に更新される
- AC-005: 確認済みの支出の「未承認に戻す」ボタンを押すと 200 が返り、承認状態が「未承認」に戻る
- AC-006: 支出の編集ボタンをクリックすると編集フォームダイアログが開き、金額・カテゴリを変更して送信すると 200 が返り一覧が更新される
- AC-007: 支出の削除ボタンをクリックし確認ダイアログで確定すると 204 が返り、一覧から消える
- AC-008: **全期間**の未承認支出が 1 件以上ある場合、ダッシュボード（`/`）に件数付きの警告バナーが表示される
- AC-009: 全支出が承認済みになる（または支出が 0 件になる）と、ダッシュボードの警告バナーが消える
- AC-010: `/expenses/categories` でカテゴリを追加すると、支出登録・編集フォームのカテゴリセレクトに反映される
- AC-011: カテゴリを編集すると、一覧に表示されているカテゴリ名が更新される
- AC-012: カテゴリに紐付く支出が 0 件の場合、カテゴリを削除できる
- AC-013: 一覧画面に選択中の月の支出合計金額（承認済み・未承認の全件）がカンマ区切りで表示される

### 異常系

- AC-101: 金額が未入力の場合、400 VALIDATION_ERROR「金額は必須です」が返る
- AC-102: 金額が 0 以下の場合、400 VALIDATION_ERROR「1円以上の金額を入力してください」が返る
- AC-103: 金額が 9,999,999 を超える場合、400 VALIDATION_ERROR「9,999,999円以下の金額を入力してください」が返る
- AC-104: 金額が整数でない（小数・文字列）場合、400 VALIDATION_ERROR が返る
- AC-105: カテゴリ ID が未指定の場合、400 VALIDATION_ERROR「カテゴリは必須です」が返る
- AC-106: 存在しない支出 ID に対して PUT/DELETE した場合、404 NOT_FOUND「該当データが見つかりません」が返る
- AC-107: カテゴリ名が空の場合、400 VALIDATION_ERROR「カテゴリ名は必須です」が返る
- AC-108: カテゴリ名が 51 文字以上の場合、400 VALIDATION_ERROR「50文字以内で入力してください」が返る
- AC-109: 存在しないカテゴリ ID に対して PUT/DELETE した場合、404 NOT_FOUND「該当データが見つかりません」が返る
- AC-110: カテゴリに紐付く支出が 1 件以上ある場合、カテゴリは削除できず 409 CONFLICT「このカテゴリは使用中のため削除できません」が返る
- AC-111: フロント側で金額が空のまま「確定」を押すと「金額は必須です」とインライン表示される（サーバー非通信）
- AC-112: フロント側でカテゴリが未選択のまま「確定」を押すと「カテゴリは必須です」とインライン表示される（サーバー非通信）

### 境界値

- AC-201: 金額が 1 の場合、登録できる
- AC-202: 金額が 9,999,999 の場合、登録できる
- AC-203: カテゴリ名が 50 文字の場合、登録できる
- AC-204: 支出が 0 件の場合、空状態メッセージ（`expense-empty`）が表示される
- AC-205: 支出が 0 件の場合、合計金額は「¥0」と表示される

## UI Requirements

### 一覧画面（`/expenses`）

#### 画面構成

- **月切り替えセレクト** (`expense-month-select`): 表示する月を選択。デフォルトは当月（`YYYY-MM` 形式）。選択肢は当月を含む過去 13 か月分
- **カテゴリ管理リンク**: カテゴリ管理ページ（`/expenses/categories`）へのリンク
- **支出登録ボタン** (`expense-create-button`): 右上。クリックで登録フォームダイアログを開く
- **月間合計** (`expense-total`): 対象月の支出合計金額（全件・承認状態問わず）をカンマ区切りで表示（例: `¥12,300`）
- **支出一覧** (`expense-list`): 各行に金額・カテゴリ名・登録日・承認状態バッジ・操作ボタン
  - **承認状態バッジ**: 「未承認」（赤系）/ 「確認済み」（緑系）
  - **確認済みボタン** (`expense-approve-button`): 未承認の行のみ表示
  - **未承認に戻すボタン** (`expense-unapprove-button`): 確認済みの行のみ表示
  - **編集ボタン** (`expense-edit-button`): 全行に表示
  - **削除ボタン** (`expense-delete-button`): 全行に表示
- **空状態** (`expense-empty`): 支出が 0 件のとき表示

#### インタラクション

- 月切り替え → `?month=YYYY-MM` を URL に反映し `GET /expenses?month=YYYY-MM` を再取得
- 登録ボタンクリック → 登録フォームダイアログを表示
- 編集ボタンクリック → 編集フォームダイアログを表示（現在の金額・カテゴリを初期値にセット）
- 「確認済み」ボタンクリック → `PUT /expenses/[id]` で `approved: true` に更新 → 一覧を更新
- 「未承認に戻す」ボタンクリック → `PUT /expenses/[id]` で `approved: false` に更新 → 一覧を更新
- 削除ボタンクリック → `expense-delete-dialog` を表示し確定で `DELETE /expenses/[id]` を呼ぶ

#### バリデーション表示

- `expense-amount-error`: 金額が不正な場合に表示
- `expense-category-error`: カテゴリ未選択の場合に表示

### 登録・編集フォーム（ダイアログ）

登録と編集で同じフォームコンポーネント（`ExpenseForm`）を使い回す。

#### 画面構成

- 金額入力欄（数値・必須）
- カテゴリ選択セレクト（必須。カテゴリ一覧から取得）
- 「確定」ボタン (`expense-submit-button`)
- 「キャンセル」ボタン

#### インタラクション

- 登録時: `POST /expenses` を呼ぶ（201 返却後、一覧に追加）
- 編集時: `PUT /expenses/[id]` を呼ぶ（200 返却後、一覧を更新）

### カテゴリ管理画面（`/expenses/categories`）

#### 画面構成

- **カテゴリ一覧** (`expense-category-list`): 各行にカテゴリ名・編集ボタン・削除ボタン
- **追加フォーム**: カテゴリ名入力欄 + 追加ボタン（`expense-category-add-button`）

#### インタラクション

- 追加ボタンクリック → `POST /expenses/categories` を呼び一覧を更新
- 編集ボタンクリック → インライン編集モードに切り替え、確定で `PUT /expenses/categories/[id]` を呼ぶ
- 削除ボタンクリック → `expense-category-delete-dialog` を表示し確定で `DELETE /expenses/categories/[id]` を呼ぶ

### ダッシュボード警告バナー（`/`）

- **全期間**の未承認支出が 1 件以上ある場合、`expense-pending-alert` バナーを表示
- バナーのテキスト例: `「未確認の支出が X 件あります」`（`/expenses` へのリンク付き）
- ダッシュボードの SSR load 関数で全期間の未承認件数を取得して表示判定する

## data-testid

| testid                                   | 要素種別   | 説明                                 |
| ---------------------------------------- | ---------- | ------------------------------------ |
| `expense-list`                           | `<ul>`     | 支出一覧                             |
| `expense-item`                           | `<li>`     | 支出行                               |
| `expense-create-button`                  | `<button>` | 支出登録ボタン                       |
| `expense-edit-button`                    | `<button>` | 支出編集ボタン                       |
| `expense-form`                           | `<form>`   | 登録・編集フォーム                   |
| `expense-amount-input`                   | `<input>`  | 金額入力欄                           |
| `expense-category-select`                | `<select>` | カテゴリ選択セレクト                 |
| `expense-submit-button`                  | `<button>` | 確定ボタン                           |
| `expense-amount-error`                   | `<p>`      | 金額エラーメッセージ                 |
| `expense-category-error`                 | `<p>`      | カテゴリエラーメッセージ             |
| `expense-approve-button`                 | `<button>` | 確認済みボタン（未承認行のみ）       |
| `expense-unapprove-button`               | `<button>` | 未承認に戻すボタン（承認済み行のみ） |
| `expense-delete-button`                  | `<button>` | 支出削除ボタン                       |
| `expense-delete-dialog`                  | `<dialog>` | 支出削除確認ダイアログ               |
| `expense-delete-confirm-button`          | `<button>` | 支出削除の確定ボタン                 |
| `expense-empty`                          | `<p>`      | 空状態メッセージ                     |
| `expense-month-select`                   | `<select>` | 月切り替えセレクト                   |
| `expense-total`                          | `<p>`      | 月間合計金額表示                     |
| `expense-pending-alert`                  | `<div>`    | ダッシュボードの未承認警告バナー     |
| `expense-category-list`                  | `<ul>`     | カテゴリ一覧                         |
| `expense-category-item`                  | `<li>`     | カテゴリ行                           |
| `expense-category-name-input`            | `<input>`  | カテゴリ名入力欄                     |
| `expense-category-add-button`            | `<button>` | カテゴリ追加ボタン                   |
| `expense-category-edit-button`           | `<button>` | カテゴリ編集ボタン                   |
| `expense-category-delete-button`         | `<button>` | カテゴリ削除ボタン                   |
| `expense-category-delete-dialog`         | `<dialog>` | カテゴリ削除確認ダイアログ           |
| `expense-category-delete-confirm-button` | `<button>` | カテゴリ削除の確定ボタン             |
| `expense-category-name-error`            | `<p>`      | カテゴリ名エラーメッセージ           |

## テスト戦略

| AC             | 種別        | 対象ファイル                                              | 備考                                                        |
| -------------- | ----------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| AC-001〜002    | Integration | `page.server.integration.test.ts`                         | load 関数の月フィルタ動作を実 D1 で検証                     |
| AC-001〜007    | Integration | `service.integration.test.ts`                             | 支出 CRUD・承認操作を実 D1 で検証                           |
| AC-008〜009    | Integration | `page.server.integration.test.ts`（`/` 側）               | 全期間の未承認件数取得を実 D1 で検証                        |
| AC-010〜012    | Integration | `categories/service.integration.test.ts`                  | カテゴリ CRUD を実 D1 で検証                                |
| AC-013         | Integration | `service.integration.test.ts`                             | 月間合計算出（全件）を実 D1 で検証                          |
| AC-101〜109    | Unit        | `schema.test.ts`, `categories/schema.test.ts`             | Zod バリデーション検証                                      |
| AC-101〜109    | Unit        | `+server.test.ts`, `categories/+server.test.ts`           | API ハンドラが VALIDATION_ERROR 形式の 400 を返すことを検証 |
| AC-106, AC-109 | Unit        | `[id]/+server.test.ts`, `categories/[id]/+server.test.ts` | NOT_FOUND 形式の 404 を検証                                 |
| AC-110         | Unit        | `categories/[id]/+server.test.ts`                         | CONFLICT 形式の 409 を検証                                  |
| AC-111〜112    | Unit        | `page.svelte.test.ts`                                     | フロントのインラインバリデーション表示を検証（ページ統合）  |
| AC-111〜112    | Unit        | `components/ExpenseForm.svelte.test.ts`                   | ExpenseForm コンポーネント直接のバリデーション検証          |
| AC-201〜203    | Unit        | `schema.test.ts`, `categories/schema.test.ts`             | Zod 境界値検証                                              |
| AC-204〜205    | E2E         | `e2e/expense.e2e.ts`                                      | 空状態・合計¥0 表示はブラウザ全体が必要                     |

## Non-Functional Requirements

### Performance

- 支出一覧は月単位で取得。月 100 件以内を想定し、ページネーションは不要
- カテゴリ一覧は全件取得（カテゴリ数は少量を想定）

### Security

- `hooks.server.ts` の認証ガードにより全エンドポイント認証済み
- `userId` でデータを絞り込み、他ユーザーの支出・カテゴリは 404 として扱う（存在を露出しない）
- `{@html}` は不使用

### Accessibility

- フォームの各入力要素に `<label>` を関連付ける
- 削除確認ダイアログに `role="alertdialog"` を付与する
