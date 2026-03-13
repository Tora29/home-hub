# API Patterns

API 設計の規約。

## レスポンス形式

### 一覧
```json
{ "data": [...], "total": 42, "page": 1, "limit": 20 }
```
- ページサイズのデフォルト: **20**

### 単体
```json
{ "id": 1, "name": "..." }
```
ラップなし（リソースを直接返す）

### 作成・更新・削除

| 操作 | ステータス | レスポンスボディ |
|------|----------|----------------|
| 作成 | 201 | 作成後のリソース |
| 更新 | 200 | 更新後のリソース |
| 削除 | 204 | なし（No Content） |

## エラーレスポンス構造

```json
// 通常エラー
{ "error": { "code": "NOT_FOUND", "message": "料理が見つかりません" } }

// バリデーションエラー
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に誤りがあります",
    "fields": [{ "field": "name", "message": "名前は必須です" }]
  }
}
```

- Zod のエラー構造はそのまま返さず、上記フォーマットに変換する
- エラーコード体系は `error-handling.md` を参照

## API バージョニング

- URL パス `/api/v1/` を使用（例: `GET /api/v1/dishes`）

## Controller / Handler パターン

Hono ルートの責務は「受取 → バリデーション → Service 委譲 → レスポンス成形」のみ。

```ts
// apps/api/src/features/dishes/routes/create.ts の例
app.post('/dishes',
  zValidator('json', dishSchema),   // バリデーション
  async (c) => {
    const input = c.req.valid('json')
    const dish = await createDish(c.env.DB, input)  // Service に委譲
    return c.json(dish, 201)
  }
)
```

- `@hono/standard-validator` の `zValidator('json', schema)` をミドルウェアとして渡す
- ビジネスロジック・DB 操作は Service 層に委譲する

## FE からの API 呼び出し

ベースクライアント（`apps/web/src/lib/api/`）の共通処理:

- ベースURL: 環境変数 `PUBLIC_API_URL` から取得
- `credentials: 'include'`（Cookie 送信）
- `Content-Type: application/json`
- レスポンスが 4xx/5xx の場合は `AppError` に変換して throw

```ts
// apps/web/src/lib/api/client.ts の例
const res = await fetch(`${PUBLIC_API_URL}/api/v1${path}`, {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  ...options,
})
if (!res.ok) {
  const body = await res.json()
  throw new AppError(body.error.code, body.error.message, body.error.fields)
}
```

Hono 側 CORS 設定:
```ts
app.use('*', cors({
  origin: process.env.ALLOWED_ORIGIN,  // wildcard 不可（credentials: include と共存不可）
  credentials: true,
}))
```

## 参照するスキル

- scaffold-be, scaffold-fe, review-changes
