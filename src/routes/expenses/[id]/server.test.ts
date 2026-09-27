/**
 * @file テスト: 支出詳細 API ハンドラ
 * @module src/routes/expenses/[id]/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect } from 'vitest';
import { PUT } from './+server';

type ErrorBody = { code: string; fields: { field: string; message: string }[] };

async function callPut(body: unknown) {
	const request = new Request('http://localhost/expenses/expense-1', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	return PUT({
		request,
		params: { id: 'expense-1' },
		locals: { user: { id: 'test-user-id' } },
		platform: { env: { DB: {} } }
	} as unknown as Parameters<typeof PUT>[0]);
}

describe('PUT /expenses/[id]', () => {
	test('金額が未指定の場合、400 VALIDATION_ERROR「金額は必須です」が返る', async () => {
		const response = await callPut({ categoryId: 'cat-1', payerUserId: 'user-1' });
		expect(response.status).toBe(400);
		const body = (await response.json()) as ErrorBody;
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toContainEqual({ field: 'amount', message: '金額は必須です' });
	});

	test('金額が0の場合、400 VALIDATION_ERROR「1円以上の金額を入力してください」が返る', async () => {
		const response = await callPut({ amount: 0, categoryId: 'cat-1', payerUserId: 'user-1' });
		expect(response.status).toBe(400);
		const body = (await response.json()) as ErrorBody;
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toContainEqual({
			field: 'amount',
			message: '1円以上の金額を入力してください'
		});
	});

	test('支払者が未指定の場合、400 VALIDATION_ERROR「支払者は必須です」が返る', async () => {
		const response = await callPut({ amount: 1000, categoryId: 'cat-1' });
		expect(response.status).toBe(400);
		const body = (await response.json()) as ErrorBody;
		expect(body.fields).toContainEqual({ field: 'payerUserId', message: '支払者は必須です' });
	});
});
