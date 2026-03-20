---
name: verify-app
description: アプリの動作を検証する。
---

# アプリケーション検証

SvelteKit + Cloudflare Workers (D1) 構成のアプリが正常に動作することを確認する。

## 前提条件（推奨）

- テストが通っていること（`/test-and-fix` 完了済み）

## ワークフロー

以下を**この順序で**実行する。いずれかが失敗した場合は修正してから次へ進む。

### 1. 型チェック

```bash
npm run check
```

`svelte-check` + TypeScript によるエラーが 0 件であることを確認する。

### 2. フォーマット・Lint チェック

```bash
npm run lint
```

Prettier と ESLint の両方を検査する。フォーマットエラーがある場合は `npm run format` で自動修正してから再確認する。

### 3. ユニットテスト実行

```bash
npm run test:unit -- --run
```

Vitest によるユニット・インテグレーションテストを単発実行する。

- Zod スキーマ Unit テスト（`schema.test.ts`）
- API ハンドラ Unit テスト（`+server.test.ts`）
- サービス層 Integration テスト（`service.integration.test.ts`）: Cloudflare D1 バインディングを使用

失敗したテストは `/test-and-fix` で修正する。

### 4. ビルド

```bash
npm run build
```

`adapter-cloudflare` による本番ビルドが成功することを確認する。

### 5. E2E テスト（必要に応じて）

```bash
npm run test:e2e
```

Playwright による E2E テスト。`vite preview`（port 4173）が対象。テストが存在する場合のみ実行する。

## エラー発生時

1. エラーメッセージを確認して原因を特定する
2. 修正を実施する
3. 該当ステップから再実行する

全チェックが通るまで繰り返す。
