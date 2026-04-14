/**
 * @file テスト: ExpenseSchema
 * @module src/routes/expenses/schema.test.ts
 * @testType unit
 *
 * @target ./schema.ts
 * @spec specs/expenses/spec.md
 * @covers AC-101, AC-102, AC-103, AC-104, AC-105, AC-121, AC-124, AC-201, AC-202
 */

import { describe, test, expect } from 'vitest';
import { expenseCreateSchema, expenseUpdateSchema, expenseQuerySchema } from './schema';

describe('expenseCreateSchema', () => {
	test('[SPEC: AC-201] 金額が 1 の場合、登録できる // spec:3b5175ed', () => {
		const result = expenseCreateSchema.safeParse({
			amount: 1,
			categoryId: 'cat-1',
			payerUserId: 'user-1'
		});
		expect(result.success).toBe(true);
	});

	test('[SPEC: AC-202] 金額が 9999999 の場合、登録できる // spec:3b5175ed', () => {
		const result = expenseCreateSchema.safeParse({
			amount: 9999999,
			categoryId: 'cat-1',
			payerUserId: 'user-1'
		});
		expect(result.success).toBe(true);
	});

	test('[SPEC: AC-101] 金額が未入力の場合は VALIDATION_ERROR になる // spec:c3faeddc', () => {
		const result = expenseCreateSchema.safeParse({
			categoryId: 'cat-1',
			payerUserId: 'user-1'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const amountError = result.error.issues.find((i) => i.path.includes('amount'));
			expect(amountError).toBeDefined();
			expect(amountError!.message).toBe('金額は必須です');
		}
	});

	test('[SPEC: AC-102] 金額が 0 以下の場合は VALIDATION_ERROR になる // spec:c3faeddc', () => {
		const result = expenseCreateSchema.safeParse({
			amount: 0,
			categoryId: 'cat-1',
			payerUserId: 'user-1'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const amountError = result.error.issues.find((i) => i.path.includes('amount'));
			expect(amountError).toBeDefined();
			expect(amountError!.message).toBe('1円以上の金額を入力してください');
		}
	});

	test('[SPEC: AC-102] 金額が -1 の場合は VALIDATION_ERROR になる // spec:c3faeddc', () => {
		const result = expenseCreateSchema.safeParse({
			amount: -1,
			categoryId: 'cat-1',
			payerUserId: 'user-1'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const amountError = result.error.issues.find((i) => i.path.includes('amount'));
			expect(amountError).toBeDefined();
		}
	});

	test('[SPEC: AC-103] 金額が 9999999 を超える場合は VALIDATION_ERROR になる // spec:c3faeddc', () => {
		const result = expenseCreateSchema.safeParse({
			amount: 10000000,
			categoryId: 'cat-1',
			payerUserId: 'user-1'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const amountError = result.error.issues.find((i) => i.path.includes('amount'));
			expect(amountError).toBeDefined();
			expect(amountError!.message).toBe('9,999,999円以下の金額を入力してください');
		}
	});

	test('[SPEC: AC-104] 金額が小数の場合は VALIDATION_ERROR になる // spec:c3faeddc', () => {
		const result = expenseCreateSchema.safeParse({
			amount: 1.5,
			categoryId: 'cat-1',
			payerUserId: 'user-1'
		});
		expect(result.success).toBe(false);
	});

	test('[SPEC: AC-104] 金額が文字列の場合は VALIDATION_ERROR になる // spec:c3faeddc', () => {
		const result = expenseCreateSchema.safeParse({
			amount: '1000',
			categoryId: 'cat-1',
			payerUserId: 'user-1'
		});
		expect(result.success).toBe(false);
	});

	test('[SPEC: AC-105] カテゴリ ID が未指定の場合は VALIDATION_ERROR になる // spec:c3faeddc', () => {
		const result = expenseCreateSchema.safeParse({
			amount: 1000,
			payerUserId: 'user-1'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const categoryError = result.error.issues.find((i) => i.path.includes('categoryId'));
			expect(categoryError).toBeDefined();
			expect(categoryError!.message).toBe('カテゴリは必須です');
		}
	});

	test('[SPEC: AC-105] カテゴリ ID が空文字の場合は VALIDATION_ERROR になる // spec:c3faeddc', () => {
		const result = expenseCreateSchema.safeParse({
			amount: 1000,
			categoryId: '',
			payerUserId: 'user-1'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const categoryError = result.error.issues.find((i) => i.path.includes('categoryId'));
			expect(categoryError).toBeDefined();
		}
	});

	test('[SPEC: AC-124] 支払者ユーザー ID が未指定の場合は VALIDATION_ERROR になる // spec:c3faeddc', () => {
		const result = expenseCreateSchema.safeParse({
			amount: 1000,
			categoryId: 'cat-1'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const payerError = result.error.issues.find((i) => i.path.includes('payerUserId'));
			expect(payerError).toBeDefined();
			expect(payerError!.message).toBe('支払者は必須です');
		}
	});

	test('[SPEC: AC-124] 支払者ユーザー ID が空文字の場合は VALIDATION_ERROR になる // spec:c3faeddc', () => {
		const result = expenseCreateSchema.safeParse({
			amount: 1000,
			categoryId: 'cat-1',
			payerUserId: ''
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const payerError = result.error.issues.find((i) => i.path.includes('payerUserId'));
			expect(payerError).toBeDefined();
		}
	});
});

describe('expenseUpdateSchema', () => {
	test('[SPEC: AC-201] 金額が 1 の場合、更新できる // spec:3b5175ed', () => {
		const result = expenseUpdateSchema.safeParse({
			amount: 1,
			categoryId: 'cat-1',
			payerUserId: 'user-1'
		});
		expect(result.success).toBe(true);
	});

	test('[SPEC: AC-202] 金額が 9999999 の場合、更新できる // spec:3b5175ed', () => {
		const result = expenseUpdateSchema.safeParse({
			amount: 9999999,
			categoryId: 'cat-1',
			payerUserId: 'user-1'
		});
		expect(result.success).toBe(true);
	});

	test('[SPEC: AC-101] 金額が未入力の場合は VALIDATION_ERROR になる // spec:c3faeddc', () => {
		const result = expenseUpdateSchema.safeParse({
			categoryId: 'cat-1',
			payerUserId: 'user-1'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const amountError = result.error.issues.find((i) => i.path.includes('amount'));
			expect(amountError).toBeDefined();
		}
	});

	test('[SPEC: AC-102] 金額が 0 以下の場合は VALIDATION_ERROR になる // spec:c3faeddc', () => {
		const result = expenseUpdateSchema.safeParse({
			amount: 0,
			categoryId: 'cat-1',
			payerUserId: 'user-1'
		});
		expect(result.success).toBe(false);
	});

	test('[SPEC: AC-103] 金額が 9999999 を超える場合は VALIDATION_ERROR になる // spec:c3faeddc', () => {
		const result = expenseUpdateSchema.safeParse({
			amount: 10000000,
			categoryId: 'cat-1',
			payerUserId: 'user-1'
		});
		expect(result.success).toBe(false);
	});
});

describe('expenseQuerySchema', () => {
	test('[SPEC: AC-121] 正常な月パラメータは parse できる // spec:c3faeddc', () => {
		const result = expenseQuerySchema.safeParse({ month: '2026-03' });
		expect(result.success).toBe(true);
	});

	test('[SPEC: AC-121] month が省略された場合は parse できる // spec:c3faeddc', () => {
		const result = expenseQuerySchema.safeParse({});
		expect(result.success).toBe(true);
	});

	test('[SPEC: AC-121] month の月部分が 13 の場合は VALIDATION_ERROR になる // spec:c3faeddc', () => {
		const result = expenseQuerySchema.safeParse({ month: '2026-13' });
		expect(result.success).toBe(false);
		if (!result.success) {
			const monthError = result.error.issues.find((i) => i.path.includes('month'));
			expect(monthError).toBeDefined();
			expect(monthError!.message).toBe('月は01〜12で入力してください');
		}
	});

	test('[SPEC: AC-121] month の月部分が 00 の場合は VALIDATION_ERROR になる // spec:c3faeddc', () => {
		const result = expenseQuerySchema.safeParse({ month: '2026-00' });
		expect(result.success).toBe(false);
		if (!result.success) {
			const monthError = result.error.issues.find((i) => i.path.includes('month'));
			expect(monthError).toBeDefined();
			expect(monthError!.message).toBe('月は01〜12で入力してください');
		}
	});

	test('[SPEC: AC-121] month の形式が不正（YYYY-M）の場合は VALIDATION_ERROR になる // spec:c3faeddc', () => {
		const result = expenseQuerySchema.safeParse({ month: '2026-3' });
		expect(result.success).toBe(false);
	});
});
