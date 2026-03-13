# Infrastructure Spec

## Tech Stack

| レイヤー | 技術 | 備考 |
|---|---|---|
| FE | SvelteKit v5 (`adapter-static`) + Tailwind CSS | 静的生成、動的データはクライアントサイド fetch |
| BE | Hono + Cloudflare Workers | API サーバー |
| DB | Cloudflare D1（SQLite） | |
| ORM | Prisma + `@prisma/adapter-d1` | Workers では `prisma/client/edge` を使用 |
| バリデーション | Zod v4 | FE・BE 共通スキーマを `packages/shared` で管理。Hono は `@hono/standard-validator` を使用 |
| テスト | Vitest（Unit/API）+ Playwright（E2E） | |
| AI | Cloudflare Workers AI（llama-3.1） | 登録済みレシピからレコメンド |
| Hosting | Cloudflare Pages | FE の静的ファイル配信 |
| 認証 | Better Auth（Hono ミドルウェア + Prisma アダプター） | 2ユーザー固定、DBシードで初期登録 |
| パッケージ管理 | npm workspaces（モノレポ） | |

---

## アーキテクチャ

```
[Browser]
    │
    │ 静的ファイル配信
    ↓
[Cloudflare Pages]         ← SvelteKit (adapter-static)
    │
    │ API fetch (Cookie)
    ↓
[Cloudflare Workers]       ← Hono
    │                   │
    │ D1 binding         │ Workers AI binding
    ↓                   ↓
[Cloudflare D1]    [Cloudflare Workers AI]
（Prisma経由）
```

---

## ディレクトリ構成

### トップレベル

```
what-to-eat/
├── apps/
│   ├── web/        # SvelteKit v5 (adapter-static)
│   └── api/        # Hono (Cloudflare Workers)
├── packages/
│   ├── shared/     # FE/BE 共有（Zod v4 スキーマ + 型定義）
│   ├── config/     # ESLint・TypeScript・Tailwind 共通設定
│   └── constants/  # エラーコード・ステータス等の定数
├── specs/          # 機能仕様書
├── plan.md
└── package.json    # npm workspaces
```

### FE（apps/web/src/）

コロケーション構成。各 feature のルート・コンポーネント・API クライアントを同ディレクトリに配置する。

```
routes/
├── +layout.svelte              # 共通レイアウト（認証チェック・未認証時リダイレクト）
└── {feature}/
    ├── +page.svelte            # ページ
    ├── components/             # feature 固有コンポーネント
    └── apis/                   # エンドポイント定義（CRUD 単位でファイル分割）
        ├── fetch{Feature}.ts
        ├── create{Feature}.ts
        ├── update{Feature}.ts
        └── delete{Feature}.ts
lib/
├── components/                 # 共有コンポーネント
├── stores/                     # グローバルストア（認証状態等）
└── api/                        # ベースクライアント（エラーハンドリング・認証ヘッダー付与等）
```

**認証チェック**: `+layout.ts` でクライアントサイド実行。未認証時は `goto('/login')` でリダイレクト。

### BE（apps/api/src/）

コロケーション構成。各 feature の routes・services・schemas を同ディレクトリに配置する。

```
features/
└── {feature}/
    ├── routes/                 # Hono ルート定義（操作単位）
    │   ├── list.ts
    │   ├── create.ts
    │   ├── update.ts
    │   ├── delete.ts
    │   └── index.ts            # ルート登録まとめ
    ├── services/               # ビジネスロジック（操作単位）
    │   ├── list.ts
    │   ├── create.ts
    │   ├── update.ts
    │   └── delete.ts
    └── schemas/                # BE 固有スキーマ（レスポンス・DB変換等）
        └── response.ts         # 入力スキーマは packages/shared/schemas/ を import
lib/
├── db.ts                       # Prisma クライアント初期化
└── ai.ts                       # Workers AI クライアント
middleware/
└── auth.ts                     # Better Auth ミドルウェア
prisma/
├── schema.prisma               # Better Auth が user/session テーブルを管理
└── seed.ts                     # 初期データ（2ユーザー・タグ10件）
```

### packages/shared（packages/shared/src/）

```
schemas/                        # Zod v4 共通スキーマ（FE・BE 両方から import）
├── dish.ts                     # Dish 入力スキーマ（create/update）
├── tag.ts                      # Tag 入力スキーマ
└── auth.ts                     # 認証スキーマ
types.ts                        # z.infer<> で導出した型定義
```

### specs/

```
specs/
├── infra-spec.md               # このファイル
└── {feature}/
    ├── spec.md
    └── openapi.yaml
```

---

## DBスキーマ方針

- Better Auth の Prisma アダプターが `user` / `session` テーブルを自動管理する
- アプリ固有のテーブルは `prisma/schema.prisma` に追加定義する
- `Effort`（EASY/HARD）・`Category`（MAIN/SIDE）は SQLite 互換のため文字列 enum として定義する

### アプリ固有テーブル（概要）

| テーブル | 概要 |
|---|---|
| `Tag` | タグマスタ（name ユニーク） |
| `Dish` | レシピ記録（name, recipeUrl, recipeText, effort, category, cookedAt） |
| `DishTag` | Dish と Tag の中間テーブル |

> 詳細な Prisma スキーマは `apps/api/prisma/schema.prisma` を参照。

---

## 初期データ（seed）

| 種別 | 内容 |
|---|---|
| ユーザー | 2件（夫・妻） |
| タグ | 肉・魚・野菜 / しょっぱい・さっぱり・こってり・辛い / 和食・洋食・中華 |

---

## 技術的な注意事項

- Better Auth の Zod v4 対応が不安定。初期セットアップ時に動作確認が必要（問題があれば Zod v3 に下げる）
- `@hono/zod-validator` は Zod v4 未対応のため `@hono/standard-validator` を使用すること
- Prisma の D1 マイグレーションは `prisma migrate diff` + `wrangler d1 migrations apply` で実行する
