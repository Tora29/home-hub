---
name: scaffold-contract
description: openapi.yaml から BE/FE 共通の契約ファイル（schema.ts・tables.ts・migrations）を生成する。
---

# Contract Scaffold

openapi.yaml を主入力として、BE/FE 共通の「契約ファイル」を生成するスキル。
scaffold-test-unit より先に実行し、生成物をコミットしておくことで scaffold-be / scaffold-fe の worktree から参照可能にする。

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
入力読み込み → rules 参照 → 契約ファイル生成 → コミット
```

### Step 1: 入力読み込み

以下のファイルを Read ツールで読み込む:

1. `specs/infra-spec.md` — 技術スタック、ディレクトリ構成、パスエイリアス等
2. `specs/{feature}/openapi.yaml` — エンドポイント、リクエスト/レスポンス型、スキーマ定義
3. `specs/{feature}/spec.md` — ビジネスルール（存在する場合のみ、補助参照）

### Step 2: rules 参照

| rule                            | 参照するもの                                       |
| ------------------------------- | -------------------------------------------------- |
| `.claude/rules/schemas.md`      | スキーマ命名規則、Zod v4 の記述パターン            |
| `.claude/rules/api-patterns.md` | DB アクセスパターン、Drizzle の使用方法            |
| `.claude/rules/file-headers.md` | ファイルヘッダーコメントのテンプレートと記述ルール |

### Step 3: 既存ファイルの確認

```
Glob('src/routes/{feature}/schema.ts')
Glob('src/lib/server/tables.ts')
Glob('drizzle/migrations/')
```

| 結果         | 戦略                                           |
| ------------ | ---------------------------------------------- |
| 空（新規）   | Write により全量生成する                       |
| あり（更新） | Read して現状を把握し、Edit により差分のみ更新 |

### Step 4: 契約ファイル生成

以下の3ファイルを生成する。**テストファイル・サービス層・ルートハンドラは生成しない。**

#### 1. schema.ts

openapi.yaml のリクエスト/レスポンス定義から Zod v4 バリデーションスキーマを生成する。

```
src/routes/{feature}/schema.ts
```

- `{entity}CreateSchema` / `{entity}UpdateSchema` を定義する（schemas rule 参照）
- 型エクスポート（`{Entity}Create` / `{Entity}Update`）を含める
- file-headers rule に従ったヘッダーコメントを付与する

#### 2. tables.ts への追記

openapi.yaml のスキーマ定義から Drizzle テーブル定義を生成し、`src/lib/server/tables.ts` の末尾に追記する。

- 既存テーブル定義は変更しない
- タイムスタンプカラムは `integer('...', { mode: 'timestamp' })` を使用する
- JSON 配列フィールドは `text('...')` で保存する
- 主キーは `text('id').primaryKey()`（UUID 文字列）を使用する

#### 3. マイグレーション SQL

`drizzle/migrations/` 配下の既存ファイルを確認し、次の連番で SQL ファイルを生成する。

- 例: `0001_init.sql` の次は `0002_{feature}.sql`
- SQLite の型に合わせる: `TEXT`, `INTEGER`, `REAL`, `BLOB`
- `{ mode: 'timestamp' }` は `INTEGER` カラムとして保存される

### Step 5: チェックリスト検証

- [ ] `src/routes/{feature}/schema.ts` が生成されている
- [ ] openapi.yaml の全スキーマが schema.ts に反映されている
- [ ] バリデーションルールが openapi.yaml の制約（minLength 等）と一致している
- [ ] `src/lib/server/tables.ts` にテーブル定義が追記されている（既存定義は変更していない）
- [ ] マイグレーション SQL が正しい連番で生成されている
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
