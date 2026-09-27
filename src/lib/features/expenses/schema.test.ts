/**
 * @file テスト: 支出スキーマ
 * @module src/lib/features/expenses/schema.test.ts
 * @testType unit
 *
 * @target ./schema.ts
 */
import { describe, test, expect } from 'vitest';
import { expenseQuerySchema, expenseCreateSchema } from './schema';

function messageOf(
	result: { error?: { issues: { path: PropertyKey[]; message: string }[] } },
	field: string
) {
	return result.error?.issues.find((i) => i.path[0] === field)?.message;
}

describe('expenseQuerySchema', () => {
	test('条件未指定の場合、1ページ目を20件ずつで一覧取得できる', () => {
		const result = expenseQuerySchema.safeParse({});
		expect(result.success).toBe(true);
		expect(result.data?.page).toBe(1);
		expect(result.data?.limit).toBe(20);
	});

	test('YYYY-MM 形式の月で絞り込みできる', () => {
		const result = expenseQuerySchema.safeParse({ month: '2024-03' });
		expect(result.success).toBe(true);
		expect(result.data?.month).toBe('2024-03');
	});

	test('URL で指定したページ番号・件数で一覧取得できる', () => {
		const result = expenseQuerySchema.safeParse({ page: '2', limit: '50' });
		expect(result.success).toBe(true);
		expect(result.data?.page).toBe(2);
		expect(result.data?.limit).toBe(50);
	});

	test('月の形式が YYYY-MM でない場合、VALIDATION_ERROR「月の形式は YYYY-MM です」が返る', () => {
		const result = expenseQuerySchema.safeParse({ month: '2024/03' });
		expect(result.success).toBe(false);
		expect(messageOf(result, 'month')).toBe('月の形式は YYYY-MM です');
	});

	test('月が00の場合、VALIDATION_ERROR「月は01〜12で入力してください」が返る', () => {
		const result = expenseQuerySchema.safeParse({ month: '2024-00' });
		expect(result.success).toBe(false);
		expect(messageOf(result, 'month')).toBe('月は01〜12で入力してください');
	});

	test('月が13の場合、VALIDATION_ERROR「月は01〜12で入力してください」が返る', () => {
		const result = expenseQuerySchema.safeParse({ month: '2024-13' });
		expect(result.success).toBe(false);
		expect(messageOf(result, 'month')).toBe('月は01〜12で入力してください');
	});

	test('ページ番号が0の場合、VALIDATION_ERROR「page は1以上の整数です」が返る', () => {
		const result = expenseQuerySchema.safeParse({ page: '0' });
		expect(result.success).toBe(false);
		expect(messageOf(result, 'page')).toBe('page は1以上の整数です');
	});

	test('ページ番号が数値でない場合、VALIDATION_ERROR「page は数値で入力してください」が返る', () => {
		const result = expenseQuerySchema.safeParse({ page: 'abc' });
		expect(result.success).toBe(false);
		expect(messageOf(result, 'page')).toBe('page は数値で入力してください');
	});

	test('件数が100の場合、一覧取得できる', () => {
		const result = expenseQuerySchema.safeParse({ limit: '100' });
		expect(result.success).toBe(true);
	});

	test('件数が101の場合、VALIDATION_ERROR「limit は1〜100の整数です」が返る', () => {
		const result = expenseQuerySchema.safeParse({ limit: '101' });
		expect(result.success).toBe(false);
		expect(messageOf(result, 'limit')).toBe('limit は1〜100の整数です');
	});

	test('件数が0の場合、VALIDATION_ERROR「limit は1〜100の整数です」が返る', () => {
		const result = expenseQuerySchema.safeParse({ limit: '0' });
		expect(result.success).toBe(false);
		expect(messageOf(result, 'limit')).toBe('limit は1〜100の整数です');
	});
});

describe('expenseCreateSchema', () => {
	const validData = { amount: 1000, categoryId: 'cat-1', payerUserId: 'user-1' };

	test('正しいデータで支出を登録できる', () => {
		const result = expenseCreateSchema.safeParse(validData);
		expect(result.success).toBe(true);
	});

	test('金額が未入力の場合、VALIDATION_ERROR「金額は必須です」が返る', () => {
		const result = expenseCreateSchema.safeParse({ categoryId: 'cat-1', payerUserId: 'user-1' });
		expect(result.success).toBe(false);
		expect(messageOf(result, 'amount')).toBe('金額は必須です');
	});

	test('金額が文字列の場合、VALIDATION_ERROR「金額は数値で入力してください」が返る', () => {
		const result = expenseCreateSchema.safeParse({ ...validData, amount: '1000' });
		expect(result.success).toBe(false);
		expect(messageOf(result, 'amount')).toBe('金額は数値で入力してください');
	});

	test('金額が0の場合、VALIDATION_ERROR「1円以上の金額を入力してください」が返る', () => {
		const result = expenseCreateSchema.safeParse({ ...validData, amount: 0 });
		expect(result.success).toBe(false);
		expect(messageOf(result, 'amount')).toBe('1円以上の金額を入力してください');
	});

	test('金額が1円の場合、登録できる', () => {
		const result = expenseCreateSchema.safeParse({ ...validData, amount: 1 });
		expect(result.success).toBe(true);
	});

	test('金額が9,999,999円の場合、登録できる', () => {
		const result = expenseCreateSchema.safeParse({ ...validData, amount: 9999999 });
		expect(result.success).toBe(true);
	});

	test('金額が10,000,000円の場合、VALIDATION_ERROR「9,999,999円以下の金額を入力してください」が返る', () => {
		const result = expenseCreateSchema.safeParse({ ...validData, amount: 10000000 });
		expect(result.success).toBe(false);
		expect(messageOf(result, 'amount')).toBe('9,999,999円以下の金額を入力してください');
	});

	test('金額が小数の場合、VALIDATION_ERROR「金額は整数で入力してください」が返る', () => {
		const result = expenseCreateSchema.safeParse({ ...validData, amount: 1.5 });
		expect(result.success).toBe(false);
		expect(messageOf(result, 'amount')).toBe('金額は整数で入力してください');
	});

	test('カテゴリが未入力の場合、VALIDATION_ERROR「カテゴリは必須です」が返る', () => {
		const result = expenseCreateSchema.safeParse({ amount: 1000, payerUserId: 'user-1' });
		expect(result.success).toBe(false);
		expect(messageOf(result, 'categoryId')).toBe('カテゴリは必須です');
	});

	test('カテゴリが空文字の場合、VALIDATION_ERROR「カテゴリは必須です」が返る', () => {
		const result = expenseCreateSchema.safeParse({ ...validData, categoryId: '' });
		expect(result.success).toBe(false);
		expect(messageOf(result, 'categoryId')).toBe('カテゴリは必須です');
	});

	test('支払者が未入力の場合、VALIDATION_ERROR「支払者は必須です」が返る', () => {
		const result = expenseCreateSchema.safeParse({ amount: 1000, categoryId: 'cat-1' });
		expect(result.success).toBe(false);
		expect(messageOf(result, 'payerUserId')).toBe('支払者は必須です');
	});

	test('支払者が空文字の場合、VALIDATION_ERROR「支払者は必須です」が返る', () => {
		const result = expenseCreateSchema.safeParse({ ...validData, payerUserId: '' });
		expect(result.success).toBe(false);
		expect(messageOf(result, 'payerUserId')).toBe('支払者は必須です');
	});
});
