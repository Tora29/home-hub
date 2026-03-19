# Infrastructure Spec

## Tech Stack

| レイヤー | 技術 | 備考 |
|---|---|---|
| FE | SvelteKit v5 (`adapter-cloudflare`) + Tailwind CSS | SSR + クライアントサイド |
| BE | SvelteKit `+server.ts` / `+page.server.ts` | 同一アプリ内で API・ビジネスロジックを担う |
| DB | Cloudflare D1（SQLite） | |
| ORM | Prisma + `@prisma/adapter-d1` | `platform.env.DB` 経由でアクセス |
| バリデーション | Zod v4 | `src/lib/schemas/` で FE/BE 共通管理 |
| テスト | Vitest（Unit/API）+ Playwright（E2E） | |
| AI | Cloudflare Workers AI（llama-3.1） | `platform.env.AI` 経由でアクセス |
| Hosting | Cloudflare Pages（Workers 統合） | FE/BE を単一アプリとしてデプロイ |
| 認証 | Better Auth（SvelteKit hooks + Prisma アダプター） | |
| パッケージ管理 | npm（単一パッケージ） | |

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
（Prisma経由）
```
