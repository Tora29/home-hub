---
name: test-and-fix
description: テストを実行し、失敗したテストを自動修正する。
---

# テスト実行と自動修正

テストを実行し、失敗した場合は原因を分析して修正する。

## プロジェクト構成（what-to-eat）

| テスト種別 | 対象 | ツール |
|-----------|------|--------|
| Unit Test | Service 層・ユーティリティ | Vitest |
| API Test | Hono ルートの I/O | Vitest（Service 層をモック） |
| E2E Test | ユーザー操作シナリオ | Playwright |

テストファイルは**テスト対象と同ディレクトリ（コロケーション）**に配置する。

## テストコマンド

ルートディレクトリ（`/Users/kawakamitaiga/ghq/github.com/Tora29/what-to-eat`）から実行:

```bash
npm run test          # Unit + API テスト全体（workspaces 一括）
```

個別実行（`apps/api/` または `packages/shared/` 内で）:

```bash
npm run test          # Vitest run
npm run test:watch    # Watch モード
```

## ワークフロー

### 1. テスト実行

```bash
npm run test
```

### 2. 失敗時の分析

- エラーメッセージとスタックトレースで問題箇所を特定
- 期待値と実際の値の差分を確認

### 3. 修正の実装

失敗原因に応じて対処:

| 失敗原因 | 対処 |
|---------|------|
| 実装のバグ | 実装を修正（テストは正しいと仮定） |
| テストの期待値が仕様と乖離 | テストを仕様（spec.md の AC）に合わせて更新 |
| モックの設定ミス | モック設定を修正（後述のモック方針を参照） |

### 4. 再テスト

修正後、再度 `npm run test` を実行。全て通るまで繰り返す。

## モック方針

| モック対象 | 方法 |
|-----------|------|
| Prisma（DB） | `vitest-mock-extended` でモック |
| Service 層（API テスト用） | `vi.mock('../../services/...')` |
| 外部 API（Workers AI 等） | `vi.mock` |
| Zod スキーマ・純粋関数 | **モックしない** |

## テスト記述規約

```ts
// AC 番号を必ず先頭に付ける
test("[AC-001] 料理一覧が取得できる", async () => { ... })
test("[AC-101] 存在しない ID の場合 404 を返す", async () => { ... })
```

AC 番号の採番ルール（`.claude/rules/testing.md` 参照）:
- 正常系: `AC-001〜099`
- 異常系: `AC-101〜199`
- 境界値: `AC-201〜299`

## E2E テスト（任意）

```bash
cd apps/web && npm run test:e2e
```

事前に以下を起動:
- `npm run dev:api`（localhost:8787）
- `npm run dev:web`（localhost:5173）

## 参照ルール

- テスト規約: `.claude/rules/testing.md`
- data-testid 命名規則: `.claude/rules/data-testid.md`
