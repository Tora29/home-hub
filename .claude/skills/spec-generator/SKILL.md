---
name: spec-generator
description: ユーザーの雑なメモや要望、または既存の設計書（PDF/Excel/Word）から構造化された spec.md を生成する。設計書がある場合は設計書変換モードで起動する。
---

# Spec Generator

API 要件が含まれる場合は openapi.yaml も同時に生成する。

## 起動時の挙動

スキル起動後、**必ず最初に** AskUserQuestion で入力モードを確認する:

```
question: "spec の生成元を選択してください"
options:
  - "メモ・要望から生成（新規）": 機能概要を対話形式で整理して spec を生成
  - "既存の設計書から変換（PDF/Excel/Word）": 設計書を読み込んで spec に変換
```

#### メモモードの場合

直接テキストで確認する:

```
どのような機能の spec を生成しますか？
雑なメモでOKですが、以下が含まれているとスムーズに進みます:
- 機能の目的（何ができるようになるか）
- 扱うデータの項目（例: タイトル、ステータス、期限）
- 必要な操作（一覧表示、作成、編集、削除 等）
- API が必要な場合はその旨も教えてください（openapi.yaml も生成します）
```

→ Step 1 へ

#### 設計書モードの場合

ファイルパスを直接テキストで確認する:

```
設計書のファイルパスを入力してください。
対応形式: PDF / Excel (.xlsx) / Word (.docx) / Markdown / テキスト / URL
```

→ Step 0.5 へ

## ワークフロー

```
入力モード判定 → [設計書読込 | メモ収集] → Feature Name決定 → フォーマット判定 → spec 生成 → openapi.yaml 生成（該当時） → 確認
```

### Step 0.5: 設計書読み込み（設計書モードのみ）

ファイルパス・URL を受け取り、形式に応じて読み込む:

| 形式                    | 処理方法                                                                    |
| ----------------------- | --------------------------------------------------------------------------- |
| `.pdf` / `.md` / `.txt` | Read ツールで直接読み込み                                                   |
| `.xlsx` / `.xls`        | `Bash: python .claude/skills/spec-generator/scripts/extract_xlsx.py {path}` |
| `.docx`                 | `Bash: python .claude/skills/spec-generator/scripts/extract_docx.py {path}` |
| `http://` / `https://`  | WebFetch                                                                    |

スクリプトは初回実行時に `.venv` を自動セットアップする（Python 3 が必要）。

読み込んだテキストを以下のマッピングで解析し、spec.md 各セクションの素材に変換する:

| 設計書の要素             | spec.md のセクション               |
| ------------------------ | ---------------------------------- |
| 機能概要・目的           | Overview                           |
| 画面仕様・操作フロー     | UI Requirements                    |
| データ項目・テーブル定義 | Overview（概念説明）+ openapi.yaml |
| ユースケース・シナリオ   | User Stories + AC                  |
| API 仕様                 | API Endpoints + openapi.yaml       |
| 非機能要件               | NFR                                |

→ 抽出後、Step 1.5 の充足度チェックで**不足項目のみ**追加質問する。

### Step 1: 入力収集

ユーザーから以下を受け取る（すべて任意、雑でOK）:

- 機能の概要（雑なメモ、箇条書き、会話形式など）
- 対象ユーザー
- 制約条件

### Step 1.5: 入力充足度チェック

Step 1 の入力を以下のチェックリストで評価し、不足があれば質問を繰り返す。

#### 最低限チェックリスト

| #   | チェック項目     | 充足の目安                                                          | 質問例                                                                                                               |
| --- | ---------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | 機能の目的       | 何を実現する機能か 1 文以上で説明できる                             | 「この機能で最終的にユーザーが何をできるようになりますか？」                                                         |
| 2   | 主要エンティティ | 少なくとも 1 つのエンティティが特定でき、ドメインの概念が説明できる | 「扱うデータにはどんな項目がありますか？（例: タイトル、ステータス、期限 等）openapi.yaml のスキーマ定義に使います」 |
| 3   | ユーザー操作     | 主要な操作（作成/表示/編集/削除 等）のうちどれが必要か特定できる    | 「ユーザーはこのデータに対してどんな操作をしますか？（一覧表示、新規作成、編集、削除 等）」                          |

#### ルール

- **設計書モードの場合**: Step 0.5 で抽出済みの項目はスキップし、不足分のみ質問する
- 1 回の質問で聞くのは**未充足の項目のみ**（既に分かっていることは聞かない）
- 質問はテキストで直接行う（AskUserQuestion は選択式のため不向き）
- ユーザーが「おまかせ」「適当に決めて」と言った場合 → Claude が妥当なデフォルトを提案し、確認を取ってから進む
- 最大 3 ラウンドの質問で収束しない場合 → 収集できた情報で spec を生成し、不足箇所に `[TODO: 要確認]` マーカーを付与する

### Step 2: Feature Name決定

URLパスとして使える形式で命名:

- kebab-case または単数形/複数形の名詞
- 例: `tasks`, `user-settings`, `todo-items`

### Step 2.5: フォーマット判定

入力からドメイン（エンティティ）の数を判定:

- **ドメインが1つ** → 単一ファイル spec.md（従来通り）
- **ドメインが2つ以上** → 分割を提案

AskUserQuestion で確認:

```
question: "この機能には複数のドメイン（{domain1}, {domain2}...）が含まれます。ドメインごとに spec を分割しますか？"
options:
  - "分割する（推奨）": specs/{feature}/spec.md（インデックス）+ 各ドメイン.md
  - "単一ファイル": specs/{feature}/spec.md に全て記述
```

### Step 3: spec 生成

#### 単一ファイルの場合

`references/spec-template.md` に従い生成。

#### 分割ファイルの場合

1. `specs/{feature}/spec.md` を `references/spec-index-template.md` に従い生成
2. 各ドメインファイル `specs/{feature}/{domain}.md` を `references/spec-template.md` に従い生成
   - NFR セクションは省略（インデックスに集約）
   - AC 番号はドメインごとに AC-001 から採番（テストで `[SPEC: {domain}/AC-001]` として参照）

### Step 3.5: openapi.yaml 生成（API 要件がある場合のみ）

ユーザーの入力に API 要件（エンドポイント、データの CRUD 等）が含まれる場合:

1. spec.md の API 要件から OpenAPI 3.0 仕様の YAML を生成
2. `specs/{feature}/openapi.yaml` に出力
3. spec.md 内から openapi.yaml を参照するリンクを追加

#### tags の付与ルール（必須）

生成する openapi.yaml には必ず `tags` を定義し、各 operation に付与する。

- トップレベルに `tags:` セクションを定義する
- エンドポイントのグループ（リソース種別）ごとに tag を作成する
- 命名: kebab-case で feature 名または resource 名を使う（例: `expense`, `expense-categories`, `recipes`）
- 各 operation には `tags: [{tag_name}]` を付与する

```yaml
tags:
  - name: tasks
    description: タスク管理
  - name: task-comments
    description: タスクコメント

paths:
  /tasks:
    get:
      tags: [tasks]
      summary: タスク一覧取得
  /task-comments:
    post:
      tags: [task-comments]
      summary: コメント投稿
```

tags がないと Swagger UI で全エンドポイントが `default` グループに表示されてしまうため必須。

API 要件がない場合はこのステップをスキップする。

生成後、以下の docker-compose.yml を `docker compose up` で起動すると Swagger UI で確認できることをユーザーに伝える:

```yaml
services:
  swagger-ui:
    image: swaggerapi/swagger-ui
    ports:
      - '8080:8080'
    environment:
      SWAGGER_JSON: /specs/openapi.yaml
    volumes:
      - ./specs/{feature_name}:/specs:ro
```

### Step 3.7: AC 品質チェック

生成した AC が以下の品質基準を満たすか自己チェックし、満たさない場合は修正してから Step 4 に進む:

| チェック項目           | NG 例                        | OK 例                                          |
| ---------------------- | ---------------------------- | ---------------------------------------------- |
| 具体的な値/条件がある  | 「適切なエラーが表示される」 | 「"タイトルは必須です" エラーが表示される」    |
| 期待値が明記されている | 「一覧が表示される」         | 「作成済みのタスクが新しい順で一覧表示される」 |
| 境界条件が具体的       | 「長い文字列でエラー」       | 「101文字以上でバリデーションエラー」          |
| エラー条件が明確       | 「不正な入力でエラー」       | 「title が空の場合 400 エラー」                |

曖昧な AC は曖昧なテストを生む。入口で品質を確保する。

### Step 4: 確認

生成した spec をユーザーに確認し、必要に応じて修正。

### Step 5: 次のステップ案内

spec の確認が完了したら、以下の SDD フローを案内する:

```
1. /scaffold-test-unit  → spec.md / openapi.yaml を元にユニット・インテグレーションテストを生成
2. /scaffold-be         → openapi.yaml を元にバックエンド実装（+server.ts / service.ts / schema.ts）を生成
3. /scaffold-fe         → spec.md を元にフロントエンド実装（+page.svelte / components）を生成
4. /scaffold-test-e2e   → spec.md の AC を元に E2E テストを生成
```

> テストファーストで進める場合は `/scaffold-test-unit` から始めることを推奨する。

## 生成ルール

### Acceptance Criteria生成ルール

| 原則                         | 説明                                       |
| ---------------------------- | ------------------------------------------ |
| テスト可能であること         | 曖昧な表現（「適切に」「正しく」）を避ける |
| Given-When-Then 形式         | 前提条件、操作、期待結果を明確に           |
| ID を振る                    | `AC-001` 形式でテストコードと紐付け可能に  |
| 正常系・異常系・境界値を網羅 | 最低限のカバレッジを確保                   |

### AC 番号の採番ルール

#### 単一ファイル spec

- 従来通り: AC-001〜（正常系）, AC-101〜（異常系）, AC-201〜（境界値）
- テスト参照: `[SPEC: AC-001]`

#### 分割 spec

- 各ドメインファイル内で AC-001 から独立採番
- テスト参照にドメインプレフィックスを付与: `[SPEC: task/AC-001]`
- ファイルヘッダーの `@covers` タグも同形式: `@covers task/AC-001, task/AC-002`

### API Endpoints生成ルール

| 原則                         | 説明                                          |
| ---------------------------- | --------------------------------------------- |
| RESTful 設計                 | リソース名は複数形、HTTP メソッドで操作を表現 |
| 一覧・詳細・作成・更新・削除 | CRUD を基本として必要なものを選択             |
| レスポンス型を明記           | 成功時の型を記載                              |

## 日本語/英語の使い分け

| 項目                     | 言語   |
| ------------------------ | ------ |
| User Stories             | 日本語 |
| Acceptance Criteria      | 日本語 |
| Schema コメント          | 日本語 |
| バリデーションメッセージ | 日本語 |
| Overview                 | 日本語 |
| UI Requirements          | 日本語 |

## 出力先

### 単一ファイル

```
specs/{feature_name}/spec.md
```

例: `specs/tasks/spec.md`

### 分割ファイル

```
specs/{feature_name}/
├── spec.md          # インデックス
├── {domain1}.md     # ドメイン1
└── {domain2}.md     # ドメイン2
```

例: `specs/projects/spec.md`, `specs/projects/task.md`, `specs/projects/member.md`

### openapi.yaml（API 要件がある場合）

```
specs/{feature_name}/openapi.yaml
```

## リソース

- テンプレート: `references/spec-template.md`
- インデックステンプレート: `references/spec-index-template.md`（分割時）
