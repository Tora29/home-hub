/**
 * @file テスト: 支出スキーマ
 * @module src/routes/expenses/schema.test.ts
 * @testType unit
 *
 * @target ./schema.ts
 */
import { describe, test, expect } from 'vitest';
import { expenseQuerySchema, expenseCreateSchema } from './schema';

describe('expenseQuerySchema', () => {
	test('パラメータなしでデフォルト値を適用できる', () => {
		const result = expenseQuerySchema.safeParse({});
		expect(result.success).toBe(true);
		expect(result.data?.page).toBe(1);
		expect(result.data?.limit).toBe(20);
	});

	test('正しい月形式（YYYY-MM）でパースできる', () => {
		const result = expenseQuerySchema.safeParse({ month: '2024-03' });
		expect(result.success).toBe(true);
		expect(result.data?.month).toBe('2024-03');
	});

	test('月の形式が YYYY-MM でない場合、エラーが返る', () => {
		const result = expenseQuerySchema.safeParse({ month: '2024/03' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('月の形式は YYYY-MM です');
	});

	test('月が00の場合、エラーが返る', () => {
		const result = expenseQuerySchema.safeParse({ month: '2024-00' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('月は01〜12で入力してください');
	});

	test('月が13の場合、エラーが返る', () => {
		const result = expenseQuerySchema.safeParse({ month: '2024-13' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('月は01〜12で入力してください');
	});

	test('page が 0 の場合、エラーが返る', () => {
		const result = expenseQuerySchema.safeParse({ page: '0' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('page は1以上の整数です');
	});

	test('limit が 101 の場合、エラーが返る', () => {
		const result = expenseQuerySchema.safeParse({ limit: '101' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('limit は1〜100です');
	});

	test('page と limit の文字列を数値に変換できる', () => {
		const result = expenseQuerySchema.safeParse({ page: '2', limit: '50' });
		expect(result.success).toBe(true);
		expect(result.data?.page).toBe(2);
		expect(result.data?.limit).toBe(50);
	});
});

describe('expenseCreateSchema', () => {
	const validData = { amount: 1000, categoryId: 'cat-1', payerUserId: 'user-1' };

	test('正しいデータで支出を登録できる', () => {
		const result = expenseCreateSchema.safeParse(validData);
		expect(result.success).toBe(true);
	});

	test('金額が未入力の場合、「金額は必須です」エラーが返る', () => {
		const result = expenseCreateSchema.safeParse({ categoryId: 'cat-1', payerUserId: 'user-1' });
		expect(result.success).toBe(false);
		const issue = result.error?.issues.find((i) => i.path[0] === 'amount');
		expect(issue?.message).toBe('金額は必須です');
	});

	test('金額が0の場合、「1円以上の金額を入力してください」エラーが返る', () => {
		const result = expenseCreateSchema.safeParse({ ...validData, amount: 0 });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('1円以上の金額を入力してください');
	});

	test('金額が1の場合、登録できる', () => {
		const result = expenseCreateSchema.safeParse({ ...validData, amount: 1 });
		expect(result.success).toBe(true);
	});

	test('金額が9999999の場合、登録できる', () => {
		const result = expenseCreateSchema.safeParse({ ...validData, amount: 9999999 });
		expect(result.success).toBe(true);
	});

	test('金額が10000000の場合、エラーが返る', () => {
		const result = expenseCreateSchema.safeParse({ ...validData, amount: 10000000 });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('9,999,999円以下の金額を入力してください');
	});

	test('金額が小数の場合、エラーが返る', () => {
		const result = expenseCreateSchema.safeParse({ ...validData, amount: 1.5 });
		expect(result.success).toBe(false);
	});

	test('categoryId が未入力の場合、エラーが返る', () => {
		const result = expenseCreateSchema.safeParse({ amount: 1000, payerUserId: 'user-1' });
		expect(result.success).toBe(false);
		const issue = result.error?.issues.find((i) => i.path[0] === 'categoryId');
		expect(issue?.message).toBe('カテゴリは必須です');
	});

	test('categoryId が空文字の場合、「カテゴリは必須です」エラーが返る', () => {
		const result = expenseCreateSchema.safeParse({ ...validData, categoryId: '' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('カテゴリは必須です');
	});

	test('payerUserId が未入力の場合、エラーが返る', () => {
		const result = expenseCreateSchema.safeParse({ amount: 1000, categoryId: 'cat-1' });
		expect(result.success).toBe(false);
		const issue = result.error?.issues.find((i) => i.path[0] === 'payerUserId');
		expect(issue?.message).toBe('支払者は必須です');
	});

	test('payerUserId が空文字の場合、「支払者は必須です」エラーが返る', () => {
		const result = expenseCreateSchema.safeParse({ ...validData, payerUserId: '' });
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].message).toBe('支払者は必須です');
	});
});
