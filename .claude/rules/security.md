# Security

セキュリティ要件と対策方針。

## 認証・認可

- 認証方式: **Better Auth**（Hono ミドルウェア + Prisma アダプター）、Cookie セッション
- 認可モデル: ロール不要。2ユーザーとも全リソースに同権限
- セッション有効期限: **30日**（Better Auth の `sessionMaxAge` で設定）

## CSRF / XSS 対策

- CSRF 対策: Better Auth に委ねる
- XSS 対策: SvelteKit のテンプレート自動エスケープに委ねる
- Content-Type 制限: `application/json` のみ受け付ける

## 入力検証

- バリデーション実施箇所: `@hono/standard-validator` でルートミドルウェアとして実施（→ `schemas.md` 参照）
- SQL インジェクション対策: Prisma ORM のパラメータ化クエリに委ねる

## センシティブデータ

- パスワードハッシュ化: Better Auth に委ねる（自前実装しない）
- シークレット管理: `wrangler secret put` で登録。ローカル開発は `.dev.vars`（`.gitignore` 対象）
- ログに含めてはいけない情報: パスワード・セッショントークン・認証ヘッダー（→ `error-handling.md` 参照）

## CORS 設定

- 開発環境: `http://localhost:5173`
- 本番環境: 環境変数 `ALLOWED_ORIGIN` で管理（Cloudflare Workers の環境変数）
- `credentials: true` を設定するため `origin` に wildcard（`*`）は使用不可

## サプライチェーンセキュリティ

- `npm audit` を CI で実行
- `dependency-review-action` を GitHub Actions に追加（PR 時に脆弱性・ライセンスチェック）
- `package-lock.json` は必ずコミット
- パッケージ追加の承認プロセス: 個人アプリのため不要（hook の警告で十分）

### 多層防御の実装方針

| レイヤー | タイミング | 対象 | 仕組み |
|---------|-----------|------|--------|
| L1 | 開発時 | CLI コマンド（`npm add` 等） | hook で**ブロック** |
| L2 | 開発時 | `package.json` 編集 | hook で**警告** |
| L3 | PR 時 | 全依存変更 | `dependency-review-action` が脆弱性チェック |

## Better Auth API 呼び出しの注意事項

Better Auth の POST エンドポイントを FE から呼ぶ際は、`Content-Type: application/json` と **`body: '{}'`** を必ず付与すること。

Better Auth はルーターレベルで `allowedMediaTypes: ["application/json"]` を要求するため、
ローカル（wrangler dev）では body なしだと `request.body` が空の ReadableStream になり、
`request.json()` が `SyntaxError` → 500 になる。

```ts
// ✅ 正しい（body なしのエンドポイントでも body: '{}' が必要）
await fetch(`${PUBLIC_API_BASE_URL}/api/auth/sign-out`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: '{}',
});

// ❌ 誤り（ローカル wrangler dev で 500 になる）
await fetch(`${PUBLIC_API_BASE_URL}/api/auth/sign-out`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  // body なし → wrangler dev では SyntaxError → 500
});
```

**理由**: 本番（Cloudflare Workers）では body なし → `request.body === null` → 正常動作。
ローカル（wrangler dev）では body なし → 空の ReadableStream → JSON パース失敗 → 500。

## SvelteKit 認証ナビゲーションの注意事項

ログアウト処理では `goto('/login')` の**前**にストアを変更しないこと。
`goto()` はナビゲーション完了まで現在のページを維持するため、
先にストアを変更するとレイアウトが途中で切り替わり白画面フラッシュが発生する。
`+layout.ts` の `load` がナビゲーション完了後にストアを更新するため手動変更は不要。

```ts
// ✅ 正しい
async function handleSignOut() {
  await deleteSession();
  await goto('/login');
  // load が get-session → null → currentUser.set(null) を行う
}

// ❌ 誤り（白画面フラッシュが発生する）
async function handleSignOut() {
  await deleteSession();
  currentUser.set(null); // ← ここでレイアウトが再レンダリングされ白画面に
  await goto('/login');
}
```

## 参照するスキル

- scaffold-be, scaffold-fe, review-changes
