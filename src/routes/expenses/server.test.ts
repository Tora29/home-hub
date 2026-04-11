/**
 * @file テスト: API Expense
 * @module src/routes/expenses/+server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/expenses/spec.md
 * @covers AC-101, AC-102, AC-103, AC-104, AC-105, AC-121, AC-124
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn().mockReturnValue({})
}));

vi.mock('./service', () => ({
	getExpenses: vi.fn(),
	createExpense: vi.fn()
}));

import { GET, POST } from './+server';

const mockLocals = { user: { id: 'user-1' } };
const mockPlatform = { env: { DB: {} } };

function makePostRequest(body: unknown): Request {
	return new Request('http://localhost/expenses', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

function makeGetUrl(params: Record<string, string> = {}): URL {
	const url = new URL('http://localhost/expenses');
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value);
	}
	return url;
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('GET /expenses - バリデーション', () => {
	test('[SPEC: AC-121] month が 2026-13 の場合、400 VALIDATION_ERROR を返す', async () => {
		const response = await GET({
			url: makeGetUrl({ month: '2026-13' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.message).toBe('入力値が正しくありません');
	});

	test('[SPEC: AC-121] month が 2026-00 の場合、400 VALIDATION_ERROR を返す', async () => {
		const response = await GET({
			url: makeGetUrl({ month: '2026-00' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('[SPEC: AC-121] month が YYYY-MM 形式でない場合、400 VALIDATION_ERROR を返す', async () => {
		const response = await GET({
			url: makeGetUrl({ month: '2026/04' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});
});

describe('POST /expenses - バリデーション', () => {
	test('[SPEC: AC-101] 金額が未入力の場合、400 VALIDATION_ERROR を返す', async () => {
		const response = await POST({
			request: makePostRequest({ categoryId: 'cat-1', payerUserId: 'user-2' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.message).toBe('入力値が正しくありません');
		expect(body.fields).toContainEqual({ field: 'amount', message: '金額は必須です' });
	});

	test('[SPEC: AC-102] 金額が0の場合、400 VALIDATION_ERROR を返す', async () => {
		const response = await POST({
			request: makePostRequest({ amount: 0, categoryId: 'cat-1', payerUserId: 'user-2' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toContainEqual({
			field: 'amount',
			message: '1円以上の金額を入力してください'
		});
	});

	test('[SPEC: AC-103] 金額が9,999,999を超える場合、400 VALIDATION_ERROR を返す', async () => {
		const response = await POST({
			request: makePostRequest({ amount: 10000000, categoryId: 'cat-1', payerUserId: 'user-2' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toContainEqual({
			field: 'amount',
			message: '9,999,999円以下の金額を入力してください'
		});
	});

	test('[SPEC: AC-104] 金額が文字列の場合、400 VALIDATION_ERROR を返す', async () => {
		const response = await POST({
			request: makePostRequest({ amount: '千円', categoryId: 'cat-1', payerUserId: 'user-2' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('[SPEC: AC-104] 金額が小数の場合、400 VALIDATION_ERROR を返す', async () => {
		const response = await POST({
			request: makePostRequest({ amount: 100.5, categoryId: 'cat-1', payerUserId: 'user-2' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('[SPEC: AC-105] カテゴリIDが未指定の場合、400 VALIDATION_ERROR を返す', async () => {
		const response = await POST({
			request: makePostRequest({ amount: 1000, payerUserId: 'user-2' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toContainEqual({ field: 'categoryId', message: 'カテゴリは必須です' });
	});

	test('[SPEC: AC-105] カテゴリIDが空文字の場合、400 VALIDATION_ERROR を返す', async () => {
		const response = await POST({
			request: makePostRequest({ amount: 1000, categoryId: '', payerUserId: 'user-2' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toContainEqual({ field: 'categoryId', message: 'カテゴリは必須です' });
	});

	test('[SPEC: AC-124] 支払者ユーザーIDが未指定の場合、400 VALIDATION_ERROR を返す', async () => {
		const response = await POST({
			request: makePostRequest({ amount: 1000, categoryId: 'cat-1' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toContainEqual({ field: 'payerUserId', message: '支払者は必須です' });
	});

	test('[SPEC: AC-124] 支払者ユーザーIDが空文字の場合、400 VALIDATION_ERROR を返す', async () => {
		const response = await POST({
			request: makePostRequest({ amount: 1000, categoryId: 'cat-1', payerUserId: '' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toContainEqual({ field: 'payerUserId', message: '支払者は必須です' });
	});
});
