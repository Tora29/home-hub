/**
 * @file テスト: Expense API ハンドラ
 * @module src/routes/expenses/+server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/expenses/spec.md
 * @covers AC-101, AC-102, AC-103, AC-104, AC-105, AC-121, AC-124
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// service はユニットテストでは呼ばれないことを確認（バリデーション失敗でショートサーキット）
vi.mock('./service', () => ({
	createExpense: vi.fn(),
	getExpenses: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn()
}));

function makeRequest(body: unknown): Request {
	return new Request('http://localhost/expenses', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

function makeGetRequest(search = ''): Request {
	return new Request(`http://localhost/expenses${search}`);
}

async function callPostHandler(body: unknown) {
	const { POST } = await import('./+server');
	const request = makeRequest(body);
	const locals = { user: { id: 'user-1' } };
	const platform = { env: { DB: {} } };
	// @ts-expect-error - simplified event
	return POST({ request, locals, platform });
}

async function callGetHandler(search = '') {
	const { GET } = await import('./+server');
	const url = new URL(`http://localhost/expenses${search}`);
	const locals = { user: { id: 'user-1' } };
	const platform = { env: { DB: {} } };
	// @ts-expect-error - simplified event
	return GET({ url, locals, platform });
}

describe('POST /expenses', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.mock('./service', () => ({ createExpense: vi.fn() }));
		vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
	});

	test('[SPEC: AC-101] 金額が未入力の場合は 400 VALIDATION_ERROR を返す // spec:8c47a574', async () => {
		const res = await callPostHandler({ categoryId: 'cat-1', payerUserId: 'user-1' });
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual(
			expect.arrayContaining([expect.objectContaining({ field: 'amount' })])
		);
	});

	test('[SPEC: AC-102] 金額が 0 以下の場合は 400 VALIDATION_ERROR を返す // spec:8c47a574', async () => {
		const res = await callPostHandler({ amount: 0, categoryId: 'cat-1', payerUserId: 'user-1' });
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual(
			expect.arrayContaining([expect.objectContaining({ field: 'amount' })])
		);
	});

	test('[SPEC: AC-103] 金額が 9999999 を超える場合は 400 VALIDATION_ERROR を返す // spec:8c47a574', async () => {
		const res = await callPostHandler({
			amount: 10000000,
			categoryId: 'cat-1',
			payerUserId: 'user-1'
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('[SPEC: AC-104] 金額が文字列の場合は 400 VALIDATION_ERROR を返す // spec:8c47a574', async () => {
		const res = await callPostHandler({
			amount: 'abc',
			categoryId: 'cat-1',
			payerUserId: 'user-1'
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('[SPEC: AC-105] カテゴリ ID が未指定の場合は 400 VALIDATION_ERROR を返す // spec:8c47a574', async () => {
		const res = await callPostHandler({ amount: 1000, payerUserId: 'user-1' });
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual(
			expect.arrayContaining([expect.objectContaining({ field: 'categoryId' })])
		);
	});

	test('[SPEC: AC-124] 支払者ユーザー ID が未指定の場合は 400 VALIDATION_ERROR を返す // spec:8c47a574', async () => {
		const res = await callPostHandler({ amount: 1000, categoryId: 'cat-1' });
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual(
			expect.arrayContaining([expect.objectContaining({ field: 'payerUserId' })])
		);
	});
});

describe('GET /expenses', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.mock('./service', () => ({
			getExpenses: vi.fn()
		}));
		vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
	});

	test('[SPEC: AC-121] month の月部分が 13 の場合は 400 VALIDATION_ERROR を返す // spec:8c47a574', async () => {
		const res = await callGetHandler('?month=2026-13');
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('[SPEC: AC-121] month の月部分が 00 の場合は 400 VALIDATION_ERROR を返す // spec:8c47a574', async () => {
		const res = await callGetHandler('?month=2026-00');
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});
});
