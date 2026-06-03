/**
 * @file テスト: 支出詳細 API ハンドラ
 * @module src/routes/expenses/[id]/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect, vi } from 'vitest';
import { PUT } from './+server';

vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
vi.mock('$expenses/service', () => ({
	updateExpense: vi.fn(),
	deleteExpense: vi.fn()
}));

const mockLocals = { user: { id: 'test-user-id' } };
const mockPlatform = { env: { DB: {} } };
const mockParams = { id: 'expense-1' };

describe('PUT /expenses/[id]', () => {
	test('amount が未指定の場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/expenses/expense-1', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ categoryId: 'cat-1', payerUserId: 'user-1' })
		});
		const response = await PUT({
			request,
			params: mockParams,
			locals: mockLocals,
			platform: mockPlatform
		} as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('amount が0の場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/expenses/expense-1', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ amount: 0, categoryId: 'cat-1', payerUserId: 'user-1' })
		});
		const response = await PUT({
			request,
			params: mockParams,
			locals: mockLocals,
			platform: mockPlatform
		} as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('バリデーション失敗時は updateExpense が呼ばれない', async () => {
		const { updateExpense } = await import('$expenses/service');
		vi.mocked(updateExpense).mockClear();
		const request = new Request('http://localhost/expenses/expense-1', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ amount: -1 })
		});
		await PUT({ request, params: mockParams, locals: mockLocals, platform: mockPlatform } as any);
		expect(updateExpense).not.toHaveBeenCalled();
	});
});
