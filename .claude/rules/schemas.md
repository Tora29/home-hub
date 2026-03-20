# Schemas

Zod v4 を使用したバリデーションスキーマの設計規約。

## バリデーションライブラリ

**Zod v4** を使用する。`import { z } from 'zod'`

---

## スキーマ配置

機能スコープのスキーマは機能ディレクトリにコロケーション配置する。

```
src/routes/{feature}/schema.ts   # FE/BE 共通スキーマ
```

複数機能から参照するスキーマが生じた場合は `src/lib/schemas/` へ移動する（現時点では不要）。

---

## FE/BE バリデーション役割分担

- **BE（`+server.ts`）**: 唯一の信頼できるバリデーション。必ず Zod で検証する。
- **FE**: UX 向上のための補助的フィードバック。同じ `schema.ts` を import して使う。
- FE でやらないバリデーション: ユニーク制約、権限チェック、他テーブル参照整合性

---

## スキーマ定義パターン

```typescript
// routes/{feature}/schema.ts
import { z } from 'zod';

// 作成用（必須フィールドのみ）
export const itemCreateSchema = z.object({
	name: z.string().min(1, '名前は必須です').max(100, '100文字以内で入力してください'),
	memo: z.string().max(500, '500文字以内で入力してください').optional()
});

// 更新用（PUT: 全フィールド必須）
export const itemUpdateSchema = z.object({
	name: z.string().min(1, '名前は必須です').max(100, '100文字以内で入力してください'),
	memo: z.string().max(500, '500文字以内で入力してください').optional()
});

// 型エクスポート
export type ItemCreate = z.infer<typeof itemCreateSchema>;
export type ItemUpdate = z.infer<typeof itemUpdateSchema>;
```

---

## 入力/出力スキーマの分離

| スキーマ | 用途                                     | 命名                   |
| -------- | ---------------------------------------- | ---------------------- |
| Create   | POST リクエストボディ                    | `{entity}CreateSchema` |
| Update   | PUT リクエストボディ（全フィールド必須） | `{entity}UpdateSchema` |
| Response | API レスポンス型（必要に応じて定義）     | `{entity}Schema`       |

- **PUT のみ使用**。PATCH（部分更新）は使わない。
- `optional()` は「省略可能」、`nullable()` は「null 許容」。DB の NOT NULL に合わせる。
- レスポンス型は Drizzle の `$inferSelect` で代用できる場合はスキーマ定義不要。

---

## バリデーションメッセージ

- **日本語**で記述する
- フォーマット: `{フィールド名}は〜` ではなく端的に `〜は必須です` `〜文字以内で入力してください`

---

## Zod バリデーション結果の AppError 変換

`+server.ts` 内でのエラー変換パターン（→ `api-patterns.md` 参照）：

```typescript
const result = schema.safeParse(body);
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
```

---

## なぜ必要か

- scaffold-be / scaffold-fe スキルがスキーマコードを生成する際の規約
- FE/BE 間で同じ `schema.ts` を参照することでバリデーション重複を防ぐ

## 参照するスキル

- scaffold-be, scaffold-fe, scaffold-test-unit
