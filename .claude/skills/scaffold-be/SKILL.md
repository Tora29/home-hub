---
name: scaffold-be
description: openapi.yaml と rules/ を参照してバックエンド実装コードを生成する。
---

# Backend Scaffold

openapi.yaml を主入力として、バックエンド実装コードを生成するスキル。

## 前提条件

- `specs/{feature}/openapi.yaml` が存在すること
- `specs/infra-spec.md` が存在すること（技術スタック・ディレクトリ構成の参照）
- `.claude/rules/` に api-patterns, error-handling, schemas, security が定義されていること
- `/scaffold-test-unit` が実行済みであること（テストが RED の状態で存在すること）

## 起動時の挙動

スキル起動後、AskUserQuestion ツールを使って対象 feature を確認する。

```
question: "どの feature の BE コードを生成しますか？"
options:
  - specs/ 配下の feature ディレクトリを動的にリスト
```

## ワークフロー

```
入力読み込み → rules 参照 → コード生成 → チェックリスト検証
```

### Step 1: 入力読み込み

以下のファイルを Read ツールで読み込む:

1. `specs/infra-spec.md` — 技術スタック、ディレクトリ構成、パスエイリアス等
2. `specs/{feature}/openapi.yaml` — API エンドポイント、リクエスト/レスポンス型、ステータスコード
3. `specs/{feature}/spec.md` — ビジネスルール（存在する場合のみ、補助参照）

### Step 2: rules 参照

以下の rules を Read ツールで読み込み、コード生成の規約とする:

| rule                              | 参照するもの                                          |
| --------------------------------- | ----------------------------------------------------- |
| `.claude/rules/api-patterns.md`   | レスポンス形式、ステータスコード、Controller パターン |
| `.claude/rules/error-handling.md` | エラー分類、Result Pattern、ロギング                  |
| `.claude/rules/schemas.md`        | バリデーション方針、スキーマ配置、FE/BE 役割          |
| `.claude/rules/security.md`       | 認証認可、入力検証、CORS                              |
| `.claude/rules/file-headers.md`   | ファイルヘッダーコメントのテンプレートと記述ルール    |

### Step 3: コード生成

openapi.yaml のエンドポイント定義に基づき、infra-spec.md のディレクトリ構成に従って以下を生成:

1. **DB テーブル定義** — openapi.yaml のスキーマ → Drizzle テーブル定義を `src/lib/server/tables.ts` に追記
2. **マイグレーション SQL** — `drizzle/migrations/` 配下の既存ファイルの連番で `{n}_{feature}.sql` を生成（integration test の Miniflare が参照するため必須）
3. **スキーマ定義** — openapi.yaml の型定義 → バリデーションスキーマ（schemas rule 参照）
4. **Service 層** — ビジネスロジック + DB 操作（error-handling rule 参照）
5. **Controller / Routes** — HTTP ハンドラ（api-patterns rule 参照）

生成するファイルの配置場所は infra-spec.md のディレクトリ構成に従う。

#### DB テーブル定義の生成ルール

- `src/lib/server/tables.ts` の末尾に追記する（既存テーブル定義は変更しない）
- タイムスタンプカラムは `integer('...', { mode: 'timestamp' })` を使用する（既存テーブルに合わせる）
- JSON 配列フィールド（ingredients, steps 等）は `text('...')` で保存し、service 層で parse/stringify する
- 主キーは `text('id').primaryKey()`（UUID 文字列）を使用する

#### マイグレーション SQL の生成ルール

- `drizzle/migrations/` 配下の既存ファイルを確認し、次の連番を使う（例: `0001_init.sql` の次は `0002_{feature}.sql`）
- SQLite の型に合わせる: `TEXT`, `INTEGER`, `REAL`, `BLOB`
- Drizzle の `{ mode: 'timestamp' }` は SQLite では `INTEGER` カラムとして保存される

### Step 4: チェックリスト検証

生成したコードが以下を満たしているか自己検証:

- [ ] `tables.ts` にテーブル定義が追記されている（既存定義は変更していない）
- [ ] マイグレーション SQL が正しい連番で生成されている
- [ ] openapi.yaml の全エンドポイントが実装されている
- [ ] リクエスト/レスポンス型が openapi.yaml と一致している
- [ ] ステータスコードが openapi.yaml と一致している
- [ ] バリデーションが schemas rule に従っている
- [ ] エラーハンドリングが error-handling rule に従っている
- [ ] セキュリティが security rule に従っている
- [ ] ディレクトリ構成が infra-spec.md に従っている
- [ ] 全生成ファイルに file-headers rule に従ったヘッダーコメントが付与されている
- [ ] **テストファイルを一切編集・削除していない**

### Step 5: 次のステップ案内

チェックリスト完了後、以下をユーザーに表示する:

```
BE 実装が完了しました。
次のステップ:
1. `/test-and-fix` を実行してテストを GREEN にしてください。
2. GREEN になったら `/scaffold-fe` を実行して FE 実装を生成してください。
```

## 生成ルール

### Controller は薄く保つ

- HTTP ハンドラ、バリデーション、Service 呼び出し、レスポンス返却のみ
- ビジネスロジックは Service 層に委譲

### スキーマは openapi.yaml から導出

- Create / Update / Patch / Response の各スキーマを定義
- schemas rule の命名規則・配置規約に従う

### エラーハンドリング

- error-handling rule で定義されたパターンに従う
- エラーコード体系を統一

## 出力先

infra-spec.md で定義されたディレクトリ構成に従う。
