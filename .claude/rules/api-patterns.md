# API Patterns

SvelteKit + Cloudflare Workers (D1) 構成における API 設計規約。

## スタック

- **フレームワーク**: SvelteKit 2 (Svelte 5)
- **ランタイム**: Cloudflare Workers
- **DB**: Cloudflare D1 (SQLite) + Drizzle ORM
- **認証**: Better Auth（`/api/auth/*` は Better Auth が自動管理）

---

## API ルートの配置

SvelteKit の `+server.ts` を API ハンドラとして使用する。機能ごとにコロケーション配置する。

```
src/routes/{feature}/+server.ts              # 一覧・作成
src/routes/{feature}/[id]/+server.ts         # 詳細・更新・削除
src/routes/{feature}/schema.ts               # Zod スキーマ（FE/BE 共通）
src/routes/{feature}/service.ts              # ビジネスロジック・DB 操作
```

URL は `/{feature}` 。**`/api/` プレフィックスおよびバージョニングは使用しない**。

---

## DB・環境変数アクセス

Cloudflare Workers のバインディングは `event.platform!.env` から取得する。

```typescript
import { createDb } from '$lib/server/db';

export const GET: RequestHandler = async ({ platform }) => {
	const db = createDb(platform!.env.DB);
	// ...
};
```

---

## 認証チェック

`hooks.server.ts` で全ルートに一括適用済み。**各ハンドラに認証チェックを書かない**。

- 未認証のブラウザアクセス → `/login` へリダイレクト（302）
- 未認証の API 呼び出し（fetch）→ JSON 401
- 公開パスの追加が必要な場合は `hooks.server.ts` の `PUBLIC_PATHS` に追記する

---

## レスポンス形式

`@sveltejs/kit` の `json()` ヘルパーを使用する。ラッパーオブジェクトは使わない。

### 一覧取得（200）

件数にかかわらず常にページネーション形式で返す（→ 後述）。

### 単一リソース取得（200）

```typescript
return json(item);
```

### 作成（201）

```typescript
return json(created, { status: 201 });
```

### 更新（200）

```typescript
return json(updated);
```

### 削除（204）

```typescript
return new Response(null, { status: 204 });
```

### 一覧取得（ページネーション付き・200）

クエリパラメータ `page`（1始まり）と `limit` で制御する。

```
GET /{feature}?page=1&limit=20
```

```typescript
return json({
  items: [...],
  total: 100,
  page: 1,
  limit: 20
});
```

- `total`: 条件に合う全件数（フロントでページ数計算に使用）
- `limit` のデフォルト値は 20、最大値は 100
- **件数が少ない場合も含め、一覧取得は常にこの形式に統一する**

---

## エラーレスポンス

`src/lib/server/errors.ts` の `AppError` を throw する。
ハンドラ内で catch して `json()` でレスポンスを返す。

```typescript
// エラーコード一覧（errors.ts 参照）
// VALIDATION_ERROR / UNAUTHORIZED / FORBIDDEN / NOT_FOUND / CONFLICT / INTERNAL_SERVER_ERROR

// ハンドラの catch パターン
try {
	// ...
} catch (e) {
	if (e instanceof AppError) {
		return json({ code: e.code, message: e.message, fields: e.fields }, { status: e.status });
	}
	console.error(e);
	return json(
		{ code: 'INTERNAL_SERVER_ERROR', message: 'サーバーエラーが発生しました' },
		{ status: 500 }
	);
}
```

### エラーレスポンス JSON 構造

```json
{
	"code": "VALIDATION_ERROR",
	"message": "入力値が正しくありません",
	"fields": [{ "field": "name", "message": "名前は必須です" }]
}
```

`fields` はバリデーションエラー時のみ付与。

---

## ハンドラの責務範囲

`+server.ts` は薄く保ち、以下のみを担当する（認証は hooks が保証済み）：

1. リクエストボディのパース・バリデーション（Zod v4）
2. `service.ts` の関数呼び出し
3. レスポンス返却 / エラー変換

DB 操作・ビジネスロジックは必ず `service.ts` に書く。ハンドラに直接 Drizzle クエリを書かない。

### バリデーションパターン

```typescript
import { json } from '@sveltejs/kit';
import { AppError } from '$lib/server/errors';
import { createDb } from '$lib/server/db';
import { itemCreateSchema } from './schema';
import { createItem } from './service';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	// 1. Zod v4 バリデーション（認証は hooks で保証済みのため不要）
	const body = await request.json();
	const result = itemCreateSchema.safeParse(body);
	if (!result.success) {
		return json(
			{
				code: 'VALIDATION_ERROR',
				message: '入力値が正しくありません',
				fields: result.error.issues.map((i) => ({
					field: i.path.join('.'),
					message: i.message
				}))
			},
			{ status: 400 }
		);
	}

	// 2. サービス呼び出し
	try {
		const db = createDb(platform!.env.DB);
		const created = await createItem(db, locals.user!.id, result.data);
		return json(created, { status: 201 });
	} catch (e) {
		if (e instanceof AppError) {
			return json({ code: e.code, message: e.message, fields: e.fields }, { status: e.status });
		}
		console.error(e);
		return json(
			{ code: 'INTERNAL_SERVER_ERROR', message: 'サーバーエラーが発生しました' },
			{ status: 500 }
		);
	}
};
```

---

## ページ初期データ取得

- **SSR（初期表示）**: `+page.server.ts` の `load` 関数から `service.ts` を呼ぶ
- **CSR（操作後の更新）**: `+server.ts` エンドポイントを `fetch` で呼ぶ

```typescript
// +page.server.ts（認証は hooks が保証済みのため redirect 不要）
import { createDb } from '$lib/server/db';
import { getItems } from './service';

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = createDb(platform!.env.DB);
	return { items: await getItems(db, locals.user!.id) };
};
```

---

## なぜ必要か

- scaffold-be スキルが API コードを生成する際の規約として参照
- scaffold-fe スキルが API 呼び出しコードを生成する際の規約として参照
- Cloudflare Workers 固有の制約（`platform.env` アクセス等）を統一するため

## 参照するスキル

- scaffold-be, scaffold-fe
