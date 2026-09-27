/**
 * @file テスト: 支出 API ハンドラ
 * @module src/routes/expenses/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect } from 'vitest';
import { GET, POST } from './+server';

type Handler = typeof GET;
type ErrorBody = { code: string; fields: { field: string; message: string }[] };

const mockLocals = { user: { id: 'test-user-id' } };
const mockPlatform = { env: { DB: {} } };

async function callGet(query: string) {
	return GET({
		url: new URL(`http://localhost/expenses${query}`),
		locals: mockLocals,
		platform: mockPlatform
	} as unknown as Parameters<Handler>[0]);
}

async function callPost(body: string, contentType = 'application/json') {
	const request = new Request('http://localhost/expenses', {
		method: 'POST',
		headers: { 'Content-Type': contentType },
		body
	});
	return POST({ request, locals: mockLocals, platform: mockPlatform } as unknown as Parameters<
		typeof POST
	>[0]);
}

describe('GET /expenses', () => {
	test('month の形式が不正な場合、400 VALIDATION_ERROR「月の形式は YYYY-MM です」が返る', async () => {
		const response = await callGet('?month=2024/03');
		expect(response.status).toBe(400);
		const body = (await response.json()) as ErrorBody;
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toContainEqual({ field: 'month', message: '月の形式は YYYY-MM です' });
	});

	test('month の月が13の場合、400 VALIDATION_ERROR「月は01〜12で入力してください」が返る', async () => {
		const response = await callGet('?month=2024-13');
		expect(response.status).toBe(400);
		const body = (await response.json()) as ErrorBody;
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toContainEqual({ field: 'month', message: '月は01〜12で入力してください' });
	});

	test('page が0の場合、400 VALIDATION_ERROR「page は1以上の整数です」が返る', async () => {
		const response = await callGet('?page=0');
		expect(response.status).toBe(400);
		const body = (await response.json()) as ErrorBody;
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toContainEqual({ field: 'page', message: 'page は1以上の整数です' });
	});
});

describe('POST /expenses', () => {
	test('リクエストボディが JSON でない場合、400 VALIDATION_ERROR が返る', async () => {
		const response = await callPost('not json', 'text/plain');
		expect(response.status).toBe(400);
		const body = (await response.json()) as ErrorBody;
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([]);
	});

	test('金額が未指定の場合、400 VALIDATION_ERROR「金額は必須です」が返る', async () => {
		const response = await callPost(JSON.stringify({ categoryId: 'cat-1', payerUserId: 'user-1' }));
		expect(response.status).toBe(400);
		const body = (await response.json()) as ErrorBody;
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toContainEqual({ field: 'amount', message: '金額は必須です' });
	});

	test('金額が0の場合、400 VALIDATION_ERROR「1円以上の金額を入力してください」が返る', async () => {
		const response = await callPost(
			JSON.stringify({ amount: 0, categoryId: 'cat-1', payerUserId: 'user-1' })
		);
		expect(response.status).toBe(400);
		const body = (await response.json()) as ErrorBody;
		expect(body.fields).toContainEqual({
			field: 'amount',
			message: '1円以上の金額を入力してください'
		});
	});

	test('カテゴリが空文字の場合、400 VALIDATION_ERROR「カテゴリは必須です」が返る', async () => {
		const response = await callPost(
			JSON.stringify({ amount: 1000, categoryId: '', payerUserId: 'user-1' })
		);
		expect(response.status).toBe(400);
		const body = (await response.json()) as ErrorBody;
		expect(body.fields).toContainEqual({ field: 'categoryId', message: 'カテゴリは必須です' });
	});
});
