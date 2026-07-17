# Drizzle ORM

Cloudflare D1（SQLite）+ Drizzle ORM の実装規約。

---

## テーブル定義（`src/lib/server/tables.ts`）

### 基本構成

全テーブルは `src/lib/server/tables.ts` に集約する。機能ごとにファイルを分けない。

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
```

### カラム型

| D1 型          | Drizzle 記法                            | 用途                        |
| -------------- | --------------------------------------- | --------------------------- |
| TEXT           | `text('col')`                           | 文字列・ID・UUID・JSON格納  |
| INTEGER        | `integer('col')`                        | 整数                        |
| INTEGER (bool) | `integer('col', { mode: 'boolean' })`   | boolean（0/1 ↔ true/false） |
| INTEGER (date) | `integer('col', { mode: 'timestamp' })` | 日時（Unix秒 ↔ Date）       |

### ID 生成

**`crypto.randomUUID()`** を全エンティティで統一する。nanoid は使わない。

```typescript
// service.ts の insert 直前
const id = crypto.randomUUID();
```

### JSON 格納

D1 は JSON 型を持たないため `text` カラムに JSON 文字列で格納する。
カラム定義のコメントに型を明記する。

```typescript
// tables.ts
ingredients: text('ingredients'),  // JSON: { name: string; amount?: string }[]
steps: text('steps'),              // JSON: string[]
```

取得後は `parseRow` 関数で `JSON.parse` する（→ 後述）。

### 外部キー

削除時の振る舞いを明記する（`onDelete: 'cascade' | 'restrict' | 'set null'`）。

```typescript
categoryId: text('categoryId')
  .notNull()
  .references(() => expenseCategory.id, { onDelete: 'restrict' }),
```

---

## サービス層クエリパターン

### DB 型

```typescript
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from '$lib/server/tables';

type Db = DrizzleD1Database<typeof schema>;
```

### parseRow（JSON カラムの変換）

JSON カラムを含むテーブルは `parseRow` 関数を用意し、取得行を必ず通す。

```typescript
function parseRow(row: typeof recipe.$inferSelect): Recipe {
	return {
		...row,
		ingredients: row.ingredients ? (JSON.parse(row.ingredients) as Ingredient[]) : null,
		steps: row.steps ? (JSON.parse(row.steps) as string[]) : null
	};
}

// 使用例
const rows = await db.select().from(recipe).where(where);
return rows.map(parseRow);
```

保存時は `JSON.stringify` する。

```typescript
ingredients: data.ingredients ? JSON.stringify(data.ingredients) : null,
```

### SELECT フィールド抽出（JOIN 時）

JOIN で必要なフィールドだけ取得する場合は `expenseSelectFields` のような定数で定義し再利用する。

```typescript
const expenseSelectFields = {
	id: expense.id,
	amount: expense.amount,
	category: {
		id: expenseCategory.id,
		name: expenseCategory.name
	},
	payer: {
		id: userTable.id,
		name: userTable.name
	}
};
```

### JOIN パターン

```typescript
// INNER JOIN（必ず存在する外部キー）
.innerJoin(expenseCategory, eq(expense.categoryId, expenseCategory.id))

// LEFT JOIN（null 許容の外部キー）
.leftJoin(userTable, eq(expense.payerUserId, userTable.id))
```

LEFT JOIN の結果は null チェックが必要。

```typescript
payer: row.payer?.id ? (row.payer as User) : null;
```

### COUNT / SUM

```typescript
const [{ total }] = await db
	.select({ total: sql<number>`count(*)` })
	.from(recipe)
	.where(where);
// Number() で明示的に変換（D1 は string で返す場合がある）
return Number(total);

// 複数集計の同時取得
const [stats] = await db
	.select({
		total: sql<number>`count(*)`,
		monthTotal: sql<number>`coalesce(sum(${expense.amount}), 0)`
	})
	.from(expense)
	.where(monthFilter);
```

### ORDER BY

ソート条件が複数パターンある場合は `switch` で `SQL[]` を組み立てる。

```typescript
let orderBy: SQL<unknown>[];
switch (sort) {
	case 'lastCookedAt_asc':
		orderBy = [
			sql`CASE WHEN ${recipe.lastCookedAt} IS NULL THEN 0 ELSE 1 END`,
			asc(recipe.lastCookedAt)
		];
		break;
	case 'cookedCount_desc':
		orderBy = [desc(recipe.cookedCount)];
		break;
	default: // createdAt_desc
		orderBy = [desc(recipe.createdAt), desc(sql`rowid`)];
}

const rows = await db
	.select()
	.from(recipe)
	.orderBy(...orderBy);
```

同一 `createdAt` の安定ソートに `desc(sql\`rowid\`)` を末尾に加える。

### 単一行取得

`.get()` を使い、null のときは `AppError('NOT_FOUND')` を throw する。

```typescript
const row = await db.select().from(recipe).where(and(...)).get();
if (!row) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');
```

### ページネーション

```typescript
const offset = (page - 1) * limit;
const limit = Math.min(options.limit ?? 20, 100); // 最大 100 上限

await db.select().from(recipe).where(where).limit(limit).offset(offset);
```

### 更新（undefined フィールドを保持する）

PUT（全フィールド必須）でも optional フィールドは `undefined` のとき既存値を維持する。

```typescript
await db
	.update(recipe)
	.set({
		name: data.name,
		description: data.description !== undefined ? data.description : existing.description
		// data.description が undefined → existing.description を保持
		// data.description が null → DB を null に更新
	})
	.where(eq(recipe.id, id));
```

---

## トランザクション非対応（D1 制約）

Cloudflare D1 は `BEGIN` トランザクションを未サポート。

**対策**: DB 更新を先行し、外部 API 呼び出し（LINE等）は後続でベストエフォート実行する。
失敗しても DB の状態は正しいため、通知失敗はログのみで飲み込む。

```typescript
// DB 更新を先行（状態の正確性を優先）
await db.update(expense).set({ status: 'pending' }).where(...);

// 外部 API はベストエフォート
try {
  await sendLineMessage(...);
} catch (e) {
  console.error('[LINE] 送信失敗:', e);
  // throw しない
}
```

---

## マイグレーション

```bash
# スキーマ変更後: マイグレーションファイル生成
npx drizzle-kit generate

# ローカル D1 への適用
make db-migrate

# 本番 D1 への適用
make db-migrate-remote

# 両方まとめて適用
make db-migrate-all
```

- マイグレーションファイルは `drizzle/migrations/` に出力される（Git 管理対象）
- `drizzle.config.ts` のスキーマパスは `./src/lib/server/tables.ts`

---

## 型の活用

```typescript
// テーブル行の型（DB から取得した生の型）
type RecipeRow = typeof recipe.$inferSelect;

// insert 用の型
type RecipeInsert = typeof recipe.$inferInsert;
```

ビジネスロジック層で使うアプリ型（JSON カラムを parse 済み）は `type Recipe = { ... }` として別定義する。

---

## なぜ必要か

- D1 固有の制約（JSON格納・トランザクション非対応）を統一するため
