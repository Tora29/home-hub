# Security

SvelteKit + Cloudflare Pages（`adapter-cloudflare` による Worker 実行）構成におけるセキュリティ規約。

---

## 認証・認可

- **認証方式**: Better Auth（Google OAuth の `signIn.social()` のみ。email/password は未設定）+ Cookie セッション
- **認可モデル**: `ALLOWED_EMAILS`（環境変数、カンマ区切り）に含まれるメールアドレスのみサインアップ可能な二人（夫婦）専用アプリ。
  照合は小文字化して完全一致。**未設定・空の場合は全員拒否（fail-closed）**。許可リスト系の判定は常に fail-closed で実装する
  判定は**サインアップ時（`user.create.before`）とセッション作成時（`session.create.before`）の両方**で行い、
  許可リストから外したユーザーは既存アカウントでもログインできない。
  `user.role`（`'main'` | `'partner'` | `null`）でユーザーごとに機能を出し分ける（例: `/workout` 配下は `role=main` 限定）。
  role は `hooks.server.ts` が `locals.role` に注入し、`MAIN_ONLY_PREFIXES` のパスは **API も含めて** hooks で 403 にする
  （画面だけ隠して API を素通しにしない）。全ルートに認証を必須とする点は変わらない
- **セッション管理**:
  - 有効期限: 30日（`src/lib/server/auth.ts` の `session.expiresIn`、単位は秒）
  - セッション情報は `hooks.server.ts` で `locals.user` / `locals.session` に注入
  - 公開パス: `PUBLIC_PATHS`（`hooks.server.ts` で管理する `Set`。`/login` と PWA 用静的ファイルを**完全一致**で判定）。
    `/api/auth/*` は `PUBLIC_PATHS` より前に Better Auth へ委譲される
  - 新たに公開パスを追加する場合は `PUBLIC_PATHS` にのみ追記する。前方一致（`startsWith`）は `/login-xxx` 等の
    意図しないパスまで公開するため使わない
- **認証チェックをハンドラに書かない**: `hooks.server.ts` が一括で保証済み

---

## セキュリティヘッダー

2 箇所で同一ヘッダーを付与する。

| 経路                                    | 対象                                  | 理由                                                                                  |
| --------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------- |
| `hooks.server.ts` の `SECURITY_HEADERS` | SSR ページ・`+server.ts` のレスポンス | `_headers` は Pages Functions（Worker）生成のレスポンスに**適用されない**（公式仕様） |
| `_headers`（プロジェクトルート）        | 静的アセット                          | Worker を経由しない静的ファイル配信用                                                 |

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
```

- ヘッダーを追加・変更する場合は **`hooks.server.ts` と `_headers` の両方**を更新する
- **HSTS**: Cloudflare ダッシュボードの SSL/TLS → Edge Certificates でも設定可能。変更時はダッシュボード側と矛盾しないか確認する
- **CSP（Content Security Policy）は現状未設定**: Svelte のトランジションはインライン `<style>` を生成するため
  `style-src` は指定しないか `'unsafe-inline'` が必要（SvelteKit 公式ドキュメント記載）。
  導入する場合は `svelte.config.js` の `kit.csp`（nonce/hash 自動付与）で `script-src` / `frame-ancestors 'none'` のみを
  絞る方式とし、`style-src` は制限しない

---

## CSRF / XSS 対策

### CSRF

- **JSON API のみ提供**。SvelteKit の form action は使用しない
- SvelteKit 標準の `csrf.checkOrigin`（デフォルト有効）が、`application/x-www-form-urlencoded` / `multipart/form-data` /
  `text/plain` のクロスオリジン POST/PUT/PATCH/DELETE を 403 で拒否する。**`svelte.config.js` で無効化しない**
- `application/json` のクロスオリジンリクエストは CORS プリフライトが必要なため、CORS ヘッダーを返さない限り成立しない
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

値の置き場所は **開発 = `.dev.vars`、本番 = GitHub Secrets** の 2 つだけ。

```
.dev.vars ─────────────────────────────→ ローカルのアプリ（platform.env）
GitHub Secrets TF_VAR_* → terraform.yml → Cloudflare Pages secrets → 本番アプリ（platform.env）
```

| 本番アプリの変数            | GitHub Secret（唯一の定義元）      |
| --------------------------- | ---------------------------------- |
| `BETTER_AUTH_URL`           | `TF_VAR_BETTER_AUTH_URL`（※）      |
| `BETTER_AUTH_SECRET`        | `TF_VAR_BETTER_AUTH_SECRET`        |
| `GOOGLE_CLIENT_ID`          | `TF_VAR_GOOGLE_CLIENT_ID`          |
| `GOOGLE_CLIENT_SECRET`      | `TF_VAR_GOOGLE_CLIENT_SECRET`      |
| `ALLOWED_EMAILS`            | `TF_VAR_ALLOWED_EMAILS`            |
| `LINE_CHANNEL_ACCESS_TOKEN` | `TF_VAR_LINE_CHANNEL_ACCESS_TOKEN` |
| `LINE_USER_ID_PRIMARY`      | `TF_VAR_LINE_USER_ID_PRIMARY`      |
| `LINE_USER_ID_SPOUSE`       | `TF_VAR_LINE_USER_ID_SPOUSE`       |

※ `BETTER_AUTH_URL` は現状コード未使用（`hooks.server.ts` が `event.url` から baseURL を生成）。削除する場合は下記 5 箇所をまとめて外す。

| CI 用 GitHub Secret                                               | 用途                                                                                                       |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`                  | deploy（`wrangler pages deploy`）。`CLOUDFLARE_ACCOUNT_ID` は Terraform（account_id・R2 endpoint）でも使用 |
| `TF_VAR_CLOUDFLARE_API_TOKEN`                                     | Terraform の Cloudflare provider                                                                           |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` / `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Terraform state（R2 backend）                                                                              |

- **Terraform の plan / apply は GitHub Actions でのみ実行する**。ローカルに `terraform.tfvars` を作らない（本番値の重複・端末への残留を防ぐ）
  - PR で `fmt` / `validate` / `plan`、main マージで `apply`
  - Secret の値だけ変えた場合は Actions 画面から `Terraform` workflow を手動実行（`workflow_dispatch`）して反映する
  - ローカルでは `make tf-check`（fmt / validate のみ・本番値不要）だけ使う
- Pages secrets を**ダッシュボードで手動追加・編集しない**（次回 apply で Terraform の値に上書きされる）
- 変数を追加する場合は `terraform/variables.tf`・`terraform/main.tf`・`modules/pages`・`terraform.yml` の `env`・上表 の 5 箇所を更新し、
  `gh secret set TF_VAR_XXX` で値を登録してからマージする
- 空値だと機能停止する変数（`BETTER_AUTH_SECRET` / `GOOGLE_CLIENT_*` / `ALLOWED_EMAILS` 等）には `validation` で空文字を拒否する
  （GitHub Secret 未登録時、`${{ secrets.X }}` は空文字になるため）
- Secret の値は GitHub からも読み出せない（書き込み専用）。元の値は Google Cloud Console・LINE Developers 等の発行元で管理する
- シークレットをコード・コメント・ログに書かない

### パスワード

現状 Google OAuth のみ使用しており、パスワード認証は未設定（`emailAndPassword` 未設定）。
`tables.ts` の `Account.password` カラムは Better Auth の標準スキーマとして存在するが、常に null。
将来 email/password を有効化する場合は Better Auth が内部で `scrypt`（デフォルト）でハッシュ化する。パスワード平文をコードで扱わない。

### ログ禁止情報

`console.error()` 等のログに含めてはいけない情報（→ `api-patterns.md` のロギングルール参照）:

- パスワード（平文・ハッシュともに不要）
- セッショントークン（`Session.token`）
- `BETTER_AUTH_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN` などのシークレット値

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

依存パッケージの追加は「開発時」「マージ時」「定期」の段階で検知する。

> 現状の `.claude/hooks/pre-commit-checks.sh` は **`git commit` 時に `.env` 系・`.dev.vars` 系ファイルのステージングをブロックするのみ**。
> L1 / L2 は未実装のため、実装するまではパッケージ追加を L3（レビュー）で確認する。

| レイヤー | タイミング | 対象                        | 仕組み                                                      | 設定ファイル             |
| -------- | ---------- | --------------------------- | ----------------------------------------------------------- | ------------------------ |
| L1       | 開発時     | `npm add` 等の CLI コマンド | **未実装**（Claude Code の PreToolUse hook で検知する想定） | —                        |
| L2       | 開発時     | `package.json` の直接編集   | **未実装**（PostToolUse hook で警告する想定）               | —                        |
| L3       | マージ時   | コードレビュー              | `package.json` / `package-lock.json` の差分を人間が確認     | —                        |
| L4       | 定期       | 既存依存の更新              | Dependabot が週次で npm / GitHub Actions の更新 PR 作成     | `.github/dependabot.yml` |

> `dependency-review-action` は未導入。追加する場合は `.github/workflows/dependency-review.yml` を作成する。

### 更新の運用

- Dependabot は月 1 回（npm / github-actions / terraform）。パッチ・マイナーを 1 PR にまとめ、メジャーはパッケージごとの個別 PR で届く（`.github/dependabot.yml`）
- 脆弱性の修正は Dependabot security updates（リポジトリ設定で有効）が頻度に関係なく PR を作る
- 開発者の npm は `min-release-age=7`（ユーザー設定）で公開 7 日未満の版を入れない。`npm install` が `ETARGET` になったら 7 日経過済みの版を指定する
- 依存の peer 制約で**保留中のメジャー更新**（`.github/dependabot.yml` の `ignore` で PR を作らせない。制約が解けたら `ignore` から外して上げる）

| パッケージ                                | 保留理由                                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| `vitest` / `@vitest/browser-playwright` 5 | `@cloudflare/vitest-pool-workers`（integration テスト）が `vitest ^4.1` のみ対応         |
| `typescript` 7                            | `@sveltejs/kit` / `svelte-check` が `^5 \|\| ^6`、`typescript-eslint` が `<6.1` のみ対応 |
| `@types/node` 23 以上                     | 上げない。型は `engines.node`（`>=22`）の最小版に合わせる                                |

- `npm audit` の残存（上流未修正・dev のみ）: `drizzle-kit` 内の旧 `esbuild`（moderate）、`@sveltejs/kit` 内の `cookie`（low）
- `package.json` の `overrides`: `miniflare` が完全一致で固定する `sharp` / `undici` を修正版に上げている（`@cloudflare/vitest-pool-workers` が旧 `wrangler` / `miniflare` を固定しているため）。同梱版が修正版以上になったら外す

---

## なぜ必要か

- 実装時にセキュリティ規約を一貫して適用するため
- コードレビュー・監査時にセキュリティ観点で参照する基準
