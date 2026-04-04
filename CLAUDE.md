## コミット・プッシュのルール

コミット・プッシュは `/commit-push-pr` スキル経由でのみ行う。スキルを使わず直接実行しない。

## スキルフロー

新機能を実装する際は以下の順序でスキルを実行する。

```
/spec-generator
  │ spec.md + openapi.yaml を生成
  ↓
/scaffold-contract
  │ schema.ts + tables.ts + migrations を生成・コミット
  │ ← ここが be / fe / test-unit の共通 worktree ベース
  ↓
  ├─ /scaffold-be        ── worktree で実行（別ターミナル可）
  │   service.ts + +server.ts を生成 → main に取り込み
  │
  ├─ /scaffold-fe        ── worktree で実行（別ターミナル可）
  │   +page.svelte + components/ を生成 → main に取り込み
  │
  └─ /scaffold-test-unit ── worktree で実行（別ターミナル可）
      テストファイルを生成 → main に取り込み
  ↓（3つの取り込み完了後）
/test-and-fix unit
  │ be / fe / test-unit の不整合を吸収して unit + integration を GREEN に
  ↓
/scaffold-test-e2e
  │ E2E テストを生成
  ↓
/test-and-fix all
  │ unit + integration + e2e テストを GREEN に
  ↓
/spec-coverage
  │ spec と実装の値ドリフトを検出
  ↓（ドリフトがある場合）
/spec-sync
  │ ドリフトをインタラクティブに解消
  ↓
/verify-app
  │ 型チェック → Lint → 全テスト → ビルド
  ↓
/commit-push-pr
```

> **並列化の根拠**: be / fe / test-unit はいずれも `spec.md` + `openapi.yaml` を入力とし、互いの成果物を参照しない。ズレは `/test-and-fix` が吸収する。

### 随時使うスキル

| スキル             | タイミング                         |
| ------------------ | ---------------------------------- |
| `/code-simplifier` | 実装後、リファクタリングしたいとき |
| `/spec-coverage`   | 実装途中でもドリフト確認したいとき |
| `/skill-creator`   | スキル自体を改善したいとき         |
