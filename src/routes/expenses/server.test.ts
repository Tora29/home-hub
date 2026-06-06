/**
 * @file テスト: 支出 API ハンドラ
 * @module src/routes/expenses/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect, vi } from 'vitest';
import { GET, POST } from './+server';

vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
vi.mock('$expenses/server/service', () => ({
	createExpense: vi.fn(),
	getExpenses: vi.fn()
}));

const mockLocals = { user: { id: 'test-user-id' } };
const mockPlatform = { env: { DB: {} } };

describe('GET /expenses', () => {
	test('month の形式が不正な場合、400 VALIDATION_ERROR が返る', async () => {
		const response = await GET({
			url: new URL('http://localhost/expenses?month=2024/03'),
			locals: mockLocals,
			platform: mockPlatform
		} as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('month の月が13の場合、400 VALIDATION_ERROR が返る', async () => {
		const response = await GET({
			url: new URL('http://localhost/expenses?month=2024-13'),
			locals: mockLocals,
			platform: mockPlatform
		} as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('page が0の場合、400 VALIDATION_ERROR が返る', async () => {
		const response = await GET({
			url: new URL('http://localhost/expenses?page=0'),
			locals: mockLocals,
			platform: mockPlatform
		} as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('バリデーション失敗時は getExpenses が呼ばれない', async () => {
		const { getExpenses } = await import('$expenses/server/service');
		await GET({
			url: new URL('http://localhost/expenses?month=bad'),
			locals: mockLocals,
			platform: mockPlatform
		} as any);
		expect(getExpenses).not.toHaveBeenCalled();
	});
});

describe('POST /expenses', () => {
	test('リクエストボディが JSON でない場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/expenses', {
			method: 'POST',
			headers: { 'Content-Type': 'text/plain' },
			body: 'not json'
		});
		const response = await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('amount が未指定の場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/expenses', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ categoryId: 'cat-1', payerUserId: 'user-1' })
		});
		const response = await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('amount が0の場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/expenses', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ amount: 0, categoryId: 'cat-1', payerUserId: 'user-1' })
		});
		const response = await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('categoryId が空文字の場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/expenses', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ amount: 1000, categoryId: '', payerUserId: 'user-1' })
		});
		const response = await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('バリデーション失敗時は createExpense が呼ばれない', async () => {
		const { createExpense } = await import('$expenses/server/service');
		vi.mocked(createExpense).mockClear();
		const request = new Request('http://localhost/expenses', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ amount: 0 })
		});
		await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(createExpense).not.toHaveBeenCalled();
	});
});
