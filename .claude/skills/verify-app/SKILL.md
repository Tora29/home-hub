---
name: verify-app
description: アプリの動作を検証する。
---

# アプリケーション検証

アプリケーションが正常に動作することを確認する。

## プロジェクト構成（what-to-eat）

| レイヤー | ディレクトリ | 技術 |
|---------|------------|------|
| API | `apps/api/` | Hono + Cloudflare Workers（Wrangler） |
| Web | `apps/web/` | SvelteKit + Vite（adapter-static） |
| 共通 | `packages/shared/`, `packages/constants/` | Zod スキーマ・定数 |

ルートは npm workspaces 構成（`package.json`）。

## ワークフロー

以下を**ルートディレクトリ**（`/Users/kawakamitaiga/ghq/github.com/Tora29/what-to-eat`）から順次実行する。

### 1. Web 型チェック

```bash
cd apps/web && npm run check
```

- `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json` を実行
- **0 errors, 0 warnings** であることを確認

### 2. API 型チェック

```bash
cd apps/api && npx tsc --noEmit
```

- API には `build` スクリプトがないため `tsc --noEmit` で代替
- エラーなしを確認

### 3. Lint（フォーマット + ESLint）

```bash
npm run lint
```

- API: `eslint src`
- Web: `prettier --check . && eslint .`
- フォーマット違反があれば `npm run format` で自動修正してから再確認

```bash
# フォーマット修正が必要な場合
npm run format
npm run lint  # 再確認
```

### 4. テスト

```bash
npm run test
```

- API: Vitest（`apps/api/src/**`）
- Web: Vitest（`apps/web/src/**`）※現時点でテストファイルなし
- shared: Vitest（`packages/shared/src/**`）
- 全テスト Pass を確認

### 5. Web ビルド

```bash
npm run build:web
```

- `vite build` + `@sveltejs/adapter-static` で `apps/web/build/` に出力
- API は `wrangler deploy` が必要なため CI/ローカル検証では省略可

## E2E テスト（任意）

```bash
cd apps/web && npm run test:e2e
```

- Playwright を使用
- 事前に `wrangler dev`（localhost:8787）と `npm run dev:web`（localhost:5173）を起動する必要がある

## エラー発生時

1. エラーメッセージを確認
2. 原因を特定
3. 修正を実施
4. 当該ステップのコマンドを再実行

全てのチェックが通るまで繰り返す。

## 結果レポート形式

| チェック | 結果 |
|---------|------|
| Web 型チェック | ✅ / ❌ |
| API 型チェック | ✅ / ❌ |
| Lint | ✅ / ❌ |
| テスト | ✅ / ❌ |
| Web ビルド | ✅ / ❌ |
