# External Integrations

Workers AI・LINE API の実装規約。
バインディングは `platform!.env` 経由でアクセスする（→ `api-patterns.md` 参照）。

---

## 環境変数・バインディング一覧

`src/app.d.ts` の `App.Platform.env` が型定義の唯一の参照先。

| 変数名                      | 型           | 用途                                                      |
| --------------------------- | ------------ | --------------------------------------------------------- |
| `DB`                        | `D1Database` | Cloudflare D1                                             |
| `GOOGLE_CLIENT_ID`          | `string`     | Google OAuth クライアント ID                              |
| `GOOGLE_CLIENT_SECRET`      | `string`     | Google OAuth クライアントシークレット                     |
| `ALLOWED_EMAILS`            | `string?`    | サインアップ許可メール（カンマ区切り。未設定 = 全員拒否） |
| `AI`                        | `Ai`         | Workers AI（llama-3.1 等）                                |
| `BETTER_AUTH_SECRET`        | `string`     | Better Auth 署名キー                                      |
| `USE_REAL_AI`               | `string?`    | `'true'` のとき本物の AI を使用                           |
| `LINE_CHANNEL_ACCESS_TOKEN` | `string?`    | LINE push 送信トークン                                    |
| `LINE_USER_ID_PRIMARY`      | `string?`    | LINE User ID（main ユーザー）                             |
| `LINE_USER_ID_SPOUSE`       | `string?`    | LINE User ID（partner ユーザー）                          |
| `LINE_MOCK`                 | `string?`    | `'true'` のとき LINE 送信をスキップ                       |

ローカル開発値は `.dev.vars`（`.gitignore` 済み）に記述する。
本番の値は Terraform（`terraform/modules/pages` の `secrets`）で設定する（→ `security.md`）。
`AI` バインディングは `wrangler.toml` の `[ai]` で宣言済みだが、Terraform の `deployment_configs` には未定義のため、本番利用時は追加が必要。

---

## Cloudflare Workers AI

現状 AI を使う feature はない（バインディングのみ保持）。新規利用時は以下に従う。

### 呼び出しパターン

`AI` バインディングの型は `@cloudflare/workers-types` の `Ai`。モデル名がリテラルで型定義に含まれていれば `ai.run()` の
入出力は型推論される。型定義と合わない場合のみ、以下の最小型 `AiRunner` にキャストする（キャスト範囲は呼び出し箇所 1 つに限定）。

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

### 複数エンドポイントでの共通化

同一 feature 内の複数エンドポイントで上記の `AiRunner` 型・`ai.run()` 呼び出しが重複する場合、
`{feature}/server/ai.ts` に共通ヘルパーとして抽出する。

```typescript
// lib/features/{feature}/server/ai.ts
export async function runFeatureAi(
	ai: unknown,
	systemPrompt: string,
	userMessage: string
): Promise<string | undefined> {
	const runner = ai as unknown as AiRunner;
	const aiResponse = await runner.run(AI_MODEL, {
		messages: [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userMessage }
		]
	});
	return aiResponse.response;
}
```

エンドポイントが 1 つしかない場合は抽出せず、`+server.ts` にそのまま書く。

### プロンプト構成

システムプロンプトにユーザーデータ（登録済みデータ一覧等）をコンテキストとして含める。

```typescript
const systemPrompt = `あなたは〇〇のアシスタントです。...

登録済みデータ一覧:
${context || 'データが登録されていません。'}`;
```

### dev 環境でのモック

「Vite 開発サーバー（`dev === true`）」かつ「`USE_REAL_AI !== 'true'`」のときだけダミー回答を返す。
本番は `dev === false` のため常に実 AI を使う（`USE_REAL_AI` の設定不要）。

```typescript
import { dev } from '$app/environment';

const useDummy = dev && platform!.env.USE_REAL_AI !== 'true';
if (useDummy) {
	answer = `【ローカル開発用ダミー回答】\n...`;
} else {
	// Workers AI 呼び出し
}
```

- `make dev-cf`（`npm run dev:cf` = build 後に `wrangler pages dev`）は本番ビルドのため `dev === false` → 常に実 AI（課金対象）
- `npm run dev` で実 AI を試す場合は `.dev.vars` に `USE_REAL_AI=true` を設定する

---

## LINE API

### push message パターン

```typescript
async function sendLineMessage(
	lineUserId: string,
	messages: object[], // 1 リクエスト最大 5 件
	lineChannelAccessToken: string
): Promise<void> {
	const res = await fetch('https://api.line.me/v2/bot/message/push', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${lineChannelAccessToken}`
		},
		body: JSON.stringify({ to: lineUserId, messages })
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
送信処理は `notifyPartnerBestEffort` のように「解決 → スキップ判定 → try/catch」を 1 関数にまとめ、呼び出し側に catch を書かせない。

```typescript
// DB 更新を先行
await db.update(expense).set({ status: 'pending' }).where(...);

// LINE はベストエフォート
try {
  await sendLineMessage(...);
} catch (e) {
  console.error('[LINE] 送信失敗:', e); // e にトークンを含めない
  // throw しない
}
```

### レスポンスを待たせない（推奨）

通知の完了をレスポンスで返す必要がない場合、`platform!.context.waitUntil()` に渡してレスポンス返却後に実行させる
（Workers はレスポンス返却後も `waitUntil` の Promise 完了まで実行を継続する）。

```typescript
// +server.ts
const result = await approveExpenses(
	db,
	locals.user!.id,
	{ role: locals.role, lineEnv: buildLineEnv(platform!.env), origin: url.origin },
	(task) => platform!.context.waitUntil(task)
);
return json(result);
```

- 通知本文に載せる URL は `origin`（`url.origin`）から組み立てる。本番ドメインをハードコードしない
- LINE 関連の処理は `expenses/server/line.ts`（`buildLineEnv` / `notifyPartnerBestEffort`）に集約済み

- `waitUntil` を使わずに `await` しない Promise を放置すると、レスポンス返却後に処理が打ち切られる可能性がある
- service には `defer?: Defer` 引数で渡す（`requestExpenses` / `approveExpenses` 参照）。未指定時は `await` するため、テストでは省略して完了まで待てる

---

## 環境別の外部サービス動作まとめ

| サービス   | `npm run dev`（Vite）                    | `make dev-cf`（wrangler pages dev） | 本番                  |
| ---------- | ---------------------------------------- | ----------------------------------- | --------------------- |
| D1         | ローカル D1（`platformProxy`）           | ローカル D1（wrangler）             | Cloudflare D1         |
| Workers AI | ダミー回答（`USE_REAL_AI=true` で実 AI） | 実 AI（`dev=false`）                | Cloudflare Workers AI |
| LINE       | `LINE_MOCK=true` でスキップ              | `LINE_MOCK=true` でスキップ         | 実 LINE API           |

---

## なぜ必要か

- dev 環境モックの統一パターンを明示することで、環境依存バグを防ぐため
