# Drizzle ORM

Cloudflare D1（SQLite）+ Drizzle ORM の実装規約。

---

## テーブル定義（`src/lib/server/tables.ts`）

### 基本構成

全テーブルは `src/lib/server/tables.ts` に集約する。機能ごとにファイルを分けない。

```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
```

### カラム型

| D1 型          | Drizzle 記法                               | 用途                                  |
| -------------- | ------------------------------------------ | ------------------------------------- |
| TEXT           | `text('col')`                              | 文字列・ID・UUID・JSON格納            |
| INTEGER        | `integer('col')`                           | 整数（金額は円単位の整数で持つ）      |
| REAL           | `real('col')`                              | 小数（重量・体重等）                  |
| INTEGER (bool) | `integer('col', { mode: 'boolean' })`      | boolean（0/1 ↔ true/false）           |
| INTEGER (date) | `integer('col', { mode: 'timestamp' })`    | 日時（Unix **秒** ↔ Date）            |
| INTEGER (date) | `integer('col', { mode: 'timestamp_ms' })` | 日時（Unix ミリ秒 ↔ Date）※現状未使用 |

- 既存テーブルは `timestamp`（秒精度）で統一済み。新規テーブルも合わせる（秒未満の順序は `rowid` で担保 → 後述）
- 日付のみ（`YYYY-MM-DD`）で扱う値は `text` で持つ（タイムゾーン変換を避けるため）

### 日付・タイムゾーン

アプリの基準は **JST（Asia/Tokyo）固定**。本番の Workers は UTC、ローカルはホストの TZ（JST）で動くため、
実行環境の TZ に依存するコードを書かない。

- 月・日の計算は `src/lib/utils/date.ts` のヘルパーのみを使う（`getCurrentMonth` / `getTodayDate` / `getMonthRange` /
  `addMonths` / `formatYearMonth` / `formatMonthDay` / `generateMonthOptions`）
- `new Date(y, m, d)` / `getFullYear()` / `getMonth()` / `getDate()` / `toISOString().slice(0, 10)` で暦日を求めない
  （UTC とローカル時刻の差で月初 0〜9 時 JST の値が前月・前日になる）
- `timestamp` カラムの月フィルタは `getMonthRange(month)` の `start` / `end` で `gte` / `lt` する
- `text` の日付カラム（`YYYY-MM-DD`）の月フィルタは `${month}-01` 〜 `${addMonths(month, 1)}-01`（exclusive）
- SSR（UTC）とブラウザで表示がずれないよう、画面の日付整形も同ヘルパーを使う
- Integration テストは `npm run test:integration`（`TZ=UTC` 固定）で本番同等の UTC 環境で実行される

### ID 生成

**`crypto.randomUUID()`** を全エンティティで統一する。nanoid は使わない。

```typescript
// service.ts の insert 直前
const id = crypto.randomUUID();
```

### JSON 格納

D1 は JSON 型を持たないため `text` カラムに JSON 文字列で格納する（現状 JSON カラムはなし）。
追加する場合は `text('col', { mode: 'json' }).$type<T>()` を使い、Drizzle に parse / stringify を任せる。

```typescript
// tables.ts
tags: text('tags', { mode: 'json' }).$type<string[]>(),
```

- 手動 `JSON.parse` / `JSON.stringify` はしない（型と実データの乖離を防ぐ）
- 外部入力由来の JSON は保存前に Zod で検証する

### 外部キー

削除時の振る舞いを明記する（`onDelete: 'cascade' | 'restrict' | 'set null'`）。

```typescript
categoryId: text('categoryId')
  .notNull()
  .references(() => expenseCategory.id, { onDelete: 'restrict' }),
```

`restrict` の親を削除する service では、事前に参照件数を数えて `AppError('CONFLICT', 409, ...)` を throw する
（DB の FK エラーをそのまま 500 にしない）。

### INDEX

`schemas.md` の「INDEX の設計」に従い、テーブル定義の第 3 引数で宣言する。

> 既存の INDEX / UNIQUE（`idx_workout_record_*`・`uq_body_weight_user_date` 等）も `tables.ts` に宣言済み（SQL と名前・カラム完全一致）。
> 新規は `tables.ts` で宣言して `npm run db:generate` で生成する（手書き SQL を増やさない）。
> 旧機能の残骸 `Tag` / `Dish` / `DishTag`（drizzle 管理外）は `0020_drop_legacy_dish.sql` で削除済み。

```typescript
export const expense = sqliteTable('Expense', {/* ... */}, (t) => [
	index('Expense_createdAt_idx').on(t.createdAt)
]);
```

---

## サービス層クエリパターン

### DB 型

```typescript
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type * as schema from '$lib/server/tables';

type Db = DrizzleD1Database<typeof schema>;
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
// INNER JOIN（NOT NULL の外部キー）
.innerJoin(expenseCategory, eq(expense.categoryId, expenseCategory.id))
.innerJoin(userTable, eq(expense.payerUserId, userTable.id))

// LEFT JOIN（null 許容の外部キー）
.leftJoin(workoutExerciseCategory, eq(workoutExercise.categoryId, workoutExerciseCategory.id))
```

LEFT JOIN の結果は null チェックが必要。

```typescript
category: row.category?.id ? row.category : null;
```

### COUNT / SUM

件数は Drizzle の `count()` ヘルパーを使う（戻り値型が `number` に確定する）。

```typescript
import { count, sql } from 'drizzle-orm';

const [{ total }] = await db.select({ total: count() }).from(expense).where(where);

// 件数のみなら $count も可
const total = await db.$count(expense, where);

// SUM 等の生 SQL 集計は .mapWith(Number) で実行時にも数値化する
const [stats] = await db
	.select({
		total: count(),
		monthTotal: sql<number>`coalesce(sum(${expense.amount}), 0)`.mapWith(Number)
	})
	.from(expense)
	.where(monthFilter);
```

- `sql<number>` の型引数は**型注釈のみ**で実行時変換はしない。変換が必要な場合は `.mapWith(Number)` を付ける

### ORDER BY

ソート条件が複数パターンある場合は `switch` で `SQL[]` を組み立てる。

```typescript
let orderBy: SQL[];
switch (sort) {
	case 'amount_desc':
		orderBy = [desc(expense.amount)];
		break;
	default: // createdAt_desc
		orderBy = [desc(expense.createdAt), desc(sql`"Expense".rowid`)];
}

const rows = await db
	.select()
	.from(expense)
	.orderBy(...orderBy);
```

- 同一 `createdAt`（秒精度）の安定ソートに `rowid` を末尾に加える
- JOIN 時は `rowid` が曖昧になるため `"テーブル名".rowid` と修飾する
- NULL を末尾にしたい場合は `sql\`${col} IS NULL\``を先頭キーに置く（SQLite の`ASC` は NULL が先頭）

### 単一行取得

`.get()` を使い、null のときは `AppError('NOT_FOUND')` を throw する。

```typescript
const row = await db.select().from(expense).where(eq(expense.id, id)).get();
if (!row) throw new AppError('NOT_FOUND', 404, '該当データが見つかりません');
```

### ページネーション

```typescript
const page = options.page ?? 1;
const limit = Math.min(options.limit ?? 20, 100); // 最大 100 上限
const offset = (page - 1) * limit;

await db
	.select()
	.from(expense)
	.where(where)
	.orderBy(...orderBy)
	.limit(limit)
	.offset(offset);
```

- `orderBy` なしの `limit/offset` は順序不定のため必ず `orderBy` を付ける

### 更新（PUT = 完全置換）

PUT は完全置換のため、Update スキーマの全フィールドをそのまま `set` する（→ `schemas.md`）。

```typescript
await db
	.update(expense)
	.set({
		amount: data.amount,
		categoryId: data.categoryId,
		payerUserId: data.payerUserId
	})
	.where(eq(expense.id, id));
```

- 所有者チェック（`userId` 一致）は更新前に service で行う。不一致時のコードはデータの公開範囲で使い分ける
  - 個人データ（workout 系: 本人しか閲覧できない）→ where に `userId` を含めて取得し `AppError('NOT_FOUND')`（存在を隠蔽）
  - 世帯共有データ（expenses: 全員が閲覧できる）→ 取得後に `userId` を比較し `AppError('FORBIDDEN')`
- 他テーブル参照（`categoryId` 等）を受け取る場合、参照先が**同一ユーザー所有か**も検証する（他人のデータを紐付けさせない）

---

## トランザクション（D1 制約）

Cloudflare D1 は `BEGIN` / `db.transaction()` を未サポート。代わりに以下を使い分ける。

| ケース                               | 方法                                                           |
| ------------------------------------ | -------------------------------------------------------------- |
| 複数の DB 書き込みを原子的に行いたい | `db.batch([...])`（D1 の batch はまとめて 1 トランザクション） |
| DB 更新 + 外部 API（LINE 等）        | DB 更新を先行し、外部 API はベストエフォート                   |

```typescript
// 複数書き込み: batch（途中で失敗すると全体がロールバック）
// ※ approvalLog は説明用の仮テーブル
await db.batch([
	db.update(expense).set({ status: 'approved' }).where(inArray(expense.id, ids)),
	db.insert(approvalLog).values(logs)
]);
```

- `batch` 内のクエリは前のクエリ結果を参照できない。読み取り結果に依存する分岐は batch の前に済ませる

```typescript
// DB 更新を先行（状態の正確性を優先）
await db.update(expense).set({ status: 'pending' }).where(...);

// 外部 API はベストエフォート（→ external-integrations.md）
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
npm run db:generate

# ローカル D1 への適用
make db-migrate

# 本番 D1 への適用（通常は deploy ワークフローが自動実行）
make db-migrate-remote

# 両方まとめて適用
make db-migrate-all
```

- マイグレーションファイルは `drizzle/migrations/` に出力される（Git 管理対象）。生成後の SQL は必ず目視確認する
- SQL を手で書く必要がある場合（データ移行・管理外テーブルの DROP 等）も `npx drizzle-kit generate --custom --name xxx` で
  空ファイルを生成して書く。**ファイルを直接置かない**（`meta/_journal.json` / snapshot に載らず、以後の `db:generate` が壊れる）
- 適用済みのマイグレーション SQL は編集しない（wrangler は `d1_migrations` にファイル名で適用履歴を持つ）
- テーブル再作成を伴う変更では、D1 で効かない `PRAGMA foreign_keys=OFF` ではなく `PRAGMA defer_foreign_keys = on` を使う
  （drizzle-kit が生成する `PRAGMA foreign_keys=OFF/ON` は置き換える。違反が残ると migration 全体がロールバックされる。実例: `0019_user_fk.sql`）
- カラム削除は 2 リリースに分ける: ① `tables.ts` から外し、生成 SQL の `DROP COLUMN` は除外してリリース
  → ② 次リリースで `generate --custom` に `ALTER TABLE ... DROP COLUMN` を書く（旧コードが列を参照する間に消さないため）
  - 実例: `User.lineUserId`（① PR #66 → ② `0021_drop_user_line_user_id.sql`）
- 本番適用前は `wrangler d1 time-travel info home-hub` で復元ポイント（bookmark）を記録し、`wrangler d1 export home-hub --remote` でも退避する
- `drizzle.config.ts` のスキーマパスは `./src/lib/server/tables.ts`
- 本番は `.github/workflows/deploy.yml` がデプロイ前に `wrangler d1 migrations apply --remote` を実行する。
  カラム削除・リネーム等の破壊的変更は「新カラム追加 → コード移行 → 旧カラム削除」の複数リリースに分ける
- Integration テストは `vitest.integration.config.ts` が同じマイグレーションを Miniflare の D1 に適用する

---

## 型の活用

```typescript
// テーブル行の型（DB から取得した生の型）
type ExpenseRow = typeof expense.$inferSelect;

// insert 用の型
type ExpenseInsert = typeof expense.$inferInsert;
```

JOIN 結果等、テーブル行と形が異なるアプリ型は `types.ts` に別定義する。

---

## なぜ必要か

- D1 固有の制約（トランザクション非対応・batch・JSON格納）を統一するため
