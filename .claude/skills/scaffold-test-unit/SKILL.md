---
name: scaffold-test-unit
description: openapi.yaml と AC を参照して API / Unit テストを生成する。
allowed-tools: Read(specs/*), Grep, Glob, Write
---

# Unit / API Test Scaffold

openapi.yaml を主入力として、API テスト・ユニットテストを生成するスキル。

## 前提条件

- `specs/{feature}/openapi.yaml` が存在すること
- `specs/{feature}/spec.md` が存在すること（AC の参照）
- `specs/infra-spec.md` が存在すること（テストフレームワーク・コマンドの参照）
- `.claude/rules/testing.md` が定義されていること

## 起動時の挙動

スキル起動後、AskUserQuestion ツールを使って対象 feature を確認する。

```
question: "どの feature のテストを生成しますか？"
options:
  - specs/ 配下の feature ディレクトリを動的にリスト
```

## ワークフロー

```
入力読み込み → rules 参照 → AC マッピング → テスト生成 → チェックリスト検証
```

### Step 1: 入力読み込み

以下のファイルを Read ツールで読み込む:

1. `specs/infra-spec.md` — テストフレームワーク、テストコマンド、ディレクトリ構成
2. `specs/{feature}/openapi.yaml` — API エンドポイント、リクエスト/レスポンス型、ステータスコード
3. `specs/{feature}/spec.md` — AC（受入条件）

### Step 2: rules 参照

以下の rules を Read ツールで読み込み、テスト生成の規約とする:

| rule                            | 参照するもの                                                |
| ------------------------------- | ----------------------------------------------------------- |
| `.claude/rules/testing.md`      | テスト種別、モック戦略、カバレッジ方針、テスト-仕様連携形式 |
| `.claude/rules/file-headers.md` | ファイルヘッダーコメントのテンプレートと記述ルール          |

### Step 3: AC マッピング

spec.md の AC を分類し、テストケースにマッピングする:

| AC 種別            | テスト種別                         | 例                         |
| ------------------ | ---------------------------------- | -------------------------- |
| 正常系（AC-001〜） | API テスト: 成功レスポンスの検証   | GET → 200、POST → 201      |
| 異常系（AC-101〜） | API テスト: エラーレスポンスの検証 | バリデーションエラー → 400 |
| 境界値（AC-201〜） | Unit テスト / API テスト           | 最大長、空文字、特殊文字   |

### Step 4: テスト生成

#### テストケースの命名

testing rule の命名規約に従う。各テストケースに AC 番号を紐付ける:

```
[SPEC: AC-001] テスト説明
```

分割 SPEC の場合:

```
[SPEC: {domain}/AC-001] テスト説明
```

#### 生成対象

1. **API テスト** — openapi.yaml の各エンドポイントに対するリクエスト/レスポンス検証
2. **Unit テスト** — Service 層のビジネスロジック検証（必要に応じて）

テストの実行方法・フレームワークは infra-spec.md と testing rule に従う。

### Step 5: チェックリスト検証

- [ ] 全ての AC にテストケースが存在する（`[SPEC: AC-XXX]` で紐付け済み）
- [ ] openapi.yaml の全エンドポイントに対するテストが存在する
- [ ] 正常系・異常系・境界値の各カテゴリをカバーしている
- [ ] テスト命名が testing rule に従っている
- [ ] モック戦略が testing rule に従っている
- [ ] テストファイルの配置が infra-spec.md のディレクトリ構成に従っている
- [ ] 全生成ファイルに file-headers rule に従ったヘッダーコメントが付与されている

## テスト生成の原則

### 仕様からテストを導出する

- テストケースは AC の機械的変換であること
- **実装コードを読んではいけない**。openapi.yaml と spec.md のみを入力とする
- 実装の内部構造に依存しない（ブラックボックステスト）
- テストが仕様を検証する手段であり、実装に合わせて甘くしない

### AC とテストの紐付け

- 全てのテストケースに `[SPEC: AC-XXX]` を付与
- 1つの AC に対して複数のテストケースを持つことは可
- AC なしのテスト（インフラレベルのテスト等）は `[SPEC: AC-XXX]` なしで可

### テスト堅牢性ガイドライン

生成するテストが「甘いテスト」にならないための指針:

| ガイドライン         | 悪い例                                    | 良い例                                    |
| -------------------- | ----------------------------------------- | ----------------------------------------- |
| 具体的な値をアサート | `expect(res.status).toBeDefined()`        | `expect(res.status).toBe(201)`            |
| リスト件数は具体値   | `expect(items.length).toBeGreaterThan(0)` | `expect(items.length).toBe(3)`            |
| 不正値の拒否も検証   | 正常系のみ                                | 正常系 + 不正値で 400 を確認              |
| フィールド値まで検証 | `expect(body).toHaveProperty('title')`    | `expect(body.title).toBe('テストタスク')` |
| 境界値を網羅         | 中間値のみ                                | 下限-1, 下限, 上限, 上限+1                |

## 出力先

infra-spec.md で定義されたディレクトリ構成に従う。
