# Feature: 料理管理 (dishes)

## Overview

夫婦共有のレシピ記録・管理機能。料理の登録・一覧表示・編集・削除、タグによる絞り込みができる。
一覧は夫婦が共有して参照する。

API 詳細は [openapi.yaml](./openapi.yaml) を参照。

> plan.md 申し送り: タグ絞り込みはセレクトボックスで実装（スマホ操作前提）

## User Stories

- ユーザーとして、料理一覧を確認したい。過去に作った料理を把握するため。
- ユーザーとして、タグで料理を絞り込みたい。食べたい種類の料理を探すため。
- ユーザーとして、新しい料理を登録したい。レシピを記録するため。
- ユーザーとして、料理の内容を編集したい。情報を更新するため。
- ユーザーとして、料理を削除したい。不要になったレシピを整理するため。

## Schema

### Dish エンティティ（出力）

> `packages/shared/src/schemas/dish.ts` の `dishSchema` を参照。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string (cuid) | 一意識別子 |
| userId | string | 登録者 ID（Better Auth の user.id） |
| name | string | 料理名（必須） |
| recipeUrl | string \| null | レシピURL（任意） |
| recipeText | string \| null | レシピテキスト（任意） |
| effort | `EASY` \| `HARD` | 簡単 / めんどい |
| category | `MAIN` \| `SIDE` | メイン料理 / おかず |
| cookedAt | string (ISO 8601) | 作った日時 |
| createdAt | string (ISO 8601) | 登録日時 |
| tags | `{ id: string; name: string }[]` | 付与されたタグ |
| createdBy | string | 登録者表示名（「夫」「妻」） |

### 料理作成スキーマ（入力）

> `packages/shared/src/schemas/dish.ts` の `dishCreateSchema` を参照。

| フィールド | 型 | バリデーション |
|-----------|-----|---------------|
| name | string | 必須、1〜100文字 |
| recipeUrl | string \| null | 任意、URL 形式 |
| recipeText | string \| null | 任意、最大10000文字 |
| effort | `EASY` \| `HARD` | 必須 |
| category | `MAIN` \| `SIDE` | 必須 |
| tagIds | string[] | 任意（デフォルト: `[]`） |
| cookedAt | string (ISO 8601) | 任意（省略時は登録日時） |

### 料理更新スキーマ（入力）

> `packages/shared/src/schemas/dish.ts` の `dishUpdateSchema` を参照。

作成スキーマの全フィールドを optional にした PATCH 用スキーマ。

## API Endpoints

API 詳細は [openapi.yaml](./openapi.yaml) を参照。

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/dishes | 料理一覧取得（cookedAt 降順）、タグ ID でフィルタ可 |
| POST | /api/v1/dishes | 料理新規登録 |
| GET | /api/v1/dishes/:id | 料理詳細取得 |
| PATCH | /api/v1/dishes/:id | 料理部分更新 |
| DELETE | /api/v1/dishes/:id | 料理削除 |

## Acceptance Criteria

### 正常系

- AC-001: 料理一覧画面にアクセスすると、登録済みの全料理が cookedAt 降順で表示される
- AC-002: 各料理カードに登録者名（「夫」または「妻」）が表示される
- AC-003: タグのセレクトボックスで特定のタグを選択すると、そのタグを持つ料理のみ表示される
- AC-004: 必須項目（料理名・手間・カテゴリ）を入力して登録すると、料理が一覧に追加される
- AC-005: 料理の編集フォームで内容を変更して保存すると、一覧の内容が更新される
- AC-006: 料理の削除ボタンをタップすると、確認なしに料理が削除されて一覧から消える
- AC-007: タグを複数選択して料理を登録すると、料理にタグが付与される

### 異常系

- AC-101: 料理名が空のまま登録しようとすると、「料理名は必須です」エラーが表示される
- AC-102: recipeUrl に URL 形式でない文字列を入力すると、「URLの形式が正しくありません」エラーが表示される
- AC-103: 存在しない ID の料理を取得・更新・削除しようとすると、「料理が見つかりません」エラーが表示される（API: 404）

### 境界値

- AC-201: 料理名がちょうど100文字の場合、正常に登録できる
- AC-202: 料理名が101文字以上の場合、「料理名は100文字以内で入力してください」エラーが表示される
- AC-203: recipeText がちょうど10000文字の場合、正常に登録できる
- AC-204: recipeText が10001文字以上の場合、バリデーションエラーが表示される

## UI Requirements

### 画面構成（/dishes）

- タグ絞り込みセレクトボックス（全タグ対象、「すべて」オプション含む）
- 料理カード一覧（cookedAt 降順）
  - 料理名
  - 登録者名（夫 / 妻）
  - 手間バッジ（EASY: 「簡単」 / HARD: 「めんどい」）
  - カテゴリバッジ（MAIN: 「メイン」 / SIDE: 「おかず」）
  - タグチップ一覧
  - 編集ボタン・削除ボタン
- 新規登録ボタン（FAB またはフォーム）

### 料理登録・編集フォーム

- 料理名（テキスト、必須）
- レシピURL（テキスト、任意）
- レシピテキスト（テキストエリア、任意）
- 手間（ラジオボタン: 簡単 / めんどい）
- カテゴリ（ラジオボタン: メイン / おかず）
- タグ（複数選択チェックボックス）
- 作った日時（日付ピッカー、任意）

### インタラクション

- 絞り込みセレクトボックス変更: 即座に一覧をフィルタリング（API 再取得）
- 登録・編集の保存: バリデーション → API 呼び出し → 一覧更新またはエラー表示
- 削除ボタンタップ: 確認なしで即座に削除 → 一覧から消去

### バリデーション表示

- name が空: 「料理名は必須です」
- name が101文字以上: 「料理名は100文字以内で入力してください」
- recipeUrl が URL 形式でない: 「URLの形式が正しくありません」

### UX

- スマホ操作前提。セレクトボックスはネイティブ select 要素を使用してスマホでの操作性を確保する
- カードのタップ操作でも編集フォームを開けるようにする

## Non-Functional Requirements

### Performance

- 料理一覧の初期ロードは 1000ms 以内

### Security

- 認証済みユーザーのみアクセス可能（未認証は `/login` リダイレクト）
- 料理の削除は自分が登録した料理のみ可能とする（API: 403 Forbidden）

### Accessibility

- セレクトボックスに適切な `label` を設定する
- ボタンに適切な `aria-label` を設定する
