---
name: scaffold-fe
description: spec.md と rules/ を参照してフロントエンド実装コードを生成する。
---

# Frontend Scaffold

spec.md を主入力として、フロントエンド実装コードを生成するスキル。

## 前提条件

- `specs/{feature}/spec.md` が存在すること
- `specs/infra-spec.md` が存在すること（技術スタック・ディレクトリ構成の参照）
- `.claude/references/design-system.md` が存在すること
- `.claude/rules/` に schemas, data-testid, security が定義されていること
- `/scaffold-test-unit` が実行済みであること（テストが存在すること）
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

| rule                                  | 参照するもの                                             |
| ------------------------------------- | -------------------------------------------------------- |
| `.claude/references/design-system.md` | カラートークン、フォント、形状・レイアウト、アイコン規約 |
| `.claude/rules/schemas.md`            | FE バリデーション方針、スキーマ配置                      |
| `.claude/rules/data-testid.md`        | テスト用セレクタの命名規則                               |
| `.claude/rules/security.md`           | XSS 対策、入力検証                                       |
| `.claude/rules/file-headers.md`       | ファイルヘッダーコメントのテンプレートと記述ルール       |

### Step 3: 既存ファイルの確認

Glob で対象 feature のファイル存在を確認し、生成戦略を決定する:

```
Glob('src/routes/{feature}/**/*.ts')
Glob('src/routes/{feature}/**/*.svelte')
```

| 結果 | 戦略 |
|---|---|
| 空（新規） | Read しない。Step 4 で Write により全量生成する |
| あり（更新） | 対象 feature のファイルのみ Read して現状を把握する。Step 4 で Edit により差分のみ更新する |

**他 feature のファイルは新規・更新を問わず一切 Read しない。**

### Step 4: コード生成

spec.md の画面仕様・UI Requirements に基づき、infra-spec.md のディレクトリ構成に従って以下を生成:

1. **ページコンポーネント** — spec.md の画面構成に対応するメインコンポーネント
2. **部品コンポーネント** — spec.md の画面構成に基づき、責務ごとに分割
3. **FE スキーマ** — schemas rule に従い、FE バリデーション用スキーマを定義
4. **data-testid の付与** — data-testid rule の命名テーブルに従い、全インタラクティブ要素に付与

生成するファイルの配置場所は infra-spec.md のディレクトリ構成に従う。

### Step 4: チェックリスト検証

生成したコードが以下を満たしているか自己検証:

- [ ] spec.md の UI Requirements が全て実装されている
- [ ] spec.md の AC に対応する UI フローが存在する
- [ ] コンポーネント分割が spec.md の画面構成に従っている
- [ ] FE バリデーションが schemas rule に従っている
- [ ] 全インタラクティブ要素に data-testid が付与されている
- [ ] data-testid の命名が data-testid rule のテーブルに従っている
- [ ] アクセシビリティ要件が適切に実装されている
- [ ] ディレクトリ構成が infra-spec.md に従っている
- [ ] 全生成ファイルに file-headers rule に従ったヘッダーコメントが付与されている
- [ ] **テストファイルを一切編集・削除していない**

### Step 5: 次のステップ案内

チェックリスト完了後、以下をユーザーに表示する:

```
FE 実装が完了しました。
次のステップ:
1. `/test-and-fix` を実行してテストを GREEN にしてください。
2. GREEN になったら `/spec-coverage` でドリフトを確認してください。
3. ドリフトがあれば `/spec-sync` で解消してください。
4. `/verify-app` でアプリの動作を確認してください。
5. 問題なければ `/commit-push-pr` でコミット・PR を作成してください。
```

## 生成ルール

### コンポーネント分割

- spec.md の画面構成・責務に基づき分割する
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
