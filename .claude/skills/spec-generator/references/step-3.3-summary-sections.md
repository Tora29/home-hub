# Step 3.3: サマリセクション生成

spec.md に scaffold スキルが必要とするサマリ情報を生成する。
詳細は openapi.yaml または tables.ts に委譲し、spec.md は「何を」のレベルに留める。

---

## Schema Definition（サマリ）

エンティティの概要と主要フィールドを一覧表で記述する。

### フォーマット

```markdown
## Schema Definition（サマリ）

エンティティの概要と主要フィールド。詳細は [openapi.yaml](./openapi.yaml) を参照。

| エンティティ | 概要   | 主要フィールド          | 備考   |
| ------------ | ------ | ----------------------- | ------ |
| {Entity}     | {説明} | {field1}, {field2}, ... | {補足} |
```

### 生成ルール

- エンティティごとに1行
- 主要フィールドは5個以内に絞る（詳細は openapi.yaml 参照）
- ユニーク制約がある場合は「備考」に記載

---

## Database Constraints（サマリ）

DB レベルの制約（UNIQUE, INDEX, FOREIGN KEY）の概要を記述する。

### フォーマット

```markdown
## Database Constraints（サマリ）

DB レベルの制約の概要。詳細は `src/lib/server/tables.ts` を参照。

| テーブル | ユニーク制約が必要なフィールド | 備考   |
| -------- | ------------------------------ | ------ |
| {table}  | (col1, col2, ...)              | {補足} |
```

### 生成ルール

- テーブルごとに1行
- ユニーク制約がある場合のみ記載
- 複数カラムの複合ユニークもカッコで表記
- 備考に「設計指針は `.claude/rules/schemas.md` の『Database Constraints 設計指針』を参照」を追記

---

## data-testid

テスト用セレクタの定義を一覧表で記述する。

### フォーマット

```markdown
## data-testid

テスト用セレクタの定義。命名規則は `.claude/rules/data-testid.md` に従う。

| 要素                 | testid                          | 備考                  |
| -------------------- | ------------------------------- | --------------------- |
| {リストコンテナ}     | {feature}-list                  | ul タグ               |
| {リストアイテム}     | {feature}-item                  | 各行                  |
| {作成ボタン}         | {feature}-create-button         | ヘッダー              |
| {削除ボタン}         | {feature}-delete-button         | 各行内                |
| {削除確認ダイアログ} | {feature}-delete-dialog         | Dialog コンポーネント |
| {削除確定ボタン}     | {feature}-delete-confirm-button | ダイアログ内          |
| {空状態表示}         | {feature}-empty                 | 0件時                 |
| {ローディング表示}   | {feature}-loading               | 読み込み中            |
```

### 生成ルール

- UI Requirements に登場する全インタラクティブ要素を網羅
- 命名規則は `.claude/rules/data-testid.md` に従う
- 必須要素: `{feature}-list`, `{feature}-item`, `{feature}-create-button`, `{feature}-empty`, `{feature}-loading`
- ダイアログがある場合: `{feature}-delete-dialog`, `{feature}-delete-confirm-button`

---

## Error Responses（サマリ）

エラーレスポンスの概要を一覧表で記述する。詳細は openapi.yaml 参照。

### フォーマット

```markdown
## Error Responses（サマリ）

エラーレスポンスの概要。詳細は [openapi.yaml](./openapi.yaml) を参照。

| 操作   | エラーコード     | 条件                 | 備考 |
| ------ | ---------------- | -------------------- | ---- |
| {作成} | VALIDATION_ERROR | {name} が空          | -    |
| {作成} | CONFLICT         | 重複する {name}      | -    |
| {削除} | CONFLICT         | 使用中の {category}  | -    |
| {更新} | NOT_FOUND        | 対象 ID が存在しない | -    |
```

### 生成ルール

- 操作（作成/更新/削除）ごとにエラーコードを列挙
- 条件は簡潔に記述
- 詳細なステータスコード・メッセージは openapi.yaml 参照

---

## Query Parameters（サマリ）

一覧取得時のクエリパラメータ概要を記述する。詳細は openapi.yaml 参照。

### フォーマット

```markdown
## Query Parameters（サマリ）

一覧取得時のクエリパラメータ概要。詳細は [openapi.yaml](./openapi.yaml) を参照。

| パラメータ | 説明                | 備考                      |
| ---------- | ------------------- | ------------------------- |
| page       | ページネーション    | デフォルト: 1, 最大: -    |
| limit      | 1ページあたりの件数 | デフォルト: 20, 最大: 100 |
| {sort}     | ソート対象          | デフォルト: createdAt     |
| {order}    | 昇順・降順          | asc/desc                  |
| {filter}   | フィルタ条件        | 例: status=approved       |
```

### 生成ルール

- 一覧取得エンドポイントがある場合のみ記載
- 必須: `page`, `limit`
- ある場合: `sort`, `order`, フィルタ系
- デフォルト値・最大値は「備考」に記載
