---
name: spec-sync
description: spec と実装の値ドリフトをインタラクティブに解決する。
---

# Spec Sync — 値ドリフト解決

spec.md / openapi.yaml と実装コードの間で検出された値ドリフトを、インタラクティブに解決するスキル。

## 前提条件

- 対象 feature の `spec.md`（`specs/{feature}/spec.md`）と実装が存在すること
- `/spec-coverage` の実行結果（値ドリフト一覧）があると効率的だが、なくても単独で実行可能

## 起動時の挙動

AskUserQuestion で対象 feature を確認する。

## ワークフロー

### Step 1: ドリフト検出

spec.md / openapi.yaml と実装コードを比較し、値ドリフトを検出する。

#### 1-1: ファイル収集

プロジェクトのディレクトリ構造に従い、以下のファイルを収集:

- **spec**: `specs/{feature}/spec.md`
- **openapi**: `specs/{feature}/openapi.yaml`
- **スキーマ定義**: プロジェクトのディレクトリ構造に従う
- **API ハンドラ / ルート**: プロジェクトのディレクトリ構造に従う

#### 1-2: スキーマ値ドリフトの検出

spec.md / openapi.yaml のフィールド定義と実装のスキーマ定義を比較。

**検出対象:**

| 比較項目 | spec 側 | 実装側 | 例 |
|---------|---------|--------|-----|
| 制約値 | max: 20 | max(30) | 文字数上限の不一致 |
| 型 | string | number | 型の不一致 |
| 必須/任意 | required | optional | 必須性の不一致 |
| デフォルト値 | default: "active" | default: "pending" | 初期値の不一致 |
| ステータスコード | 201 | 200 | API レスポンスの不一致 |
| 定数/Enum 値 | ["draft", "published"] | ["draft", "review", "published"] | 列挙値の不一致 |

#### 1-3: API エンドポイント値ドリフトの検出

spec.md / openapi.yaml の API 定義と実装のルーティングを比較し、ステータスコードやレスポンス形式の差分を検出。

#### 1-4: 実装先行ドリフトの検出

実装で spec と異なる値/制約が設定されているケースを検出。
spec 側が古い（実装が先行して変更された）可能性のあるドリフトを特定する。

- 実装にあるが spec にない Enum 値 → `🔀 値ドリフト（実装先行）`
- 実装の制約が spec より緩い/厳しい → `🔀 値ドリフト（実装先行）`

---

### Step 2: ドリフト一覧の提示

検出された全ドリフトを一覧表示する:

```markdown
### 検出された値ドリフト

| # | 対象 | spec の値 | 実装の値 | 方向 |
|---|------|----------|---------|------|
| 1 | taskCreateSchema.title.max | 20 | 30 | spec → 実装 |
| 2 | taskSchema.status enum | ["active","done"] | ["active","in_progress","done"] | 実装先行 |
```

ドリフトが検出されなかった場合は、その旨を報告して終了する。

---

### Step 3: インタラクティブ解決

各ドリフトについて AskUserQuestion でユーザーに解決方針を問いかける。

#### 3-1: 解決方針の確認

```
question: "{対象} の値が spec と実装で異なります。spec: {spec_value} / 実装: {impl_value} — どちらが正しいですか？"
options:
  - "spec が正（実装を修正）": spec の値を正とし、実装の修正をアクションに追加
  - "実装が正（spec を更新）": 実装の値を正とし、spec の更新をアクションに追加
  - "スキップ": この差分を今は解決しない
```

ドリフトが複数ある場合は、まとめて 1 回の AskUserQuestion で問いかけてもよい（最大 4 件ずつ）。

#### 3-2: ファイル修正の実行

ユーザーの回答に基づき、対象ファイルを修正する:

- 「spec が正」→ 実装ファイルの該当箇所を spec の値に修正
- 「実装が正」→ spec.md / openapi.yaml の該当箇所を実装の値に更新
- 「スキップ」→ 何もしない

---

### Step 4: 解決アクションレポート

```markdown
## Spec Sync レポート: {feature}

### サマリー

| 項目 | 件数 |
|------|------|
| 検出されたドリフト | N 件 |
| 解決済み（実装を修正） | X 件 |
| 解決済み（spec を更新） | Y 件 |
| スキップ | Z 件 |

### 解決済みアクション

| # | 対象 | 方針 | 修正内容 |
|---|------|------|---------|
| 1 | taskCreateSchema.title.max | 実装を修正 | `_schemas/task.ts` の max を 30 → 20 に変更 |
| 2 | taskSchema.status enum | spec を更新 | `specs/tasks/spec.md` の status enum に "in_progress" を追加 |

### スキップされたドリフト

| # | 対象 | spec の値 | 実装の値 |
|---|------|----------|---------|
| 3 | POST /api/tasks status | 201 | 200 |

> 💡 スキップされたドリフトは次回 `/spec-coverage` で再検出されます。
```
