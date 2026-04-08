---
name: verify-app
description: アプリの動作を検証する。
effort: low
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

必ずこの順序で実行する（format → lint）。

```bash
npm run format && npm run lint
```

`npm run format` で自動修正してから `npm run lint` で検査する。
`npm run lint` は ESLint の処理に時間がかかるためバックグラウンド実行になる場合がある。
その場合は完了通知を待つ。**同じコマンドを再試行しない。**

### 3. 全テスト実行

```bash
npm run test
```

Unit・Integration・E2E の全テストを実行する。失敗したテストは `/test-and-fix` で修正する。

### 4. ビルド

```bash
npm run build
```

`adapter-cloudflare` による本番ビルドが成功することを確認する。

## エラー発生時

1. エラーメッセージを確認して原因を特定する
2. 修正を実施する
3. 該当ステップから再実行する

全チェックが通るまで繰り返す。
