# Testing

テスト戦略と実装規約。

## テスト種別と境界

### Unit Test（Vitest）
- **対象**: Service 層 + ユーティリティ
- **モック方針**: Prisma は `vitest-mock-extended` でモック。D1 バインディングは直接使わない

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

- Prisma: `vitest-mock-extended` でモック
- 外部API（Workers AI 等）: vi.mock でモック
- **モックしないもの**: Zod スキーマ・純粋関数ユーティリティ

## カバレッジ方針

- 目標: **行・ブランチ・関数すべて 80%**
- CI での強制: しない（参考値として計測のみ）
- 計測ツール: Vitest の組み込みカバレッジ（`@vitest/coverage-v8`）

## テストコマンド

| コマンド | 内容 |
|---------|------|
| `npm run test` | Unit + API テスト（Vitest） |
| `npm run test:unit` | Unit テストのみ |
| `npm run test:api` | API テストのみ |
| `npm run test:e2e` | E2E テスト（Playwright） |
| `npm run test:watch` | Watch モード（Unit + API） |

## 参照するスキル

- scaffold-test-unit, scaffold-test-e2e, test-and-fix, spec-coverage
