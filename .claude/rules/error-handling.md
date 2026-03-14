# Error Handling

エラーハンドリングの戦略。

## エラー分類と HTTP ステータスマッピング

| エラーコード | HTTP | 用途 |
|------------|------|------|
| `VALIDATION_ERROR` | 400 | 入力バリデーション失敗 |
| `UNAUTHORIZED` | 401 | 未認証 |
| `FORBIDDEN` | 403 | 権限なし |
| `NOT_FOUND` | 404 | リソース不在 |
| `CONFLICT` | 409 | 重複（name ユニーク違反等） |
| `INTERNAL_SERVER_ERROR` | 500 | 予期しないエラー |

- エラーコードは `packages/constants/` で定数として定義する
- エラーコードの命名規則: `SCREAMING_SNAKE_CASE`
- エラーメッセージは日本語

## ハンドリング戦略

**カスタムエラークラス（`AppError`）を throw + Hono の `onError` でグローバルに変換** する。

```ts
// packages/constants/errors.ts
export type ErrorCode = 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN'
  | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_SERVER_ERROR'

// apps/api/src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public status: number,
    message: string,
    public fields?: { field: string; message: string }[]
  ) { super(message) }
}

// Service 層での使い方
throw new AppError('NOT_FOUND', 404, '料理が見つかりません')

// apps/api/src/index.ts
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json({ error: { code: err.code, message: err.message, fields: err.fields } }, err.status)
  }
  console.error(err)
  return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'エラーが発生しました' } }, 500)
})
```

## ロギングルール

**出す情報**: リクエストメソッド・パス・ステータスコード・レスポンスタイム・エラーコード

**出してはいけない情報**: パスワード・セッショントークン・認証ヘッダー・個人情報

## FE エラーハンドリング

| エラー種別 | 表示方法 |
|----------|---------|
| 通常の API エラー（4xx） | **トースト**で表示 |
| フィールドエラー（`VALIDATION_ERROR` の `fields`） | フォームフィールド直下に**インライン**表示 |
| 予期しないエラー（500） | **エラーページ**に遷移 |

- 500 エラーの詳細はユーザーに表示しない（「エラーが発生しました」の汎用メッセージのみ）

## 参照するスキル

- scaffold-be, scaffold-fe, review-changes
