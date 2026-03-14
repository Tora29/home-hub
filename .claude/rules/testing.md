# Testing

テスト戦略と実装規約。

## テスト種別と境界

### Unit Test（Vitest）
- **対象**: Service 層 + ユーティリティ
- **モック方針**: Prisma は `vi.fn()` / `vi.mock()` でモック。D1 バインディングは直接使わない

### API Test（Vitest）
- **対象**: Hono ルートのリクエスト形式・レスポンス形式・ステータスコード検証
- **DB の扱い**: Service 層をモック（ルートの I/O のみテスト）

### E2E Test（Playwright）
- **環境**: `wrangler dev --local`（BE: `localhost:8787`）+ `npm run dev`（FE: `localhost:5173`）を起動し Playwright から接続
- **対象**: ユーザー操作シナリオ全体（AC に対応したフロー）

## テスト-仕様連携

- AC 紐付け形式: `test("[AC-001] ...")` 形式
- テストファイル配置: **コロケーション**（テスト対象ファイルと同ディレクトリ）

```ts
// 例
test("[AC-001] 料理一覧が表示される", async () => { ... })
test("[AC-101] 名前が空の場合エラーを表示する", async () => { ... })
```

## モック戦略

- Prisma: `vi.fn()` / `vi.mock()` でモック
- 外部API（Workers AI 等）: `vi.mock` でモック
- **モックしないもの**: Zod スキーマ・純粋関数ユーティリティ

## カバレッジ方針

- 目標: **行・ブランチ・関数すべて 80%**
- CI での強制: しない（参考値として計測のみ）
- 計測ツール: Vitest の組み込みカバレッジ（`@vitest/coverage-v8`）

## テストコマンド

| コマンド | 内容 |
|---------|------|
| `npm run test` | 全テスト（workspaces 一括） |
| `cd apps/api && npm run test` | API の Unit + API テスト（Vitest） |
| `cd apps/web && npm run test` | Web のテスト（Vitest） |
| `cd apps/web && npm run test:e2e` | E2E テスト（Playwright） |
| `cd apps/api && npm run test:watch` | API Watch モード |

## 参照するスキル

- scaffold-test-unit, scaffold-test-e2e, test-and-fix, spec-coverage
