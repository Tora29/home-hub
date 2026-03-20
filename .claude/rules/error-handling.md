# Error Handling

`src/lib/server/errors.ts` の `AppError` を中心としたエラーハンドリング規約。

---

## エラークラス

`AppError` を throw してエラーを伝播する。Result Pattern は使わない。

```typescript
// src/lib/server/errors.ts
throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');

// バリデーションエラー（フィールドエラー付き）
throw new AppError('VALIDATION_ERROR', 400, '入力値が正しくありません', [
	{ field: 'name', message: '名前は必須です' }
]);
```

---

## エラーコード一覧

`src/lib/server/errors.ts` の `ErrorCode` 型が唯一の定義元。新しいコードが必要になったらそちらに追加する。

- エラーコードは英語、メッセージは日本語

---

## ハンドリング戦略

### service.ts

期待されるエラー（NOT_FOUND、CONFLICT 等）は `AppError` を throw する。
予期しないエラー（DB 障害等）はそのまま上位に伝播させる。

```typescript
// service.ts
export async function getItem(db: DrizzleD1, id: string) {
	const item = await db.select().from(items).where(eq(items.id, id)).get();
	if (!item) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');
	return item;
}
```

### +server.ts

`AppError` と予期しないエラーを分けて catch する。

```typescript
// +server.ts
try {
  const result = await someService(db, ...);
  return json(result);
} catch (e) {
  if (e instanceof AppError) {
    return json({ code: e.code, message: e.message, fields: e.fields }, { status: e.status });
  }
  // 予期しないエラーはログを出してから汎用メッセージを返す
  console.error(e);
  return json({ code: 'INTERNAL_SERVER_ERROR', message: 'サーバーエラーが発生しました' }, { status: 500 });
}
```

### 認証エラー（UNAUTHORIZED）

`hooks.server.ts` が一括処理するため、`+server.ts` では対応不要。

---

## ロギングルール

- `console.error()` は予期しないエラー（500 系）のみ
- `AppError` はログ不要（想定内のエラーのため）
- ログに含めてはいけない情報: パスワード、トークン、セッション ID

---

## FE エラーハンドリング

API レスポンスの構造に合わせて処理する。

```typescript
const res = await fetch('/{feature}', { method: 'POST', body: JSON.stringify(data) });
if (!res.ok) {
	const err = await res.json();
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

## なぜ必要か

- scaffold-be スキルが Service 層・API 層のエラー処理を生成する際の規約
- scaffold-fe スキルがエラー表示を生成する際の規約
- エラーレスポンスの一貫性を保つため

## 参照するスキル

- scaffold-be, scaffold-fe, review-changes
