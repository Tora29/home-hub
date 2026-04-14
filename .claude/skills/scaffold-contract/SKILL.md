---
name: scaffold-contract
description: openapi.yaml から BE/FE 共通の契約ファイル（schema.ts・tables.ts・migrations）を生成する。既存テーブルとのドリフト（カラム変更・テーブル廃止）を検出してユーザー確認後に tables.ts を更新し、対応する migration SQL を生成する機能も含む。
---

# Contract Scaffold

openapi.yaml を主入力として、BE/FE 共通の「契約ファイル」を生成するスキル。
新規追加だけでなく、既存テーブルとのドリフト検出・更新・削除にも対応する。

## 前提条件

- `specs/{feature}/openapi.yaml` が存在すること
- `specs/infra-spec.md` が存在すること（ディレクトリ構成・DB 設定の参照）
- `.claude/rules/` に schemas, api-patterns が定義されていること

## 起動時の挙動

スキル起動後、AskUserQuestion ツールを使って対象 feature を確認する。

```
question: "どの feature の契約ファイルを生成しますか？"
options:
  - specs/ 配下の feature ディレクトリを動的にリスト
```

## ワークフロー

```
入力読み込み → rules 参照 → ドリフト検出 → ユーザー確認 → 契約ファイル生成 → コミット
```

### Step 1: 入力読み込み

以下のファイルを Read ツールで読み込む:

1. `specs/infra-spec.md` — 技術スタック、ディレクトリ構成、パスエイリアス等
2. `specs/{feature}/openapi.yaml` — エンドポイント、リクエスト/レスポンス型、スキーマ定義
3. `specs/{feature}/spec.md` — Schema Definition・Database Constraints セクションを重点的に参照

### Step 2: rules 参照

| rule                            | 参照するもの                                       |
| ------------------------------- | -------------------------------------------------- |
| `.claude/rules/schemas.md`      | スキーマ命名規則、Zod v4 の記述パターン            |
| `.claude/rules/api-patterns.md` | DB アクセスパターン、Drizzle の使用方法            |
| `.claude/rules/file-headers.md` | ファイルヘッダーコメントのテンプレートと記述ルール |

### Step 3: ドリフト検出

```
Glob('src/routes/{feature}/schema.ts')
Glob('src/lib/server/tables.ts')
Glob('drizzle/migrations/')
```

既存の `tables.ts` を Read して、openapi.yaml のスキーマ定義と比較する。
spec.md の Schema Definition・Database Constraints セクションも参照し、設計意図を把握する。

#### 変更候補の分類

| 分類             | 判定基準                                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **新規追加**     | openapi.yaml に定義があるが tables.ts に対応テーブルが存在しない                                                                                                   |
| **テーブル更新** | 両方に存在するが、カラム構成が異なる（追加・変更・削除）                                                                                                           |
| **テーブル削除** | tables.ts に存在するが openapi.yaml に対応スキーマがなく、かつ Better Auth テーブル（user, session, account, verification）および他 feature のテーブルに該当しない |

> 削除候補の判定は openapi.yaml との比較のみで行う。spec.md への「使用しない」注記は不要。

#### ユーザーへの確認

変更候補が1件でもある場合は **AskUserQuestion** で確認を取る。

```
変更候補の概要を提示する形式（例）:

【新規追加】
  - ExpenseCategory テーブル
  - Expense テーブル

【テーブル更新】
  - User: role カラム追加、lineUserId カラム追加
  - Expense: payerId → payerUserId にリネーム、status カラム追加、approvedAt/finalizedAt カラム削除

【テーブル削除】
  - ExpensePayer テーブル（spec.md に「使用しない」旨の記載あり）

question: "上記の変更を tables.ts に適用しますか？"
options:
  - "すべて適用する"
  - "選択して適用する"（→ 個別に確認）
  - "新規追加のみ（更新・削除はスキップ）"
```

ユーザーが「新規追加のみ」を選んだ場合は従来通り追記のみ行い、更新・削除はスキップする。

### Step 4: 契約ファイル生成

確認済みの変更セットに基づき、以下の3種類のファイルを生成する。

#### 1. schema.ts

openapi.yaml のリクエスト/レスポンス定義から Zod v4 バリデーションスキーマを生成する。

```
src/routes/{feature}/schema.ts
```

- `{entity}CreateSchema` / `{entity}UpdateSchema` を定義する（schemas rule 参照）
- 型エクスポート（`{Entity}Create` / `{Entity}Update`）を含める
- file-headers rule に従ったヘッダーコメントを付与する

#### 2. tables.ts の更新

変更分類に応じて処理を分ける。

| 分類         | tables.ts への操作                                            |
| ------------ | ------------------------------------------------------------- |
| 新規追加     | ファイル末尾に `sqliteTable(...)` を追記する                  |
| テーブル更新 | 該当テーブルの定義を Read → Edit で差分更新する               |
| テーブル削除 | 該当 `export const xxx = sqliteTable(...)` ブロックを削除する |

**カラム変更の対応方針**:

| カラム変更の種類 | tables.ts の操作                  |
| ---------------- | --------------------------------- |
| カラム追加       | プロパティを追記                  |
| カラム削除       | プロパティを削除                  |
| カラムリネーム   | プロパティ名・カラム名を更新      |
| 型変更           | `.text()` / `.integer()` 等を更新 |

**変更してはいけないもの**: 更新・削除対象でないテーブルの定義は一切変更しない。

#### 3. マイグレーション SQL

`drizzle/migrations/` 配下の既存ファイルを確認し、次の連番で SQL ファイルを生成する。

変更分類に応じた SQL を生成する（Cloudflare D1 = SQLite 3.44+ 互換）:

```sql
-- 新規テーブル追加
CREATE TABLE IF NOT EXISTS NewTable (
  id TEXT PRIMARY KEY,
  ...
);

-- カラム追加
ALTER TABLE Expense ADD COLUMN status TEXT NOT NULL DEFAULT 'unapproved';

-- カラムリネーム（SQLite 3.25+）
ALTER TABLE Expense RENAME COLUMN payerId TO payerUserId;

-- カラム削除（SQLite 3.35+）
ALTER TABLE Expense DROP COLUMN approvedAt;
ALTER TABLE Expense DROP COLUMN finalizedAt;

-- 外部キー参照先の変更（SQLite は ALTER TABLE で FK 変更不可）
-- → カラムリネーム後、アプリ層で参照先を user.id として扱う
--   FK 制約は新規テーブルのみ有効。既存カラムの FK 制約変更は不要

-- テーブル削除
DROP TABLE IF EXISTS ExpensePayer;
```

> **SQLite の制約**: 外部キー制約の変更は `ALTER TABLE` では行えない。
> カラムリネームで参照先を実質変更する場合（`payerId` → `payerUserId`）、
> アプリコードが新しいカラム名で `user.id` を参照するよう変更することで対応する。
> Drizzle の `references()` 定義は tables.ts 側で更新する。

### Step 5: チェックリスト検証

- [ ] `src/routes/{feature}/schema.ts` が生成されている
- [ ] openapi.yaml の全スキーマが schema.ts に反映されている
- [ ] バリデーションルールが openapi.yaml の制約（minLength 等）と一致している
- [ ] `src/lib/server/tables.ts` の変更が確認済み変更セットと一致している
- [ ] 更新・削除対象でないテーブル定義が変更されていない
- [ ] マイグレーション SQL が正しい連番で生成されている
- [ ] 変更種別（ADD / ALTER / DROP）に応じた SQL が含まれている
- [ ] 全生成ファイルに file-headers rule に従ったヘッダーコメントが付与されている
- [ ] テストファイル・service.ts・+server.ts・+page.svelte 等を**一切生成していない**

### Step 6: コミット

scaffold-test-unit / scaffold-be / scaffold-fe が参照するベースとなるため、**必ずコミットする**。

```bash
git add src/routes/{feature}/schema.ts
git add src/lib/server/tables.ts
git add drizzle/migrations/
git commit -m "feat({feature}): schema・tables・migrations を追加"
```

- コミットメッセージは Conventional Commits 形式
- テストファイル・実装ファイル（service.ts 等）はこのコミットに含めない

### Step 7: 次のステップ案内

```
契約ファイルの生成とコミットが完了しました。
次のステップ: `/scaffold-test-unit` を実行してテストを生成してください。
```

## 出力先

infra-spec.md で定義されたディレクトリ構成に従う。
