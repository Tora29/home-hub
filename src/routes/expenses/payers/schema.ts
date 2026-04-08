/**
 * @file スキーマ: ExpensePayer
 * @module src/routes/expenses/payers/schema.ts
 * @feature expenses
 *
 * @description
 * 支払者スキーマの再エクスポート。本体は ../schema.ts に定義。
 *
 * @spec specs/expenses/spec.md - Schema セクション
 */
export {
	payerCreateSchema,
	payerUpdateSchema,
	type PayerCreate,
	type PayerUpdate
} from '../schema';
