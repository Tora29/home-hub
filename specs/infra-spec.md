# Infrastructure Spec

## Tech Stack

| レイヤー       | 技術                                                | 備考                                                                               |
| -------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| FE             | SvelteKit v5 (`adapter-cloudflare`) + Tailwind CSS  | SSR + クライアントサイド                                                           |
| アイコン       | `@lucide/svelte`                                    | Svelte 5 専用。                                                                    |
| BE             | SvelteKit `+server.ts` + `service.ts`               | `+server.ts` が API エンドポイント、`service.ts` がビジネスロジック・DB 操作を担う |
| DB             | Cloudflare D1（SQLite）                             |                                                                                    |
| ORM            | Drizzle ORM + `drizzle-orm/d1`                      | `platform.env.DB` 経由でアクセス。エッジ環境ファースト設計                         |
| バリデーション | Zod v4                                              | `routes/{feature}/schema.ts` でコロケーション管理（FE/BE 共通）                    |
| テスト         | Vitest（Unit/API）+ Playwright（E2E）               |                                                                                    |
| AI             | Cloudflare Workers AI（llama-3.1）                  | `platform.env.AI` 経由でアクセス                                                   |
| Hosting        | Cloudflare Pages（Workers 統合）                    | FE/BE を単一アプリとしてデプロイ                                                   |
| 認証           | Better Auth（SvelteKit hooks + Drizzle アダプター） |                                                                                    |
| パッケージ管理 | npm（単一パッケージ）                               |                                                                                    |

---

## ディレクトリ構成

コロケーション方針：機能に関連するファイル（スキーマ・サービス・コンポーネント）は `routes/{feature}/` 配下にまとめて配置する。

```
src/
├── routes/
│   ├── +layout.svelte               # 全体レイアウト
│   ├── +page.svelte                 # トップページ
│   ├── layout.css
│   └── {feature}/
│       ├── (actions)/                                  # アクション系エンドポイント（URL に影響しない・任意）
│       │   └── {action}/
│       │       ├── +server.ts
│       │       └── server.test.ts                      # コロケーション
│       ├── [id]/                                       # 任意
│       │   ├── (actions)/
│       │   │   └── {action}/
│       │   │       ├── +server.ts
│       │   │       └── server.test.ts                  # コロケーション
│       │   ├── +server.ts
│       │   └── server.test.ts                          # コロケーション
│       ├── _lib/                                       # ビジネスロジック（SvelteKit ルーター無視）
│       │   ├── schema.ts                               # FE/BE 共通: Zod スキーマ
│       │   ├── schema.test.ts                          # Unit テスト（コロケーション）
│       │   ├── service.ts                              # BE: ビジネスロジック・DB 操作
│       │   ├── service.integration.test.ts             # Integration テスト（コロケーション）
│       │   └── types.ts
│       ├── components/
│       │   ├── {ComponentName}.svelte                  # FE: 機能固有コンポーネント
│       │   └── {ComponentName}.svelte.test.ts          # Unit テスト（コンポーネントと同階層）
│       ├── +page.svelte                                # FE: 画面
│       ├── +page.server.ts                             # FE: SSR load / form actions
│       ├── +server.ts                                  # BE: API エンドポイント（一覧・作成）
│       ├── page.svelte.test.ts                         # Unit テスト（画面コンポーネント）
│       ├── page.server.integration.test.ts             # Integration テスト（load 関数）
│       └── server.test.ts                              # Unit テスト（API ハンドラ）
├── lib/
│   ├── server/
│   │   ├── db.ts                    # DB 接続（createDb）※テスト対象外
│   │   ├── tables.ts                # Drizzle テーブル定義※テスト対象外
│   │   ├── auth.ts                  # Better Auth 設定※テスト対象外
│   │   ├── errors.ts                # AppError クラス
│   │   └── errors.test.ts           # Unit テスト（AppError ロジック）
│   ├── components/                  # 複数機能で共有する UI コンポーネント
│   │   ├── {ComponentName}.svelte
│   │   └── {ComponentName}.svelte.test.ts  # Unit テスト（共有コンポーネント）
│   └── index.ts                     # barrel export
├── hooks.server.ts                  # セッション注入
├── app.d.ts
└── app.html
e2e/                                 # E2E テスト（Playwright）
└── {feature}.e2e.ts
```

### コロケーションルール

- `routes/{feature}/_lib/schema.ts` ― その機能だけで使う Zod スキーマ（テストは隣に `schema.test.ts`）
- `routes/{feature}/_lib/service.ts` ― その機能のサービス層（テストは隣に `service.integration.test.ts`）
- `routes/{feature}/_lib/` ― `_` プレフィックスで SvelteKit ルーターが無視する
- `routes/{feature}/(actions)/` ― アクション系エンドポイントを URL に影響なくグルーピング
- `routes/{feature}/components/` ― その機能専用コンポーネント（テストは隣に `.svelte.test.ts`）
- 複数機能で共有するコンポーネントは `src/lib/components/` へ
- Drizzle テーブル定義（`src/lib/server/tables.ts`）はアプリ全体で1ファイルに集約

---

## Terraform 管理

D1・R2・Pages 設定・env/secrets を Terraform で一元管理する。
`wrangler.toml` はローカル開発（`dev:cf`）用設定として残す。

### ファイル構成

| パス                                 | 役割                                             |
| ------------------------------------ | ------------------------------------------------ |
| `terraform/main.tf`                  | Cloudflare プロバイダー設定・R2 バックエンド設定 |
| `terraform/variables.tf`             | 変数定義                                         |
| `terraform/cloudflare.tf`            | D1・R2・Pages リソース定義                       |
| `terraform/outputs.tf`               | 出力値（D1 database_id 等）                      |
| `terraform/terraform.tfvars.example` | 変数サンプルファイル（Git 管理対象）             |
| `terraform/terraform.tfvars`         | 実際の変数値（Git 除外）                         |

### State 保存先

Cloudflare R2 バケット `home-hub-tfstate` に保存する（S3 互換バックエンド）。

### CI/CD

| ワークフロー     | トリガー  | Terraform 操作                    |
| ---------------- | --------- | --------------------------------- |
| `verify-app.yml` | PR        | `terraform plan`（差分確認）      |
| `deploy.yml`     | main push | `terraform apply`（インフラ適用） |

### GitHub Secrets（Terraform 用）

| Secret 名                          | 用途                       |
| ---------------------------------- | -------------------------- |
| `CLOUDFLARE_R2_ACCESS_KEY_ID`      | Terraform state の R2 認証 |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY`  | 同上                       |
| `TF_VAR_CLOUDFLARE_API_TOKEN`      | Cloudflare API 認証        |
| `TF_VAR_BETTER_AUTH_SECRET`        | Pages env/secrets          |
| `TF_VAR_LINE_CHANNEL_ACCESS_TOKEN` | 同上                       |
| `TF_VAR_LINE_USER_ID_PRIMARY`      | 同上                       |
| `TF_VAR_LINE_USER_ID_SPOUSE`       | 同上                       |
| `TF_VAR_RECIPE_IMAGES_PUBLIC_URL`  | 同上                       |

### 初回セットアップ手順

```bash
# 1. R2 state バケット作成（ダッシュボードまたは wrangler）
wrangler r2 bucket create home-hub-tfstate

# 2. terraform.tfvars を terraform.tfvars.example からコピーして実値を記入

# 3. 初期化（R2 バックエンド接続）
terraform -chdir=terraform init \
  -backend-config="endpoint=https://{ACCOUNT_ID}.r2.cloudflarestorage.com" \
  -backend-config="access_key={R2_ACCESS_KEY_ID}" \
  -backend-config="secret_key={R2_SECRET_ACCESS_KEY}"

# 4. 既存リソースを import
terraform -chdir=terraform import cloudflare_d1_database.home_hub {ACCOUNT_ID}/d8430f83-51ef-47f6-9e9a-40dca3cd12e2
terraform -chdir=terraform import cloudflare_pages_project.home_hub {ACCOUNT_ID}/home-hub
terraform -chdir=terraform import cloudflare_r2_bucket.recipe_images {ACCOUNT_ID}/home-hub-recipe-images

# 5. 差分確認
terraform -chdir=terraform plan
```

---

## アーキテクチャ

```
[Browser]
    │
    │ SSR / 静的ファイル配信 / API fetch (Cookie)
    ↓
[Cloudflare Pages + Workers]  ← SvelteKit (adapter-cloudflare)
    │                   │
    │ D1 binding         │ Workers AI binding
    ↓                   ↓
[Cloudflare D1]    [Cloudflare Workers AI]
（Drizzle経由）
```
