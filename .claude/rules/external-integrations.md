# External Integrations

Cloudflare R2・Workers AI・LINE API の実装規約。
バインディングは `platform!.env` 経由でアクセスする（→ `api-patterns.md` 参照）。

---

## 環境変数・バインディング一覧

`src/app.d.ts` の `App.Platform.env` が型定義の唯一の参照先。

| 変数名                      | 型           | 用途                                |
| --------------------------- | ------------ | ----------------------------------- |
| `DB`                        | `D1Database` | Cloudflare D1                       |
| `AI`                        | `Ai`         | Workers AI（llama-3.1 等）          |
| `RECIPE_IMAGES`             | `R2Bucket`   | レシピ画像 R2 バケット              |
| `RECIPE_IMAGES_PUBLIC_URL`  | `string`     | R2 公開 URL（末尾スラッシュなし）   |
| `BETTER_AUTH_SECRET`        | `string`     | Better Auth 署名キー                |
| `USE_REAL_AI`               | `string?`    | `'true'` のとき本物の AI を使用     |
| `LINE_CHANNEL_ACCESS_TOKEN` | `string?`    | LINE push 送信トークン              |
| `LINE_USER_ID_PRIMARY`      | `string?`    | LINE User ID（main ユーザー）       |
| `LINE_USER_ID_SPOUSE`       | `string?`    | LINE User ID（partner ユーザー）    |
| `LINE_MOCK`                 | `string?`    | `'true'` のとき LINE 送信をスキップ |

ローカル開発値は `.dev.vars`（`.gitignore` 済み）に記述する。

---

## Cloudflare R2

### アップロードパターン

```typescript
// キー生成: crypto.randomUUID() + 拡張子
const key = `${crypto.randomUUID()}.${ext}`;

// ArrayBuffer としてアップロード
const buffer = await file.arrayBuffer();
await platform!.env.RECIPE_IMAGES.put(key, buffer, {
	httpMetadata: { contentType: file.type }
});

// 公開 URL 構築（末尾スラッシュなし + スラッシュ + key）
const url = `${platform!.env.RECIPE_IMAGES_PUBLIC_URL}/${key}`;
return json({ url, key });
```

- `key` と `url` を分けて保存する（→ `tables.ts` の `r2ImageKey` / `imageUrl`）
- 削除時は `r2ImageKey` を使って `RECIPE_IMAGES.delete(key)` する

### バリデーション

ファイル形式とサイズは `+server.ts` で検証する。

```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
```

### dev 環境での R2 スキップ

```typescript
import { dev } from '$app/environment';

if (dev) {
	return json({ url: 'https://placehold.co/400x300?text=Recipe+Image', key: null });
}
```

`dev` フラグが `true` のとき R2 バインディングは存在しないため、必ずスキップする。

---

## Cloudflare Workers AI

### 呼び出しパターン

`AI` バインディングの型は `@cloudflare/workers-types` の `Ai` だが、
`ai.run()` の返り値型が実際の API と合わないため `as unknown as AiRunner` でキャストする。

```typescript
type AiRunner = { run: (model: string, opts: unknown) => Promise<{ response?: string }> };
const ai = platform!.env.AI as unknown as AiRunner;

const aiResponse = await ai.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
	messages: [
		{ role: 'system', content: systemPrompt },
		{ role: 'user', content: result.data.question }
	]
});
const answer = aiResponse.response ?? 'AI からの回答を取得できませんでした。';
```

使用モデル: `@cf/meta/llama-3.1-8b-instruct-fp8`（固定）

### プロンプト構成

システムプロンプトにユーザーデータ（レシピ一覧等）をコンテキストとして含める。

```typescript
const systemPrompt = `あなたは料理の献立相談アシスタントです。...

登録済みレシピ一覧:
${recipeContext || 'レシピが登録されていません。'}`;
```

### dev 環境でのモック

`dev` フラグまたは `USE_REAL_AI !== 'true'` でダミー回答を返す。

```typescript
if (dev) {
	answer = `【ローカル開発用ダミー回答】\n...`;
} else {
	// Workers AI 呼び出し
}
```

`.dev.vars` の `USE_REAL_AI=true` を設定すると、`dev:cf`（`make tf-dev`）で実際の AI を使用できる。

---

## LINE API

### push message パターン

```typescript
async function sendLineMessage(
	lineUserId: string,
	message: string,
	lineChannelAccessToken: string
): Promise<void> {
	const res = await fetch('https://api.line.me/v2/bot/message/push', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${lineChannelAccessToken}`
		},
		body: JSON.stringify({
			to: lineUserId,
			messages: [{ type: 'text', text: message }]
		})
	});
	if (!res.ok) {
		throw new Error(`LINE API error: ${res.status}`);
	}
}
```

### ロール別通知先の解決

`user.role`（`'main'` | `'partner'` | `null`）で相手の LINE User ID を特定する。

```typescript
function resolvePartnerLineUserId(role: string | null, lineEnv: LineEnv): string | undefined {
	if (role === 'main') return lineEnv.lineUserIdSpouse;
	if (role === 'partner') return lineEnv.lineUserIdPrimary;
	return undefined; // role=null → 通知スキップ
}
```

通知先が未解決の場合（role=null）は送信しない。エラーにしない。

### LINE_MOCK による開発環境スキップ

```typescript
const shouldNotify =
  partnerLineUserId && lineEnv.lineChannelAccessToken && lineEnv.lineMock !== 'true';

if (shouldNotify) {
  await sendLineMessage(...);
}
```

`.dev.vars` の `LINE_MOCK=true` でローカル送信をスキップする。

### D1 トランザクション非対応との関係

LINE 送信は DB 更新の後続に置き、失敗してもロールバックしない（→ `drizzle.md` 参照）。

```typescript
// DB 更新を先行
await db.update(expense).set({ status: 'pending' }).where(...);

// LINE はベストエフォート
try {
  await sendLineMessage(...);
} catch (e) {
  console.error('[LINE] 送信失敗:', e);
  // throw しない
}
```

---

## 環境別の外部サービス動作まとめ

| サービス   | `npm run dev`（Vite）       | `make tf-dev`（Workers）      | 本番                  |
| ---------- | --------------------------- | ----------------------------- | --------------------- |
| D1         | モック D1                   | ローカル D1（wrangler）       | Cloudflare D1         |
| R2         | `dev=true` でスキップ       | ローカル R2（wrangler）       | Cloudflare R2         |
| Workers AI | `dev=true` でダミー回答     | `USE_REAL_AI=true` で実 AI 可 | Cloudflare Workers AI |
| LINE       | `LINE_MOCK=true` でスキップ | `LINE_MOCK=true` でスキップ   | 実 LINE API           |

---

## なぜ必要か

- scaffold-be スキルが外部サービス連携コードを生成する際の規約
- dev 環境モックの統一パターンを明示することで、環境依存バグを防ぐため

## 参照するスキル

- scaffold-be
