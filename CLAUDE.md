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
  ↓
/scaffold-test-unit
  │ テストファイルを生成・コミット（RED）
  ↓
  ├─ /scaffold-be  ── worktree で実行（別ターミナル可）
  │   service.ts + +server.ts を生成 → main に取り込み
  │
  └─ /scaffold-fe  ── worktree で実行（別ターミナル可）
      +page.svelte + components/ を生成 → main に取り込み
  ↓（両方完了後）
/test-and-fix unit
  │ unit + integration テストを GREEN に
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

### 随時使うスキル

| スキル | タイミング |
|---|---|
| `/code-simplifier` | 実装後、リファクタリングしたいとき |
| `/spec-coverage` | 実装途中でもドリフト確認したいとき |
| `/skill-creator` | スキル自体を改善したいとき |
