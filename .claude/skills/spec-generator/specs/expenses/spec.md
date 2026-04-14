# Feature: Expense（収支管理）

## Overview

同居人（主・妻の2人）と共有する支出を記録し、承認ワークフローで管理する機能。
支出をカテゴリ・支払者（ユーザー）・金額とともに登録し、チェックボックスで「確認済み」にした後、
「承認依頼する」ボタンで相手に申請を送信する。相手は「全件承認する」で承認を完了する。
承認依頼・承認完了時には LINE 通知を送信し、ワークフローをスムーズにする。

一覧は主・妻どちらのログインでも**全ユーザーの支出**を表示（世帯合計モデル）。
ただし操作権限は支出の登録者と承認ステータスによって制御する。

支払者はシステムユーザー（主・妻）から選択する。支払者マスタ管理 UI は不要。

## User Stories

- ユーザーとして、支出の金額とカテゴリを登録したい。家計の支出を記録するため。
- ユーザーとして、支出を誰が払ったかを記録したい。支払い負担を把握するため。
- ユーザーとして、登録した支出の金額・カテゴリ・支払者を後から修正したい。入力ミスを直すため。
- ユーザーとして、月ごとの支出一覧と世帯合計金額を確認したい。月の支出状況を把握するため。
- ユーザーとして、自分が登録した支出にチェックを付けて「確認済み」にしたい。内容確認を記録するため。
- ユーザーとして、確認済みの支出をまとめて「承認依頼する」で相手に送りたい。承認フローを進めるため。
- ユーザーとして、申請中の支出を取り消したい。誤って申請した場合に修正するため。
- ユーザーとして、相手から届いた承認依頼をまとめて承認したい。効率的にワークフローを完了するため。
- ユーザーとして、承認依頼・承認完了時に LINE 通知を受けたい。見落としを防ぐため。
- ユーザーとして、支出カテゴリを自由に追加・編集したい。ライフスタイルに合わせた分類をするため。

## Schema Definition（サマリ）

エンティティの概要と主要フィールド。詳細は [openapi.yaml](./openapi.yaml) を参照。

| エンティティ         | 概要                   | 主要フィールド                                                 | 備考                                                                                   |
| -------------------- | ---------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Expense              | 支出                   | id, userId, amount, categoryId, payerUserId, status, createdAt | status: `'unapproved'｜'checked'｜'pending'｜'approved'`                               |
| ExpenseWithRelations | 支出（リレーション付） | Expense + category, payer                                      | payer は User（payerUserId で結合）                                                    |
| Category             | カテゴリ               | id, userId, name, createdAt                                    | -                                                                                      |
| User                 | ユーザー               | id, name, email, role                                          | role: `'main'｜'partner'｜null`。パートナー解決に使用。LINE 通知先 ID は環境変数で管理 |

## Database Constraints（サマリ）

DB レベルの制約の概要。詳細は `src/lib/server/tables.ts` を参照。

| テーブル   | ユニーク制約が必要なフィールド | 備考                                                                           |
| ---------- | ------------------------------ | ------------------------------------------------------------------------------ |
| expenses   | -                              | payerUserId は user.id への FK（NOT NULL）。status はデフォルト `'unapproved'` |
| users      | -                              | role は `'main'｜'partner'｜null`（nullable TEXT）                             |
| categories | (userId, name)                 | ユーザーごとのカテゴリ名ユニーク                                               |

> 設計指針は `.claude/rules/schemas.md` の「Database Constraints 設計指針」を参照。

## Error Responses（サマリ）

エラーレスポンスの概要。詳細は [openapi.yaml](./openapi.yaml) を参照。

| 操作          | エラーコード     | 条件                                 | 備考 |
| ------------- | ---------------- | ------------------------------------ | ---- |
| 支出登録      | VALIDATION_ERROR | amount/categoryId/payerUserId が不正 | -    |
| 支出更新      | VALIDATION_ERROR | amount/categoryId/payerUserId が不正 | -    |
| 支出削除      | FORBIDDEN        | 他ユーザーの支出                     | -    |
| 支出削除      | CONFLICT         | pending/approved の支出              | -    |
| check/uncheck | FORBIDDEN        | 他ユーザーの支出                     | -    |
| check/uncheck | CONFLICT         | 不正なステータス遷移                 | -    |
| check/uncheck | NOT_FOUND        | 存在しない支出 ID                    | -    |
| 承認依頼      | CONFLICT         | checked が 0 件                      | -    |
| 承認依頼      | BAD_GATEWAY      | LINE API 失敗                        | -    |
| 申請取り消し  | CONFLICT         | pending が 0 件                      | -    |
| 全件承認      | CONFLICT         | 承認対象 pending が 0 件             | -    |
| 全件承認      | BAD_GATEWAY      | LINE API 失敗                        | -    |
| カテゴリ登録  | VALIDATION_ERROR | name が空または 51 文字以上          | -    |
| カテゴリ更新  | VALIDATION_ERROR | name が空または 51 文字以上          | -    |
| カテゴリ削除  | NOT_FOUND        | 存在しない ID                        | -    |
| カテゴリ削除  | CONFLICT         | 使用中のカテゴリ                     | -    |

## Query Parameters（サマリ）

一覧取得時のクエリパラメータ概要。詳細は [openapi.yaml](./openapi.yaml) を参照。

| パラメータ | 説明                | 備考                      |
| ---------- | ------------------- | ------------------------- |
| month      | 対象月（YYYY-MM）   | 省略時は当月              |
| page       | ページネーション    | デフォルト: 1             |
| limit      | 1ページあたりの件数 | デフォルト: 20, 最大: 100 |

## API Endpoints

API 詳細は [openapi.yaml](./openapi.yaml) を参照。

> 型定義・スキーマ・ステータスコード・エラーレスポンスは openapi.yaml が Single Source of Truth。

| メソッド | パス                        | 説明                                                |
| -------- | --------------------------- | --------------------------------------------------- |
| GET      | `/expenses`                 | 支出一覧取得（月フィルタ付き・全ユーザー）          |
| POST     | `/expenses`                 | 支出登録                                            |
| PUT      | `/expenses/[id]`            | 支出更新（金額・カテゴリ・支払者）                  |
| DELETE   | `/expenses/[id]`            | 支出削除                                            |
| POST     | `/expenses/[id]/check`      | 支出確認（unapproved → checked）                    |
| POST     | `/expenses/[id]/uncheck`    | 支出確認取消（checked → unapproved）                |
| POST     | `/expenses/request`         | 一括承認依頼（自分の checked → pending + LINE通知） |
| POST     | `/expenses/cancel`          | 一括申請取り消し（自分の pending → checked）        |
| POST     | `/expenses/approve`         | 一括承認（相手の pending → approved + LINE通知）    |
| GET      | `/expenses/categories`      | カテゴリ一覧取得                                    |
| POST     | `/expenses/categories`      | カテゴリ登録                                        |
| PUT      | `/expenses/categories/[id]` | カテゴリ更新                                        |
| DELETE   | `/expenses/categories/[id]` | カテゴリ削除                                        |

## Business Rules

scaffold-be はこのセクションを正として実装する。AC はこのルールの具体例（テストケース）。

### 状態遷移

```
unapproved ──check──→ checked
checked   ──uncheck──→ unapproved
checked   ──request──→ pending
pending   ──cancel──→ checked
pending   ──approve──→ approved
```

#### 遷移条件マトリクス

| 現在の状態       | 操作       | 遷移先     | 前提条件                | 失敗時                                     |
| ---------------- | ---------- | ---------- | ----------------------- | ------------------------------------------ |
| unapproved       | check      | checked    | userId = 登録者         | 409 CONFLICT（他状態からは不可）           |
| checked          | uncheck    | unapproved | userId = 登録者         | 409 CONFLICT（他状態からは不可）           |
| checked          | request    | pending    | userId = 登録者（一括） | 409 CONFLICT（checked が 0 件）            |
| pending          | cancel     | checked    | userId = 登録者（一括） | 409 CONFLICT（pending が 0 件）            |
| pending          | approve    | approved   | userId ≠ 登録者（一括） | 409 CONFLICT（承認対象 pending が 0 件）   |
| unapproved       | request    | —          | —                       | 409 CONFLICT（不正遷移）                   |
| unapproved       | approve    | —          | —                       | 409 CONFLICT（不正遷移）                   |
| approved         | any        | —          | —                       | 409 CONFLICT（終了状態・変更不可）         |
| any              | PUT/DELETE | —          | userId ≠ 登録者         | 403 FORBIDDEN                              |
| pending/approved | PUT/DELETE | —          | userId = 登録者         | 409 CONFLICT（申請中・承認済みは変更不可） |

#### 初期状態

- 新規作成時: `unapproved`

#### 終了状態

- `approved`: 以降の全操作（check/uncheck/edit/delete）を禁止。変更不可。

### 権限モデル

#### ロール定義

| ロール     | 判定方法                         | 説明             |
| ---------- | -------------------------------- | ---------------- |
| 登録者     | expense.userId = currentUserId   | 支出の作成者     |
| パートナー | user.role から逆引き（同居相手） | 登録者の同居相手 |
| 第三者     | 上記以外                         | 権限なし         |

#### 操作権限マトリクス

| 操作                   | 登録者                             | パートナー                 | 第三者 |
| ---------------------- | ---------------------------------- | -------------------------- | ------ |
| 支出作成               | ○                                  | ○                          | ×      |
| 支出一覧閲覧           | ○                                  | ○                          | ×      |
| check/uncheck          | ○（status=unapproved/checkedのみ） | ×                          | ×      |
| 支出更新（PUT）        | ○（status=unapproved/checkedのみ） | ×                          | ×      |
| 支出削除               | ○（status=unapproved/checkedのみ） | ×                          | ×      |
| 承認依頼（request）    | ○（自分の checked を一括）         | ×                          | ×      |
| 申請取り消し（cancel） | ○（自分の pending を一括）         | ×                          | ×      |
| 全件承認（approve）    | ×                                  | ○（相手の pending を一括） | ×      |

### エンティティ間制約

| 親エンティティ | 子エンティティ | 制約                                               | 違反時               |
| -------------- | -------------- | -------------------------------------------------- | -------------------- |
| Category       | Expense        | カテゴリ削除時に紐付く支出が 0 件であること        | 409 CONFLICT         |
| User（支払者） | Expense        | payerUserId はシステムユーザー（主・妻）のいずれか | 400 VALIDATION_ERROR |
| User（登録者） | Expense        | check/uncheck/PUT/DELETE は userId が一致すること  | 403 FORBIDDEN        |

### 計算ロジック

- **世帯合計金額**: `SUM(expenses.amount) WHERE month = targetMonth`（全ユーザー・全ステータス）
- **表示フォーマット**: `¥${amount.toLocaleString()}`（例: `¥12,300`）

### 外部API連携

承認依頼（request）・全件承認（approve）時に LINE Messaging API で通知を送信する。

#### 環境変数

| 変数名                      | 説明                                             |
| --------------------------- | ------------------------------------------------ |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API のチャネルアクセストークン    |
| `LINE_USER_ID_PRIMARY`      | 主（role='main'）の LINE ユーザー ID             |
| `LINE_USER_ID_SPOUSE`       | 妻（role='partner'）の LINE ユーザー ID          |
| `LINE_MOCK`                 | `true` の場合は API 呼び出しをスキップ（開発用） |

#### 通知先の解決

操作ユーザーの `role` からパートナーの LINE ユーザー ID を決定する。

| 操作ユーザーの role | 通知先 env var                    |
| ------------------- | --------------------------------- |
| `'main'`            | `LINE_USER_ID_SPOUSE`             |
| `'partner'`         | `LINE_USER_ID_PRIMARY`            |
| `null`              | 解決不可 → 通知スキップ（AC-118） |

`LINE_MOCK=true` の場合は API 呼び出しをスキップし、DB 更新のみ行う（成功扱い）。

#### パターン別動作

| パターン                                     | HTTP/ネットワーク    | DB更新 | 通知 | レスポンス      |
| -------------------------------------------- | -------------------- | ------ | ---- | --------------- |
| 成功                                         | 200 OK               | ○      | ○    | 200             |
| API エラー（4xx）                            | 400/401/403          | ×      | ×    | 502 BAD_GATEWAY |
| API エラー（5xx）                            | 500/502/503          | ×      | ×    | 502 BAD_GATEWAY |
| ネットワークエラー                           | タイムアウト/DNS/TLS | ×      | ×    | 502 BAD_GATEWAY |
| 設定なし（LINE_CHANNEL_ACCESS_TOKEN 未設定） | —                    | ○      | ×    | 200（成功扱い） |
| 送信先なし（通知先 LINE ユーザー ID 未設定） | —                    | ○      | ×    | 200（成功扱い） |
| LINE_MOCK=true                               | —                    | ○      | ×    | 200（成功扱い） |

#### トランザクション境界

- LINE API 呼び出し **より前** の DB 更新はトランザクション内で行う
- LINE API 失敗時はロールバックする
- 設定なし・送信先なしの場合は DB 更新をコミットし、通知をスキップする

### 境界条件・エッジケース

| 条件                                        | 期待する動作                                                 | 対応AC          |
| ------------------------------------------- | ------------------------------------------------------------ | --------------- |
| user.role が未設定（null）                  | DB 更新は継続。LINE 通知先を解決できないため通知はスキップ   | AC-118          |
| 存在しない支出 ID の指定                    | 404 NOT_FOUND                                                | AC-106          |
| 存在しないカテゴリ ID の指定                | 404 NOT_FOUND                                                | AC-109          |
| 自分の支出を自分で承認（approve）           | 自分の pending は承認対象外（パートナーの pending のみ承認） | AC-010          |
| month パラメータの月部分が不正（2026-13等） | 400 VALIDATION_ERROR（API）/ 302 リダイレクト（ページ）      | AC-002c, AC-120 |
| 同一ユーザーの checked が 0 件で request    | 409 CONFLICT                                                 | AC-115          |
| 承認対象パートナーの pending が 0 件        | 409 CONFLICT                                                 | AC-117          |
| LINE_CHANNEL_ACCESS_TOKEN 未設定            | DB 更新をコミット、通知スキップ                              | AC-125          |
| 通知先 LINE ユーザー ID 未設定              | DB 更新をコミット、通知スキップ                              | AC-124          |

## Acceptance Criteria

### 正常系

- AC-001: `/expenses` にアクセスすると、全ユーザーの当月の支出一覧が登録日時の新しい順で表示される
- AC-002: 月切り替えセレクトで別の月を選択すると、対象月の全ユーザーの支出一覧が表示される
- AC-002b: 月切り替えセレクトの選択肢は、選択中の月に関わらず常に「当月を起点とした過去 13 か月分」で固定される（過去月を選択後も当月を含む選択肢が表示され続ける）
- AC-002c: ページロード時に `?month=2026-13` など不正な月パラメータが渡された場合、400 エラーにせず `/expenses` にリダイレクトして当月の支出一覧を表示する（`expenseQuerySchema` で検証し、失敗時は 302 リダイレクト）
- AC-003: 金額・カテゴリ・支払者（ユーザー）を入力して「確定」ボタンを押すと 201 が返り、一覧の先頭に支出が追加される（登録日は自動セット、status は `unapproved`）
- AC-004: 自分が登録した `unapproved` の支出行のチェックボックスをクリックすると `POST /expenses/[id]/check` が呼ばれ 200 が返り、status が `checked` に更新される
- AC-005: 自分が登録した `checked` の支出行のチェックボックスを再クリックすると `POST /expenses/[id]/uncheck` が呼ばれ 200 が返り、status が `unapproved` に戻る
- AC-006: 自分が登録した `unapproved` / `checked` の支出の「編集」ボタンを押すと編集フォームダイアログが開き、金額・カテゴリ・支払者を変更して送信すると `PUT /expenses/[id]` で 200 が返り一覧が更新される
- AC-007: 自分が登録した `unapproved` / `checked` の支出の「削除」ボタンを押して確認ダイアログで確定すると 204 が返り、一覧から消える
- AC-008: 自分が登録した `checked` の支出が 1 件以上存在すると「承認依頼する（N件）」ボタンがヘッダーに表示され、確認モーダルで確定すると `POST /expenses/request` が呼ばれ自分の全 `checked` 支出が `pending` になり、相手に LINE 通知が送信される
- AC-009: 自分が登録した `pending` の支出が 1 件以上存在すると「申請取り消す（N件）」ボタンがヘッダーに表示され、確認モーダルで確定すると `POST /expenses/cancel` が呼ばれ自分の全 `pending` 支出が `checked` に戻る
- AC-010: 相手が登録した `pending` の支出が 1 件以上存在すると「全件承認する（N件）」ボタンがヘッダーに表示され、確認モーダルで確定すると `POST /expenses/approve` が呼ばれ相手の全 `pending` 支出が `approved` になり、相手に LINE 通知が送信される（自分の pending は対象外）
- AC-011: `/expenses/categories` でカテゴリを追加すると、支出登録・編集フォームのカテゴリセレクトに反映される
- AC-012: カテゴリを編集すると、一覧に表示されているカテゴリ名が更新される
- AC-013: カテゴリに紐付く支出が 0 件の場合、カテゴリを削除できる
- AC-014: 一覧画面に選択中の月の世帯合計金額（全ユーザーの全ステータスの全件）がカンマ区切りで表示される
- AC-015: `approved` の支出行は opacity を下げてグレーアウト表示し、チェックボックス・編集・削除ボタンを非表示にする
- AC-016: 他ユーザーが登録した `unapproved` / `checked` の支出行にはチェックボックス・編集・削除ボタンが表示されない（閲覧のみ）
- AC-017: 自分が登録した `pending` の支出行はグレーアウト + チェックボックスなし・編集・削除ボタンは disabled、他ユーザーの `pending` 行は閲覧のみで操作ボタンを表示しない
- AC-018: 未承認行の `expense-menu-button`（モバイル）をタップすると `expense-menu` が表示される（自分が登録した行のみ）
- AC-019: `expense-menu` 表示中にメニュー外をクリックすると `expense-menu` が閉じる

#### ダイアログ基本動作（Dialog / ConfirmDialog / ExpenseFormDialog）

- AC-021: `Dialog` は `open=false` のとき描画されない
- AC-022: `Dialog` は `open=true` のとき children が描画される
- AC-023: `Dialog` で Escape キーを押すと `onClose` が呼ばれる
- AC-024: `Dialog` で backdrop をクリックすると `onClose` が呼ばれる（`closeOnBackdrop=true` デフォルト）
- AC-025: `Dialog` に `closeOnBackdrop=false` を渡すと backdrop クリックで `onClose` が呼ばれない
- AC-026: `Dialog` に `disabled=true` を渡すと Escape キーで `onClose` が呼ばれない
- AC-027: `ConfirmDialog` は title・description を表示する
- AC-028: `ConfirmDialog` のキャンセルボタンを押すと `onCancel` が呼ばれる
- AC-029: `ConfirmDialog` の確認ボタンを押すと `onConfirm` が呼ばれる
- AC-030: `ConfirmDialog` に `loading=true` を渡すと両ボタンが disabled になる
- AC-031: `ConfirmDialog` に `error` を渡すとエラーメッセージが表示される
- AC-032: `ExpenseFormDialog` は `open=false` のときフォームが描画されない
- AC-033: `ExpenseFormDialog` は `mode=create` のとき「支出を登録」フォームが表示される
- AC-034: `ExpenseFormDialog` は `mode=edit` かつ `expense` を渡すと「支出を編集」フォームが表示される

### 異常系

- AC-101: 金額が未入力の場合、400 VALIDATION_ERROR「金額は必須です」が返る
- AC-102: 金額が 0 以下の場合、400 VALIDATION_ERROR「1円以上の金額を入力してください」が返る
- AC-103: 金額が 9,999,999 を超える場合、400 VALIDATION_ERROR「9,999,999円以下の金額を入力してください」が返る
- AC-104: 金額が整数でない（小数・文字列）場合、400 VALIDATION_ERROR が返る
- AC-105: カテゴリ ID が未指定の場合、400 VALIDATION_ERROR「カテゴリは必須です」が返る
- AC-106: 存在しない支出 ID に対して PUT/DELETE/check/uncheck した場合、404 NOT_FOUND「該当データが見つかりません」が返る
- AC-107: カテゴリ名が空の場合、400 VALIDATION_ERROR「カテゴリ名は必須です」が返る
- AC-108: カテゴリ名が 51 文字以上の場合、400 VALIDATION_ERROR「50文字以内で入力してください」が返る
- AC-109: 存在しないカテゴリ ID に対して PUT/DELETE した場合、404 NOT_FOUND「該当データが見つかりません」が返る
- AC-110: カテゴリに紐付く支出が 1 件以上ある場合、カテゴリは削除できず 409 CONFLICT「このカテゴリは使用中のため削除できません」が返る
- AC-111: フロント側で金額が空のまま「確定」を押すと「金額は必須です」とインライン表示される（サーバー非通信）
- AC-112: フロント側でカテゴリが未選択のまま「確定」を押すと「カテゴリは必須です」とインライン表示される（サーバー非通信）
- AC-113: `pending` / `approved` の支出に対して PUT/DELETE を試みた場合、409 CONFLICT「申請中または承認済みの支出は変更できません」が返る
- AC-114: 他ユーザーが登録した支出に対して check/uncheck/PUT/DELETE を試みた場合、403 FORBIDDEN「他のユーザーの支出は操作できません」が返る
- AC-115: `POST /expenses/request` 実行時に自分の `checked` 支出が 0 件の場合、409 CONFLICT「確認済みの支出がありません」が返る
- AC-116: `POST /expenses/cancel` 実行時に自分の `pending` 支出が 0 件の場合、409 CONFLICT「申請中の支出がありません」が返る
- AC-117: `POST /expenses/approve` 実行時に承認対象パートナーの `pending` 支出が 0 件の場合、409 CONFLICT「承認できる支出がありません」が返る（第三者アカウントの `pending` のみ存在する場合も含む）
- AC-118: `user.role` が未設定（null）の状態で `POST /expenses/request` または `POST /expenses/approve` を実行した場合も DB 更新は継続される。通知先 role を解決できないため LINE 通知は送信されない
- AC-119: LINE API が 4xx/5xx を返した場合、またはネットワークエラー（タイムアウト・DNS/TLS 失敗など）が発生した場合、`POST /expenses/request` / `POST /expenses/approve` は 502 BAD_GATEWAY「LINE 通知の送信に失敗したため承認フローを完了できませんでした」を返し、対象支出の status は変更しない
- AC-120: `month` クエリパラメータの月部分が `01〜12` の範囲外の場合（例: `2026-13`、`2026-00`）、400 VALIDATION_ERROR「月は01〜12で入力してください」が返る
- AC-121: check/uncheck 操作が失敗した場合（4xx/5xx）、一覧上部にエラーメッセージ（`expense-action-error`）を表示する
- AC-122: 承認依頼が失敗した場合、`expense-request-dialog` 内にエラーメッセージを表示しダイアログを閉じない
- AC-123: 支払者ユーザー ID が未指定の場合、400 VALIDATION_ERROR「支払者は必須です」が返る
- AC-124: `LINE_CHANNEL_ACCESS_TOKEN` が設定されていても通知先 LINE ユーザー ID が未設定の場合、`POST /expenses/request` / `POST /expenses/approve` はエラーにせず DB 更新を継続する。LINE 通知は送信しない
- AC-125: `LINE_CHANNEL_ACCESS_TOKEN` が未設定の場合、`POST /expenses/request` / `POST /expenses/approve` はエラーにせず DB 更新を継続する。LINE 通知は送信しない

### 境界値

- AC-201: 金額が 1 の場合、登録できる
- AC-202: 金額が 9,999,999 の場合、登録できる
- AC-203: カテゴリ名が 50 文字の場合、登録できる
- AC-204: 支出が 0 件の場合、空状態メッセージ（`expense-empty`）が表示される
- AC-205: 支出が 0 件の場合、合計金額は「¥0」と表示される
- AC-206: 金額欄に全角数字を入力すると半角数字に自動変換される
- AC-207: 金額欄の入力値がカンマ区切りで整形される（例: 1000 → 1,000）

## UI Requirements

### 一覧画面（`/expenses`）

#### 画面構成

- **月切り替えセレクト** (`expense-month-select`): 表示する月を選択。デフォルトは当月（`YYYY-MM` 形式）。選択肢は当月を含む過去 13 か月分
- **カテゴリ管理リンク**: カテゴリ管理ページ（`/expenses/categories`）へのリンク
- **承認依頼ボタン** (`expense-bulk-request-button`): 自分の `checked` 支出が 1 件以上のときヘッダーに表示。「承認依頼する（N件）」と件数を表示
- **申請取り消しボタン** (`expense-bulk-cancel-button`): 自分の `pending` 支出が 1 件以上のときヘッダーに表示。「申請取り消す（N件）」と件数を表示
- **全件承認ボタン** (`expense-bulk-approve-button`): 相手の `pending` 支出が 1 件以上のときヘッダーに表示。「全件承認する（N件）」と件数を表示
- **支出登録ボタン** (`expense-create-button`): 右上。クリックで登録フォームダイアログを開く
- **月間合計** (`expense-total`): 対象月の世帯合計金額（全ユーザー・全ステータス）をカンマ区切りで表示（例: `¥12,300`）
- **支出一覧** (`expense-list`): 各行に金額・カテゴリ名・支払者名・登録日・ステータスバッジ・操作

  #### デスクトップ（`md:` 以上）
  - **行レイアウト**: チェックボックス（自分のunapproved/checked行のみ） ＋ 金額 ＋ カテゴリ名バッジ ＋ 支払者名バッジ ＋ ステータスバッジ（左） ＋ 操作ボタン群（右）の横一列
  - **ステータスバッジ**: 「未承認」（赤系）/ 「確認済み」（黄系）/ 「申請中」（青系）/ 「承認済み」（緑系）
  - **チェックボックス** (`expense-check-button`): 自分が登録した `unapproved` / `checked` の行のみ表示。チェック状態は `checked` かどうかで切り替わる
  - **編集ボタン** (`expense-edit-button`): 自分が登録した `unapproved` / `checked` の行のみ表示
  - **削除ボタン** (`expense-delete-button`): 自分が登録した `unapproved` / `checked` の行のみ表示
  - **pending 行のスタイル**: opacity を下げてグレーアウト。チェックボックスなし。自分が登録した行の編集・削除ボタンは disabled、他ユーザー行は非表示
  - **approved 行のスタイル**: opacity を下げてグレーアウト。チェックボックス・編集・削除ボタンは非表示
  - **他ユーザーの unapproved / checked 行**: チェックボックス・編集・削除ボタンを非表示

  #### モバイル（`md:` 未満）
  - **行レイアウト**:
    - 1行目: チェックボックス（自分のunapproved/checked行のみ）＋ 金額（大）＋ 行メニューボタン（右端、自分のunapproved/checked行のみ）
    - 2行目: カテゴリ名バッジ ＋ 支払者名バッジ ＋ ステータスバッジ ＋ 登録日
  - **pending 行のスタイル**: opacity を下げてグレーアウト。行メニューボタンは非表示
  - **approved 行のスタイル**: opacity を下げてグレーアウト。行メニューボタンは非表示
  - **他ユーザーの unapproved / checked 行**: チェックボックス・行メニューボタンを非表示
  - **行メニューボタン** (`expense-menu-button`): 自分の `unapproved` / `checked` の行のみ表示
  - **行メニュー** (`expense-menu`): 行メニューボタンの近くに表示されるドロップダウン
    - 「編集」(`expense-edit-button`): 自分の unapproved / checked 行
    - 「削除」(`expense-delete-button`): 自分の unapproved / checked 行
  - メニュー外をタップするとメニューを閉じる

- **空状態** (`expense-empty`): 支出が 0 件のとき表示

#### コンポーネント階層

```
ExpensePage
├── HeaderSection
│   ├── MonthSelect (expense-month-select)
│   ├── CategoryManagementLink
│   └── BulkActions
│       ├── BulkRequestButton (expense-bulk-request-button)
│       ├── BulkCancelButton (expense-bulk-cancel-button)
│       └── BulkApproveButton (expense-bulk-approve-button)
├── CreateButton (expense-create-button)
├── MonthTotal (expense-total)
├── ExpenseList (expense-list)
│   └── ExpenseItem (expense-item) × N
│       ├── Checkbox (expense-check-button) ※条件付き
│       ├── Amount
│       ├── CategoryBadge
│       ├── PayerBadge
│       ├── StatusBadge
│       ├── Actions (desktop)
│       │   ├── EditButton (expense-edit-button)
│       │   └── DeleteButton (expense-delete-button)
│       └── MenuButton (expense-menu-button) ※モバイル
│           └── ExpenseMenu (expense-menu)
├── ExpenseEmpty (expense-empty) ※条件付き
└── Dialogs
    ├── ExpenseFormDialog (expense-form) ※create/edit
    ├── RequestDialog (expense-request-dialog)
    ├── CancelDialog (expense-cancel-dialog)
    ├── ApproveDialog (expense-approve-dialog)
    └── DeleteDialog (expense-delete-dialog)
```

#### レイアウト・スペーシング

| 要素          | 配置     | 幅・高さ  | 余白       | 備考                             |
| ------------- | -------- | --------- | ---------- | -------------------------------- |
| PageContainer | 中央寄せ | max-w-2xl | p-4 md:p-6 |                                  |
| HeaderSection | 縦並び   | w-full    | mb-4 gap-2 | 月セレクト + 一括操作ボタン      |
| BulkActions   | 横並び   | auto      | gap-2      | 表示中のボタンのみ               |
| MonthTotal    | 左寄せ   | auto      | mb-2       |                                  |
| ExpenseList   | 縦並び   | w-full    | gap-2      |                                  |
| ExpenseItem   | 横並び   | w-full    | p-3 md:p-4 | rounded-2xl bg-bg-card shadow-sm |
| ExpenseForm   | 縦並び   | w-full    | gap-4 p-6  |                                  |

#### 状態ごとの表示ルール

| 要素              | 条件                                 | 表示                               | 備考                    |
| ----------------- | ------------------------------------ | ---------------------------------- | ----------------------- |
| Checkbox          | 自分の unapproved                    | unchecked                          |                         |
| Checkbox          | 自分の checked                       | checked                            |                         |
| Checkbox          | 自分の pending/approved              | 非表示（DOM除去）                  |                         |
| Checkbox          | 他人の支出                           | 非表示（DOM除去）                  |                         |
| EditButton        | 自分の unapproved/checked（desktop） | 表示                               |                         |
| EditButton        | 自分の pending（desktop）            | disabled（opacity-50）             | cursor-not-allowed      |
| EditButton        | 他人の支出                           | 非表示（DOM除去）                  |                         |
| DeleteButton      | 自分の unapproved/checked（desktop） | 表示                               |                         |
| DeleteButton      | 自分の pending（desktop）            | disabled（opacity-50）             | cursor-not-allowed      |
| DeleteButton      | 他人の支出                           | 非表示（DOM除去）                  |                         |
| MenuButton        | 自分の unapproved/checked（mobile）  | 表示                               |                         |
| MenuButton        | 自分の pending/approved（mobile）    | 非表示                             |                         |
| MenuButton        | 他人の支出（mobile）                 | 非表示                             |                         |
| StatusBadge       | status=unapproved                    | bg-destructive/10 text-destructive | 「未承認」              |
| StatusBadge       | status=checked                       | bg-bg-warning text-warning         | 「確認済み」            |
| StatusBadge       | status=pending                       | bg-accent/10 text-accent           | 「申請中」              |
| StatusBadge       | status=approved                      | bg-success/10 text-success         | 「承認済み」            |
| ExpenseItem row   | status=pending                       | opacity-50 グレーアウト            |                         |
| ExpenseItem row   | status=approved                      | opacity-50 グレーアウト            |                         |
| BulkRequestButton | 自分の checked ≥ 1 件                | 表示                               | 「承認依頼する（N件）」 |
| BulkCancelButton  | 自分の pending ≥ 1 件                | 表示                               | 「申請取り消す（N件）」 |
| BulkApproveButton | 相手の pending ≥ 1 件                | 表示                               | 「全件承認する（N件）」 |

#### インタラクション

- 月切り替え → `?month=YYYY-MM` を URL に反映し `GET /expenses?month=YYYY-MM` を再取得
- 登録ボタンクリック → 登録フォームダイアログを表示
- 「承認依頼する（N件）」ボタンクリック → `expense-request-dialog` を表示
  - 確定 → `POST /expenses/request` を送信 → 成功時はダイアログを閉じて一覧を更新。失敗時はダイアログ内にエラーを表示
- 「申請取り消す（N件）」ボタンクリック → `expense-cancel-dialog` を表示（注意喚起モーダル）
  - 確定 → `POST /expenses/cancel` を送信 → 成功時はダイアログを閉じて一覧を更新
- 「全件承認する（N件）」ボタンクリック → `expense-approve-dialog` を表示
  - 確定 → `POST /expenses/approve` を送信 → 成功時はダイアログを閉じて一覧を更新

**デスクトップ（`md:` 以上）のみ**

- チェックボックスクリック（unchecked → checked）→ `POST /expenses/[id]/check` を呼ぶ → 成功時は一覧を更新。失敗時は `expense-action-error` にエラーを表示（AC-121）
- チェックボックスクリック（checked → unchecked）→ `POST /expenses/[id]/uncheck` を呼ぶ → 成功時は一覧を更新。失敗時は `expense-action-error` にエラーを表示（AC-121）
- 編集ボタンクリック → 編集フォームダイアログを表示（現在の金額・カテゴリ・支払者を初期値にセット）
- 削除ボタンクリック → `expense-delete-dialog` を表示し確定で `DELETE /expenses/[id]` を呼ぶ

**モバイル（`md:` 未満）のみ**

- 行メニューボタンクリック → `expense-menu` を開く（既に開いている場合は閉じる）
- メニュー外タップ → `expense-menu` を閉じる
- メニュー「編集」選択 → メニューを閉じ、編集フォームダイアログを表示
- メニュー「削除」選択 → メニューを閉じ、`expense-delete-dialog` を表示し確定で `DELETE /expenses/[id]` を呼ぶ

#### アニメーション・トランジション

| 要素        | トリガー | アニメーション           | 時間  |
| ----------- | -------- | ------------------------ | ----- |
| Dialog      | 開く     | fade-in + scale(0.95→1)  | 150ms |
| Dialog      | 閉じる   | fade-out + scale(1→0.95) | 100ms |
| ExpenseMenu | 開く     | fade-in                  | 100ms |
| ExpenseMenu | 閉じる   | fade-out                 | 80ms  |
| Button      | ホバー   | opacity-90               | 100ms |

#### レスポンシブ挙動

| ブレークポイント     | レイアウト変更                                                                    | 備考         |
| -------------------- | --------------------------------------------------------------------------------- | ------------ |
| デフォルト（<768px） | 1カラム。行: 2行構成（金額＋メニュー / バッジ＋日付）。操作は行メニューボタンから | モバイル     |
| md（≥768px）         | 1カラム。行: 横一列（チェック＋金額＋バッジ＋ステータス＋操作ボタン群）           | デスクトップ |
| lg（≥1024px）        | 変更なし                                                                          | デスクトップ |

#### バリデーション表示

- `expense-amount-error`: 金額が不正な場合に表示
- `expense-category-error`: カテゴリ未選択の場合に表示
- `expense-payer-error`: 支払者未選択の場合に表示

#### エラーメッセージの表示ルール

| タイミング           | 表示箇所       | スタイル                 | 消える条件             |
| -------------------- | -------------- | ------------------------ | ---------------------- |
| 送信時（BE エラー）  | フィールド直下 | text-destructive text-sm | 入力変更時             |
| 送信時（汎用エラー） | フォーム上部   | role="alert"             | 次送信時               |
| リアルタイム（FE）   | フィールド直下 | text-destructive text-sm | 入力値が有効になった時 |

#### 空状態・ローディング

| 状態         | 表示内容                           | data-testid          |
| ------------ | ---------------------------------- | -------------------- |
| ローディング | Skeleton（行のプレースホルダ）     | expense-loading      |
| データ0件    | 「支出はまだありません」メッセージ | expense-empty        |
| エラー       | エラーメッセージ + リトライボタン  | expense-action-error |

### 登録・編集フォーム（ダイアログ）

登録と編集で同じフォームコンポーネント（`ExpenseForm`）を使い回す。

#### 画面構成

- 金額入力欄（数値・必須）
- カテゴリ選択セレクト（必須。自分のカテゴリ一覧から取得）
- 支払者選択セレクト（必須。システムユーザー一覧から取得。主・妻の2人）
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

## data-testid

| testid                                   | 要素種別   | 説明                                                                     |
| ---------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| `expense-list`                           | `<ul>`     | 支出一覧                                                                 |
| `expense-item`                           | `<li>`     | 支出行                                                                   |
| `expense-create-button`                  | `<button>` | 支出登録ボタン                                                           |
| `expense-edit-button`                    | `<button>` | 支出編集ボタン（自分の unapproved/checked 行のみ）                       |
| `expense-check-button`                   | `<input>`  | チェックボックス（自分の unapproved/checked 行のみ）                     |
| `expense-form`                           | `<form>`   | 登録・編集フォーム                                                       |
| `expense-amount-input`                   | `<input>`  | 金額入力欄                                                               |
| `expense-category-select`                | `<select>` | カテゴリ選択セレクト                                                     |
| `expense-payer-select`                   | `<select>` | 支払者選択セレクト                                                       |
| `expense-submit-button`                  | `<button>` | 確定ボタン                                                               |
| `expense-action-error`                   | `<p>`      | check/uncheck 失敗時のエラーメッセージ（一覧上部）                       |
| `expense-amount-error`                   | `<p>`      | 金額エラーメッセージ                                                     |
| `expense-category-error`                 | `<p>`      | カテゴリエラーメッセージ                                                 |
| `expense-payer-error`                    | `<p>`      | 支払者エラーメッセージ                                                   |
| `expense-menu-button`                    | `<button>` | 行メニューを開くボタン（自分の unapproved/checked 行のみ・モバイル）     |
| `expense-menu`                           | `<div>`    | 行メニュードロップダウン                                                 |
| `expense-bulk-request-button`            | `<button>` | 承認依頼ボタン（自分の checked が 1 件以上のときヘッダーに自動出現）     |
| `expense-bulk-cancel-button`             | `<button>` | 申請取り消しボタン（自分の pending が 1 件以上のときヘッダーに自動出現） |
| `expense-bulk-approve-button`            | `<button>` | 全件承認ボタン（相手の pending が 1 件以上のときヘッダーに自動出現）     |
| `expense-request-dialog`                 | `<div>`    | 承認依頼確認ダイアログ                                                   |
| `expense-request-confirm-button`         | `<button>` | 承認依頼の確定ボタン                                                     |
| `expense-cancel-dialog`                  | `<div>`    | 申請取り消し確認ダイアログ（注意喚起）                                   |
| `expense-cancel-confirm-button`          | `<button>` | 申請取り消しの確定ボタン                                                 |
| `expense-approve-dialog`                 | `<div>`    | 全件承認確認ダイアログ                                                   |
| `expense-approve-confirm-button`         | `<button>` | 全件承認の確定ボタン                                                     |
| `expense-delete-button`                  | `<button>` | 支出削除ボタン                                                           |
| `expense-delete-dialog`                  | `<div>`    | 支出削除確認ダイアログ                                                   |
| `expense-delete-confirm-button`          | `<button>` | 支出削除の確定ボタン                                                     |
| `expense-loading`                        | `<div>`    | ローディング表示（Skeleton）                                             |
| `expense-empty`                          | `<p>`      | 空状態メッセージ                                                         |
| `expense-month-select`                   | `<select>` | 月切り替えセレクト                                                       |
| `expense-total`                          | `<p>`      | 月間合計金額表示                                                         |
| `expense-category-list`                  | `<ul>`     | カテゴリ一覧                                                             |
| `expense-category-item`                  | `<li>`     | カテゴリ行                                                               |
| `expense-category-name-input`            | `<input>`  | カテゴリ名入力欄                                                         |
| `expense-category-add-button`            | `<button>` | カテゴリ追加ボタン                                                       |
| `expense-category-edit-button`           | `<button>` | カテゴリ編集ボタン                                                       |
| `expense-category-delete-button`         | `<button>` | カテゴリ削除ボタン                                                       |
| `expense-category-delete-dialog`         | `<div>`    | カテゴリ削除確認ダイアログ                                               |
| `expense-category-delete-confirm-button` | `<button>` | カテゴリ削除の確定ボタン                                                 |
| `expense-category-name-error`            | `<p>`      | カテゴリ名エラーメッセージ                                               |

## テスト戦略

| AC                                                                                                   | 種別        | 対象ファイル                                      | 備考                                                                                    | spec_hash  |
| ---------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------- |
| AC-001〜002                                                                                          | Integration | `page.server.integration.test.ts`                 | load 関数の月フィルタ動作・全ユーザー取得を実 D1 で検証                                 | `c4cbc954` |
| AC-002b                                                                                              | E2E         | `e2e/expense.e2e.ts`                              | 月選択肢は常に当月を含む固定リストであることを検証                                      | `cdb7c297` |
| AC-002c                                                                                              | E2E         | `e2e/expense.e2e.ts`                              | 不正な月パラメータは /expenses にリダイレクトされることを検証                           | `83a227b2` |
| AC-001〜010                                                                                          | Integration | `service.integration.test.ts`                     | 支出 CRUD・check/uncheck・request/cancel/approve を実 D1 で検証                         | `8c1c46fd` |
| AC-011〜013                                                                                          | Integration | `categories/service.integration.test.ts`          | カテゴリ CRUD を実 D1 で検証                                                            | `8fe156c1` |
| AC-014                                                                                               | Integration | `service.integration.test.ts`                     | 世帯合計算出（全ユーザー・全ステータス）を実 D1 で検証                                  | `6b44fff0` |
| AC-101〜105                                                                                          | Unit        | `schema.test.ts`                                  | Zod バリデーション検証                                                                  | `c3faeddc` |
| AC-107〜108                                                                                          | Unit        | `categories/schema.test.ts`                       | カテゴリ Zod バリデーション検証                                                         | `abe11e29` |
| AC-101〜105                                                                                          | Unit        | `+server.test.ts`                                 | API ハンドラが VALIDATION_ERROR 形式の 400 を返すことを検証                             | `8c47a574` |
| AC-107〜108                                                                                          | Unit        | `categories/+server.test.ts`                      | カテゴリ API ハンドラの VALIDATION_ERROR 検証                                           | `58569033` |
| AC-106                                                                                               | Unit        | `[id]/+server.test.ts`                            | NOT_FOUND 形式の 404 を検証                                                             | `f7ea9b79` |
| AC-109                                                                                               | Unit        | `categories/[id]/+server.test.ts`                 | カテゴリ NOT_FOUND 形式の 404 を検証                                                    | `5f2343f4` |
| AC-110                                                                                               | Unit        | `categories/[id]/+server.test.ts`                 | CONFLICT 形式の 409 を検証                                                              | `224f4ce6` |
| AC-113                                                                                               | Unit        | `[id]/+server.test.ts`                            | pending/approved ロックの 409 を検証                                                    | `66a60862` |
| AC-114                                                                                               | Unit        | `[id]/+server.test.ts`                            | 更新・削除の他ユーザー操作 403 を検証                                                   | `58e926ac` |
| AC-115〜119                                                                                          | Unit        | `+server.test.ts`, `service.integration.test.ts`  | request/cancel/approve の CONFLICT・BAD_GATEWAY と関連制約を検証                        | `102bbfbf` |
| AC-125                                                                                               | Integration | `service.integration.test.ts`                     | LINE_CHANNEL_ACCESS_TOKEN 未設定で request/approve しても DB 更新が継続されることを検証 | `4336868c` |
| AC-004〜005                                                                                          | Integration | `service.integration.test.ts`                     | check/uncheck のステータス遷移・他ユーザー操作を実 D1 で検証                            | `495b580c` |
| AC-015〜017                                                                                          | Unit        | `page.svelte.test.ts`                             | approved/pending 行のグレーアウト・ボタン非表示を検証                                   | `7017dde3` |
| AC-018〜019                                                                                          | E2E         | `e2e/expense.e2e.ts`                              | モバイル viewport 依存のため E2E で検証（testing.md 参照）                              | `04456c16` |
| AC-021〜026                                                                                          | Unit        | `src/lib/components/Dialog.svelte.test.ts`        | Dialog の基本動作（open/close/Escape/backdrop）を検証                                   | `689036b7` |
| AC-027〜031                                                                                          | Unit        | `src/lib/components/ConfirmDialog.svelte.test.ts` | ConfirmDialog の表示・ボタン・loading・error を検証                                     | `3852ab60` |
| AC-032〜034                                                                                          | Unit        | `components/ExpenseFormDialog.svelte.test.ts`     | ExpenseFormDialog の open/mode 別表示を検証                                             | `f42a205a` |
| AC-111〜112                                                                                          | Unit        | `page.svelte.test.ts`                             | フロントのインラインバリデーション表示を検証（ページ統合）                              | `1015add0` |
| AC-111〜112                                                                                          | Unit        | `components/ExpenseForm.svelte.test.ts`           | ExpenseForm コンポーネント直接のバリデーション検証                                      | `90cc1bc8` |
| AC-201〜202                                                                                          | Unit        | `schema.test.ts`                                  | Zod 境界値検証                                                                          | `3b5175ed` |
| AC-203                                                                                               | Unit        | `categories/schema.test.ts`                       | カテゴリ名 50 文字境界値を検証                                                          | `314eef45` |
| AC-206〜207                                                                                          | Unit        | `components/ExpenseForm.svelte.test.ts`           | 金額欄の全角変換・カンマ整形を検証                                                      | `08c70745` |
| AC-204〜205                                                                                          | E2E         | `e2e/expense.e2e.ts`                              | 空状態・合計¥0 表示はブラウザ全体が必要                                                 | `9be16731` |
| [SPEC: BR-状態遷移] checked の支出を check すると 409 CONFLICT                                       | Unit        | `[id]/+server.test.ts`                            | 不正遷移（再 check）の検証                                                              | `207ce956` |
| [SPEC: BR-状態遷移] pending/approved の支出を check すると 409 CONFLICT                              | Unit        | `[id]/+server.test.ts`                            | 不正遷移（check 不可状態）の検証                                                        | `ee07819d` |
| [SPEC: BR-状態遷移] unapproved の支出を uncheck すると 409 CONFLICT                                  | Unit        | `[id]/+server.test.ts`                            | 不正遷移（未 check 状態での uncheck）の検証                                             | `9aa14e4f` |
| [SPEC: BR-状態遷移] pending/approved の支出を uncheck すると 409 CONFLICT                            | Unit        | `[id]/+server.test.ts`                            | 不正遷移（uncheck 不可状態）の検証                                                      | `24e1765b` |
| [SPEC: BR-外部API] LINE_CHANNEL_ACCESS_TOKEN 未設定で request すると DB 更新のみ実行（通知スキップ） | Integration | `service.integration.test.ts`                     | 設定なしパターンの検証                                                                  | `dcc4fcc7` |
| [SPEC: BR-外部API] LINE_CHANNEL_ACCESS_TOKEN 未設定で approve すると DB 更新のみ実行（通知スキップ） | Integration | `service.integration.test.ts`                     | 設定なしパターンの検証                                                                  | `a5975b23` |

## Non-Functional Requirements

### Performance

- 支出一覧は月単位で取得。月 100 件以内を想定。`page`/`limit` によるページネーションを実装済み（limit デフォルト 20、最大 100）
- カテゴリ一覧は全件取得（件数は少量を想定）
- request/cancel/approve は対象ステータスの全件を一括更新する。Drizzle の bulk update を使用する

### Security

- `hooks.server.ts` の認証ガードにより全エンドポイント認証済み
- check/uncheck/PUT/DELETE は登録者 (`userId`) と一致しない場合 403 FORBIDDEN を返す
- approve は自分の `pending` を承認対象に含めず、承認対象パートナーの `pending` のみを一括承認する
- `{@html}` は不使用

### Accessibility

- フォームの各入力要素に `<label>` を関連付ける
- 削除確認ダイアログに `role="alertdialog"` を付与する
- チェックボックスには `aria-label` を付与する（支出 ID や金額で識別）
