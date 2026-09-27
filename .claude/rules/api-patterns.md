# API Patterns

SvelteKit + Cloudflare Pages（Worker 実行）+ D1 構成における API 設計規約。

## スタック

- **フレームワーク**: SvelteKit 2 (Svelte 5)
- **ランタイム**: Cloudflare Pages（`adapter-cloudflare` が生成する `_worker.js` = Workers ランタイム）
- **DB**: Cloudflare D1 (SQLite) + Drizzle ORM
- **認証**: Better Auth（`/api/auth/*` は Better Auth が自動管理）

---

## API ルートの配置

SvelteKit の `+server.ts` を CSR 用 JSON API ハンドラとして使用する。実装は `src/lib/features/` に置く（→ `directory-structure.md`）。

```
src/routes/{feature}/+server.ts                      # 一覧・作成
src/routes/{feature}/[id]/+server.ts                 # 詳細・更新・削除
src/routes/{feature}/(actions)/{action}/+server.ts   # 状態遷移等のアクション（URL に group 名は出ない）
src/lib/features/{feature}/schema.ts                 # Zod スキーマ（FE/BE 共通）
src/lib/features/{feature}/server/service.ts         # ビジネスロジック・DB 操作
```

URL は `/{feature}` 。**`/api/` プレフィックスおよびバージョニングは使用しない**（例外: Better Auth の `/api/auth/*`）。

- 同一ディレクトリに `+page.svelte` と `+server.ts` が共存する場合、SvelteKit は `Accept: text/html` の GET をページへ、
  それ以外をハンドラへ振り分ける（公式のコンテンツネゴシエーション）
- `(actions)` は SvelteKit の form actions とは無関係の route group 名

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

- `!` は非null断定。本番の Cloudflare Workers 実行環境では `platform` は常に注入されるため許容する
- `@sveltejs/adapter-cloudflare` の公式サンプルは `platform?.env` を使うが、本プロジェクトはこの前提に基づき統一して `!` を使う（Node 環境等 `platform` が undefined になりうる箇所を新設する場合のみ `?.` に切り替える）

---

## 認証チェック

`hooks.server.ts` で全ルートに一括適用済み。**各ハンドラに認証チェックを書かない**。

- 未認証のブラウザアクセス → `/login` へリダイレクト（302）
- 未認証の API 呼び出し（fetch）→ JSON 401
- 公開パスの追加が必要な場合は `hooks.server.ts` の `PUBLIC_PATHS` に追記する
- `user.role` は hooks が `locals.role` に注入済み。ハンドラ・load で DB から role を再取得しない
- role 限定のパスは `hooks.server.ts` の `MAIN_ONLY_PREFIXES` に追記する（API = JSON 403 `FORBIDDEN`。
  画面遷移は `+page.server.ts` の load で `locals.role` を見て `error(403)`）

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
- **件数が少ない場合も含め、一覧取得は常にこの形式に統一する**（全件返却のマスタ系は `page: 1` / `limit: items.length`）
- 集計・グラフ用データ（`/dashboard/summary`、`/workout/chart` 等）は一覧ではないため対象外

---

## エラーレスポンス

`src/lib/server/errors.ts` の `AppError` を service で throw し、ハンドラで `src/lib/server/api-helpers.ts` のヘルパーを使って変換する。
変換ロジックをハンドラに手書きしない。

| ヘルパー                          | 用途                                                                   |
| --------------------------------- | ---------------------------------------------------------------------- |
| `parseJsonBody(request)`          | JSON パース。不正な JSON は 400 `VALIDATION_ERROR`（500 にしないため） |
| `validationErrorResponse(issues)` | Zod の `issues` → 400 `VALIDATION_ERROR` + `fields`                    |
| `handleApiError(e)`               | `AppError` → 対応ステータス / それ以外 → `console.error` + 500         |

```typescript
// エラーコード一覧（errors.ts 参照）
// VALIDATION_ERROR / UNAUTHORIZED / FORBIDDEN / NOT_FOUND / CONFLICT / INTERNAL_SERVER_ERROR

try {
	// ...
} catch (e) {
	return handleApiError(e);
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

`fields` はバリデーションエラー時のみ付与（JSON パース失敗時は空配列）。

### service.ts でのエラー throw

期待されるエラー（NOT_FOUND、CONFLICT 等）は `AppError` を throw する。予期しないエラー（DB 障害等）はそのまま上位に伝播させる。Result Pattern は使わない。

```typescript
export async function getItem(db: Db, id: string) {
	const item = await db.select().from(items).where(eq(items.id, id)).get();
	if (!item) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');
	return item;
}
```

エラーコードは英語、メッセージは日本語。`ErrorCode` 型の一覧は `src/lib/server/errors.ts` が唯一の定義元。

---

## ロギングルール

- `console.error()` は予期しないエラー（500 系）のみ
- `AppError` はログ不要（想定内のエラーのため）
- ログに含めてはいけない情報: パスワード、トークン、セッション ID（→ `security.md`）
- 外部 API のベストエフォート失敗（LINE 送信等）は例外的に `console.error` で記録する（→ `external-integrations.md`）

---

## FE エラーハンドリング

```typescript
const res = await fetch('/{feature}', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify(data)
});
if (!res.ok) {
	// Cloudflare 側の 5xx 等で JSON 以外が返る可能性あり → .catch() でフォールバック（→ csr-patterns.md）
	const err = (await res.json().catch(() => ({}))) as {
		code?: string;
		message?: string;
		fields?: { field: string; message: string }[];
	};
	if (err.code === 'VALIDATION_ERROR') {
		// フィールドエラーをフォームに表示
		// err.fields: [{ field: 'name', message: '名前は必須です' }]
	} else {
		// トースト等で汎用エラーを表示
		// err.message をそのまま表示してよい（日本語）
	}
}
```

---

## ハンドラの責務範囲

`+server.ts` は薄く保ち、以下のみを担当する（認証は hooks が保証済み）：

1. リクエストボディのパース・バリデーション（Zod v4）
2. `service.ts` の関数呼び出し
3. レスポンス返却 / エラー変換

DB 操作・ビジネスロジックは必ず `src/lib/features/{feature}/server/` に書く。ハンドラに直接 Drizzle クエリを書かない。

### バリデーションパターン

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createDb } from '$lib/server/db';
import { parseJsonBody, validationErrorResponse, handleApiError } from '$lib/server/api-helpers';
import { itemCreateSchema } from '$lib/features/{feature}/schema';
import { createItem } from '$lib/features/{feature}/server/service';

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	// 1. JSON パース + Zod v4 バリデーション（認証は hooks で保証済みのため不要）
	const bodyResult = await parseJsonBody(request);
	if (!bodyResult.ok) return bodyResult.response;

	const result = itemCreateSchema.safeParse(bodyResult.data);
	if (!result.success) return validationErrorResponse(result.error.issues);

	// 2. サービス呼び出し + 3. エラー変換
	try {
		const db = createDb(platform!.env.DB);
		const created = await createItem(db, locals.user!.id, result.data);
		return json(created, { status: 201 });
	} catch (e) {
		return handleApiError(e);
	}
};
```

クエリパラメータは `url.searchParams.get('x') ?? undefined` をスキーマに渡して検証する（`null` のままだと `.optional()` / `.default()` が効かない）。

---

## ページ初期データ取得

- **SSR（初期表示）**: `+page.server.ts` の `load` 関数から `service.ts` を呼ぶ
- **CSR（操作後の更新）**: `+server.ts` エンドポイントを `fetch` で呼ぶ

```typescript
// +page.server.ts（認証は hooks が保証済みのため redirect 不要）
import type { PageServerLoad } from './$types';
import { createDb } from '$lib/server/db';
import { getItems } from '$lib/features/{feature}/server/service';

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = createDb(platform!.env.DB);
	return { items: await getItems(db, locals.user!.id) };
};
```

---

## なぜ必要か

- Cloudflare Workers ランタイム固有の制約（`platform.env` アクセス等）を統一するため
- エラーレスポンスの一貫性を保つため
