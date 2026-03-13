# SDD (Spec-Driven Development) テンプレート

Spec-Driven Development メソドロジーのテンプレートリポジトリ。
特定の言語・フレームワークに依存せず、SDD のコア（仕様フォーマット、スキルワークフロー、ルールカテゴリ）を提供する。

## SDD とは

「仕様を正とし、実装とテストを仕様から導出する」開発手法。

- 人間が **spec.md** と受入条件を定義
- AI が実装・テスト・ドキュメントを生成
- テストコードが spec と実装の接着剤

```
仕様（人間が書く = 正）
  ├─→ テスト生成（仕様の機械的変換）
  └─→ 実装生成
         ↓
      テスト実行 = 仕様を満たしている証明
```

---

## 使い方

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd <project-name>
```

### 2. インフラ仕様の定義

`specs/infra-spec.md` を作成し、プロジェクトの技術スタックとディレクトリ構成を定義する。

```markdown
# Infrastructure Spec

## Tech Stack
| Layer | Technology |
|-------|-----------|
| FE | React / Vue / Svelte / ... |
| BE | Express / Spring Boot / FastAPI / ... |
| DB | PostgreSQL / MySQL / ... |
| Test | Jest / Vitest / pytest / ... |

## Directory Structure
（プロジェクト固有のディレクトリ構成を記述）
```

### 3. rules/ の定義

`.claude/rules/` 配下のカテゴリガイドファイルを、プロジェクトの技術スタックに合わせて具体的な規約で埋める。

| ファイル | 定義すること |
|---------|-------------|
| `api-patterns.md` | レスポンス形式、ステータスコード規約 |
| `error-handling.md` | エラー分類、ハンドリング戦略 |
| `schemas.md` | バリデーション方針、スキーマ配置 |
| `testing.md` | テスト種別、カバレッジ方針 |
| `security.md` | 認証認可、CSRF/XSS 対策 |
| `ui-patterns.md` | コンポーネント設計、状態管理 |
| `data-testid.md` | E2E テスト用セレクタ命名規則 |

### 4. 開発開始

#### スキル間データフロー

各スキルの入出力の関係を示す。上から順に実行するが、`prototype` と品質管理系は任意のタイミングで利用できる。

```
[/spec-generator]  ←── ユーザーのメモ（雑なメモで OK）
     │
     ├── specs/{feature}/spec.md
     └── specs/{feature}/openapi.yaml
              │
     ┌────────┤
     │        │
     ↓        ↓
[/prototype]   [/scaffold-be]  ←── infra-spec.md + rules/
  ↓               │
HTML プロトタイプ  [/scaffold-test-unit]
（ブラウザで確認）   │
                  [/test-and-fix]  ←── テスト実行・失敗箇所を自動修正
                       │
              [/scaffold-fe]  ←── spec.md + infra-spec.md + rules/
                       │
              [/scaffold-test-e2e]
                       │
              [/test-and-fix]
                       │
              [/verify-app]   ──── 型チェック・lint・ビルド
                       │
              [/commit-push-pr]

── 品質管理（任意のタイミングで実行） ──────────────────
  /review-changes    ← git diff を対象にコードレビュー
  /spec-coverage     ← spec ↔ 実装の整合性分析（4 層チェック）
  /spec-sync         ← spec-coverage で検出した値ドリフトを対話解決
  /code-simplifier   ← 重複除去・コンポーネント分割
```

#### スキル選択ガイド

| 目的 | 使うスキル |
|------|-----------|
| まず動くモックを見たい | `/spec-generator` → `/prototype` |
| BE を実装したい | `/scaffold-be` → `/scaffold-test-unit` → `/test-and-fix` |
| FE を実装したい | `/scaffold-fe` → `/scaffold-test-e2e` → `/test-and-fix` |
| 仕様と実装のズレを確認したい | `/spec-coverage` → `/spec-sync` |
| コードをきれいにしたい | `/code-simplifier` → `/review-changes` |
| コミット・PR を作りたい | `/commit-push-pr` |

---

## ディレクトリ構成

```
.
├── CLAUDE.md                     # プロジェクトルール（SDD メソドロジー）
├── README.md                     # このファイル
├── specs/
│   ├── infra-spec.md             # インフラ全体像（利用者が作成）
│   └── {feature}/
│       ├── spec.md               # 画面仕様・AC
│       └── openapi.yaml          # API 契約
└── .claude/
    ├── rules/                    # プロジェクト固有ルール（7カテゴリ + learning）
    ├── skills/                   # スキル定義（11スキル）
    └── hooks/                    # Git hooks
```

## スキル一覧

| # | スキル | 説明 | 主入力 |
|---|--------|------|--------|
| 1 | `/spec-generator` | spec.md + openapi.yaml を生成 | ユーザーのメモ |
| 2 | `/prototype` | spec.md から単一 HTML プロトタイプを生成 | spec.md |
| 3 | `/scaffold-be` | BE 実装を生成 | openapi.yaml |
| 4 | `/scaffold-fe` | FE 実装を生成 | spec.md |
| 5 | `/scaffold-test-unit` | API / Unit テストを生成 | openapi.yaml |
| 6 | `/scaffold-test-e2e` | E2E テストを生成 | spec.md |
| 7 | `/test-and-fix` | テスト実行・自動修正 | テスト結果 |
| 8 | `/verify-app` | 型チェック・lint・ビルド確認 | - |
| 9 | `/commit-push-pr` | コミット・プッシュ・PR | - |
| 10 | `/review-changes` | コードレビュー | git diff |
| 11 | `/spec-coverage` | spec ↔ 実装の整合性分析（4 層）| spec.md |
| 12 | `/spec-sync` | spec-coverage で検出した値ドリフトを解決 | spec-coverage 結果 |
| 13 | `/code-simplifier` | コード整理・簡潔化 | - |
| 14 | `/skill-creator` | プロジェクト固有スキルを作成 | - |

## 関連ドキュメント

- [CLAUDE.md](./CLAUDE.md) - プロジェクトルール（SDD メソドロジー）
