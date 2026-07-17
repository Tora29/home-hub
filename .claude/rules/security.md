# Security

SvelteKit + Cloudflare Workers (Pages) 構成におけるセキュリティ規約。

---

## 認証・認可

- **認証方式**: Better Auth（Google OAuth の `signIn.social()` のみ。email/password は未設定）+ Cookie セッション
- **認可モデル**: `ALLOWED_EMAILS`（環境変数、カンマ区切り）に含まれるメールアドレスのみサインアップ可能な二人（夫婦）専用アプリ。
  `user.role`（`'main'` | `'partner'` | `null`）でユーザーごとに機能を出し分ける（例: `workoutExercise` は `role=main` 限定）。
  全ルートに認証を必須とする点は変わらない
- **セッション管理**:
  - 有効期限: 30日（`src/lib/server/auth.ts` の `session.expiresIn`、単位は秒）
  - セッション情報は `hooks.server.ts` で `locals.user` / `locals.session` に注入
  - 公開パス: `PUBLIC_PATHS`（`hooks.server.ts` で管理。`/api/auth` / `/login` に加え PWA 用の
    `manifest.webmanifest` / `apple-touch-icon.png` / `favicon` を含む）
  - 新たに公開パスを追加する場合は `PUBLIC_PATHS` にのみ追記する
- **認証チェックをハンドラに書かない**: `hooks.server.ts` が一括で保証済み

---

## セキュリティヘッダー

`_headers（プロジェクトルート）` で全ページに適用している。

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

- **HSTS の設定経路について**: Cloudflare は HSTS を `_headers` ではなくダッシュボードの SSL/TLS → Edge Certificates の専用トグルで設定することを推奨している（DNS がプロキシ経由でない場合 `_headers` 経由のヘッダー注入自体が効かない）。現状 `_headers` に記載している点は動作上問題ないが、変更する際はダッシュボード側の設定も確認する
- **CSP（Content Security Policy）は設定しない**: Svelte のトランジション（`transition:` 等）が生成するインラインスタイルと競合するため（`style-src` を `unsafe-inline` にする必要が生じる）。Tailwind 自体はビルド時に静的CSSへ変換されるため直接の競合要因ではない
- ヘッダーを追加・変更する場合は `_headers（プロジェクトルート）` を編集する

---

## CSRF / XSS 対策

### CSRF

- **JSON API のみ提供**。SvelteKit の form action は使用しない
- `Accept: text/html` か否かで「画面遷移 vs API 呼び出し」を判別し、未認証時のレスポンスを切り替える（`hooks.server.ts` 参照）。
  これは SvelteKit 標準機能ではなくこのプロジェクト固有の実装
- Better Auth が `/api/auth/*` の CSRF 対策（Origin検証・`SameSite=Lax` Cookie・Fetch Metadataヘッダー確認）を内部で処理する。
  信頼するオリジンは `baseURL`（`auth.ts` に `event.url` から動的に渡す）がデフォルトで使われる。
  追加のオリジンを信頼させたい場合のみ `trustedOrigins` を明示設定する（現状は未設定）

### XSS

- Svelte のテンプレートエンジンが自動エスケープする。`{@html}` は使用しない
- ユーザー入力をそのまま DOM に書き出す処理を書かない

---

## 入力検証

- **全ての入力を `+server.ts` で Zod v4 によって検証する**（→ `schemas.md` 参照）
- フロントエンドのバリデーションは UX 補助であり、信頼しない
- SQL インジェクション: Drizzle ORM のパラメータ化クエリのみ使用。生の SQL 文字列連結を書かない
- ファイルアップロード機能は現時点で未実装。追加する際は `security.md` に規約を追記する

---

## センシティブデータ

### シークレット管理

| シークレット            | 管理場所                              |
| ----------------------- | ------------------------------------- |
| `BETTER_AUTH_SECRET`    | Cloudflare Pages の環境変数（暗号化） |
| `GOOGLE_CLIENT_SECRET`  | Cloudflare Pages の環境変数（暗号化） |
| `CLOUDFLARE_API_TOKEN`  | GitHub Actions Secrets                |
| `CLOUDFLARE_ACCOUNT_ID` | GitHub Actions Secrets                |

- ローカル開発では `.dev.vars`（`.gitignore` 済み）に記述する
- シークレットをコード・コメント・ログに書かない

### パスワード

現状 Google OAuth のみ使用しており、パスワード認証は未設定（`emailAndPassword` 未設定）。
`tables.ts` の `Account.password` カラムは Better Auth の標準スキーマとして存在するが、常に null。
将来 email/password を有効化する場合は Better Auth が内部で `scrypt`（デフォルト）でハッシュ化する。パスワード平文をコードで扱わない。

### ログ禁止情報

`console.error()` 等のログに含めてはいけない情報（→ `error-handling.md` 参照）:

- パスワード（平文・ハッシュともに不要）
- セッショントークン（`Session.token`）
- `BETTER_AUTH_SECRET` などのシークレット値

---

## CORS 設定

- 本プロジェクトは Cloudflare Pages の単一オリジンで運用するため、クロスオリジンリクエストは発生しない
- Better Auth のセッション Cookie は `SameSite` 属性で管理される（過去にクロスオリジン Cookie 問題が発生し修正済み）
- 明示的な CORS ヘッダーを `+server.ts` に追加しない

---

## サプライチェーンセキュリティ

### 基本方針

- `package-lock.json` は必ずコミットする。CI では `npm ci` を使用する
- 新しいパッケージを追加する前に用途・メンテナンス状況・ライセンスを確認する
- 不要になったパッケージはすぐに削除する

### 多層防御

依存パッケージの追加は「開発時」と「マージ時」の 2 段階で検知する。

| レイヤー | タイミング | 対象                        | 仕組み                                                  | 設定ファイル                         |
| -------- | ---------- | --------------------------- | ------------------------------------------------------- | ------------------------------------ |
| L1       | 開発時     | `npm add` 等の CLI コマンド | hook でブロック → ターミナルで直接実行して回避          | `.claude/hooks/pre-commit-checks.sh` |
| L2       | 開発時     | `package.json` の直接編集   | hook で警告（systemMessage）→ 編集は許可                | `.claude/hooks/pre-commit-checks.sh` |
| L3       | マージ時   | コードレビュー              | `package.json` / `package-lock.json` の差分を人間が確認 | —                                    |

> `dependency-review-action` は未導入。追加する場合は `.github/workflows/dependency-review.yml` を作成する。

---

## なぜ必要か

- 実装時にセキュリティ規約を一貫して適用するため
- audit-rules スキルがコード監査時にセキュリティ観点で参照する基準
