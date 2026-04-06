/**
 * @file テスト: API Expense
 * @module src/routes/expense/+server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/expenses/spec.md
 * @covers AC-101, AC-102, AC-103, AC-104, AC-105, AC-115
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
import * as service from './service';

const mockLocals = { user: { id: 'user-1' } };
const mockPlatform = { env: { DB: {} } };

function makePostRequest(body: unknown): Request {
	return new Request('http://localhost/expense', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

function makeGetUrl(params: Record<string, string> = {}): URL {
	const url = new URL('http://localhost/expense');
	for (const [key, value] of Object.entries(params)) {
		url.searchParams.set(key, value);
	}
	return url;
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('GET /expense', () => {
	test('[SPEC: AC-001] 支出一覧を取得できる', async () => {
		const mockResponse = { items: [], total: 0, page: 1, limit: 20, monthTotal: 0 };
		vi.mocked(service.getExpenses).mockResolvedValueOnce(mockResponse);

		const response = await GET({
			url: makeGetUrl(),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toHaveProperty('items');
		expect(body).toHaveProperty('total');
		expect(body).toHaveProperty('monthTotal');
	});

	test('[SPEC: AC-002] month クエリパラメータを指定して支出一覧を取得できる', async () => {
		const mockResponse = { items: [], total: 0, page: 1, limit: 20, monthTotal: 0 };
		vi.mocked(service.getExpenses).mockResolvedValueOnce(mockResponse);

		const response = await GET({
			url: makeGetUrl({ month: '2026-01' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(200);
	});
});

describe('POST /expense', () => {
	test('[SPEC: AC-101] 金額が未入力の場合、400 VALIDATION_ERROR を返す', async () => {
		const response = await POST({
			request: makePostRequest({ categoryId: 'cat-1' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.message).toBe('入力値が正しくありません');
		expect(body.fields).toContainEqual({ field: 'amount', message: '金額は必須です' });
	});

	test('[SPEC: AC-102] 金額が0の場合、400 VALIDATION_ERROR を返す', async () => {
		const response = await POST({
			request: makePostRequest({ amount: 0, categoryId: 'cat-1' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof GET>[0]);

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
			request: makePostRequest({ amount: 10000000, categoryId: 'cat-1' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof GET>[0]);

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
			request: makePostRequest({ amount: '千円', categoryId: 'cat-1' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('[SPEC: AC-104] 金額が小数の場合、400 VALIDATION_ERROR を返す', async () => {
		const response = await POST({
			request: makePostRequest({ amount: 100.5, categoryId: 'cat-1' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('[SPEC: AC-105] カテゴリIDが未指定の場合、400 VALIDATION_ERROR を返す', async () => {
		const response = await POST({
			request: makePostRequest({ amount: 1000 }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toContainEqual({ field: 'categoryId', message: 'カテゴリは必須です' });
	});

	test('[SPEC: AC-105] カテゴリIDが空文字の場合、400 VALIDATION_ERROR を返す', async () => {
		const response = await POST({
			request: makePostRequest({ amount: 1000, categoryId: '' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toContainEqual({ field: 'categoryId', message: 'カテゴリは必須です' });
	});

	test('[SPEC: AC-115] 支払者IDが未指定の場合、400 VALIDATION_ERROR を返す', async () => {
		const response = await POST({
			request: makePostRequest({ amount: 1000, categoryId: 'cat-1' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toContainEqual({ field: 'payerId', message: '支払者は必須です' });
	});

	test('[SPEC: AC-115] 支払者IDが空文字の場合、400 VALIDATION_ERROR を返す', async () => {
		const response = await POST({
			request: makePostRequest({ amount: 1000, categoryId: 'cat-1', payerId: '' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toContainEqual({ field: 'payerId', message: '支払者は必須です' });
	});

	test('[SPEC: AC-003] 正しいデータの場合、201 を返す', async () => {
		const mockCreated = {
			id: 'exp-1',
			userId: 'user-1',
			amount: 1000,
			categoryId: 'cat-1',
			payerId: 'payer-1',
			approvedAt: null,
			finalizedAt: null,
			createdAt: new Date('2026-03-28T00:00:00.000Z'),
			category: {
				id: 'cat-1',
				userId: 'user-1',
				name: '食費',
				createdAt: new Date('2026-03-01T00:00:00.000Z')
			},
			payer: {
				id: 'payer-1',
				userId: 'user-1',
				name: '田中',
				createdAt: new Date('2026-03-01T00:00:00.000Z')
			}
		};
		vi.mocked(service.createExpense).mockResolvedValueOnce(mockCreated);

		const response = await POST({
			request: makePostRequest({ amount: 1000, categoryId: 'cat-1', payerId: 'payer-1' }),
			locals: mockLocals,
			platform: mockPlatform
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(201);
		const body = await response.json();
		expect(body.amount).toBe(1000);
		expect(body.categoryId).toBe('cat-1');
	});
});
