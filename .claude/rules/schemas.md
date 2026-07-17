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
- レスポンス型は Drizzle の `$inferSelect` で代用できる場合はスキーマ定義不要。

### `optional()` / `nullable()` / `nullish()` の使い分け

| 修飾子        | 意味                                           | DB との対応                                |
| ------------- | ---------------------------------------------- | ------------------------------------------ |
| `.optional()` | フィールド自体を省略可能（`undefined` を許容） | PUT 以外のリクエストで省略可能なフィールド |
| `.nullable()` | `null` を許容                                  | DB の NULL 許容カラム                      |
| `.nullish()`  | `undefined` と `null` の両方を許容             | 省略もクリアもできるフィールド             |

```typescript
// DB NOT NULL → .optional() のみ（省略時はデフォルト値を使用）
memo: z.string().max(500).optional();

// DB NULL 許容 → .nullable()（明示的に null を送れる）
payerUserId: z.string().nullable();

// 省略もクリアも可 → .nullish()
lastCookedAt: z.string().nullish();
```

### URL クエリパラメータの型変換

クエリパラメータはすべて文字列で届くため、`z.coerce` で型変換する。

```typescript
export const listQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	sort: z.enum(['createdAt_desc', 'cookedCount_desc']).default('createdAt_desc'),
	month: z
		.string()
		.regex(/^\d{4}-\d{2}$/, '月の形式は YYYY-MM です')
		.optional()
});
```

- `z.coerce.number()`: `"20"` → `20` に変換
- `.default(1)`: パラメータ未指定時のデフォルト値
- `.refine()`: カスタムバリデーション（月の範囲チェック等）が必要な場合に使う

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

## Database Constraints 設計指針

DB レベルの制約（UNIQUE, INDEX, FOREIGN KEY）の設計方針。

### 制約種別と適用基準

| 制約種別    | いつ適用するか                 | 注意点                                     |
| ----------- | ------------------------------ | ------------------------------------------ |
| UNIQUE      | 業務上重複を許さない組み合わせ | 複数カラムの複合ユニークも考慮             |
| INDEX       | 頻繁に検索・ソートするカラム   | 過剰なインデックスは書き込みを遅くする     |
| FOREIGN KEY | 他テーブルを参照するカラム     | 削除時の振る舞い（CASCADE/RESTRICT）を明記 |

### UNIQUE 制約の設計

- ユニーク制約は「業務上重複を許さない」場合のみ適用
- 複数カラムの複合ユニークは `(col1, col2)` の形式で記述
- 例: 同一ユーザー内で名前がユニーク → `(userId, name)`

### INDEX の設計

- 頻繁に検索・ソートするカラムにインデックスを作成
- 主な対象:
  - 外部キー（`userId`, `categoryId` 等）
  - 日時カラム（`createdAt`, `dueDate` 等）
  - ステータスカラム（`status` 等）
- 過剰なインデックスは書き込みを遅くするため、必要最小限にする

### FOREIGN KEY の設計

- 他テーブルを参照するカラムには外部キー制約を設定
- 削除時の振る舞いを明記:
  - `CASCADE`: 親削除時に子も削除
  - `RESTRICT`: 親削除時にエラー（使用中）
  - `SET NULL`: 親削除時に子を null に

---

## なぜ必要か

- FE/BE 間で同じ `schema.ts` を参照することでバリデーション重複を防ぐ
- DB レベルの制約設計を明文化し、UNIQUE/INDEX/FOREIGN KEY の判断基準をぶれさせないため
