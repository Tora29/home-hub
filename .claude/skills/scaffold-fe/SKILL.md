---
name: scaffold-fe
description: spec.md と rules/ を参照してフロントエンド実装コードを生成する。
---

# Frontend Scaffold

spec.md を主入力として、フロントエンド実装コードを生成するスキル。

## 前提条件

- `specs/{feature}/spec.md` が存在すること
- `specs/infra-spec.md` が存在すること（技術スタック・ディレクトリ構成の参照）
- `.claude/references/ui-patterns.md` が存在すること
- `.claude/rules/` に schemas, data-testid, security が定義されていること
- （推奨）BE 実装が完了していること（API エンドポイントが利用可能）

## 起動時の挙動

スキル起動後、AskUserQuestion ツールを使って対象 feature を確認する。

```
question: "どの feature の FE コードを生成しますか？"
options:
  - specs/ 配下の feature ディレクトリを動的にリスト
```

## ワークフロー

```
入力読み込み → rules 参照 → コード生成 → チェックリスト検証
```

### Step 1: 入力読み込み

以下のファイルを Read ツールで読み込む:

1. `specs/infra-spec.md` — 技術スタック、ディレクトリ構成、スタイリング方針等
2. `specs/{feature}/spec.md` — 画面仕様、UI Requirements、AC（受入条件）
3. `specs/{feature}/openapi.yaml` — API 型参照（存在する場合のみ）

### Step 2: rules 参照

以下の rules を Read ツールで読み込み、コード生成の規約とする:

| rule                                | 参照するもの                                             |
| ----------------------------------- | -------------------------------------------------------- |
| `.claude/references/ui-patterns.md` | コンポーネント分割、状態管理、命名規則、アクセシビリティ |
| `.claude/rules/schemas.md`          | FE バリデーション方針、スキーマ配置                      |
| `.claude/rules/data-testid.md`      | テスト用セレクタの命名規則                               |
| `.claude/rules/security.md`         | XSS 対策、入力検証                                       |
| `.claude/rules/file-headers.md`     | ファイルヘッダーコメントのテンプレートと記述ルール       |

### Step 3: コード生成

spec.md の画面仕様・UI Requirements に基づき、infra-spec.md のディレクトリ構成に従って以下を生成:

1. **ページコンポーネント** — spec.md の画面構成に対応するメインコンポーネント
2. **部品コンポーネント** — ui-patterns rule の分割基準に従い、責務ごとに分割
3. **FE スキーマ** — schemas rule に従い、FE バリデーション用スキーマを定義
4. **data-testid の付与** — data-testid rule の命名テーブルに従い、全インタラクティブ要素に付与

生成するファイルの配置場所は infra-spec.md のディレクトリ構成に従う。

### Step 4: チェックリスト検証

生成したコードが以下を満たしているか自己検証:

- [ ] spec.md の UI Requirements が全て実装されている
- [ ] spec.md の AC に対応する UI フローが存在する
- [ ] コンポーネント分割が ui-patterns rule に従っている
- [ ] FE バリデーションが schemas rule に従っている
- [ ] 全インタラクティブ要素に data-testid が付与されている
- [ ] data-testid の命名が data-testid rule のテーブルに従っている
- [ ] アクセシビリティ要件が ui-patterns rule に従っている
- [ ] ディレクトリ構成が infra-spec.md に従っている
- [ ] 全生成ファイルに file-headers rule に従ったヘッダーコメントが付与されている
- [ ] **テストファイルを一切編集・削除していない**

## 生成ルール

### コンポーネント分割

- ui-patterns rule の分割基準に従う
- CRUD パターンの場合: List / Item / Form に分割を検討
- 分割後も data-testid を維持

### FE バリデーション

- schemas rule の FE/BE 役割分担に従う
- FE はあくまで UX 向上の補助。BE が Single Source of Truth

### API 呼び出し

- openapi.yaml で定義された型に合わせる
- エラーハンドリングは API レスポンスのエラー型に従う

## 出力先

infra-spec.md で定義されたディレクトリ構成に従う。
