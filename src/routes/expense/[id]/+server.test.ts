/**
 * @file テスト: API Expense 詳細
 * @module src/routes/expense/[id]/+server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/expenses/spec.md
 * @covers AC-101, AC-102, AC-103, AC-104, AC-105, AC-106
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn().mockReturnValue({})
}));

vi.mock('../service', () => ({
	updateExpense: vi.fn(),
	deleteExpense: vi.fn()
}));

vi.mock('$lib/server/errors', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/server/errors')>();
	return actual;
});

import { PUT, DELETE } from './+server';
import * as service from '../service';
import { AppError } from '$lib/server/errors';

const mockLocals = { user: { id: 'user-1' } };
const mockPlatform = { env: { DB: {} } };
const EXPENSE_ID = 'expense-id-1';

function makePutRequest(body: unknown): Request {
	return new Request(`http://localhost/expense/${EXPENSE_ID}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

function makeDeleteRequest(): Request {
	return new Request(`http://localhost/expense/${EXPENSE_ID}`, {
		method: 'DELETE'
	});
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('PUT /expense/[id]', () => {
	describe('正常系', () => {
		it('[SPEC: AC-004] approved: true を送信すると、200 が返る', async () => {
			const mockUpdated = {
				id: EXPENSE_ID,
				userId: 'user-1',
				amount: 1000,
				categoryId: 'cat-1',
				approvedAt: '2026-03-28T00:00:00.000Z',
				createdAt: '2026-03-01T00:00:00.000Z',
				category: { id: 'cat-1', userId: 'user-1', name: '食費', createdAt: '2026-03-01T00:00:00.000Z' }
			};
			vi.mocked(service.updateExpense).mockResolvedValueOnce(mockUpdated);

			const response = await PUT({
				request: makePutRequest({ amount: 1000, categoryId: 'cat-1', approved: true }),
				params: { id: EXPENSE_ID },
				locals: mockLocals,
				platform: mockPlatform
			} as any);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.id).toBe(EXPENSE_ID);
		});

		it('[SPEC: AC-005] approved: false を送信すると、200 が返る', async () => {
			const mockUpdated = {
				id: EXPENSE_ID,
				userId: 'user-1',
				amount: 1000,
				categoryId: 'cat-1',
				approvedAt: null,
				createdAt: '2026-03-01T00:00:00.000Z',
				category: { id: 'cat-1', userId: 'user-1', name: '食費', createdAt: '2026-03-01T00:00:00.000Z' }
			};
			vi.mocked(service.updateExpense).mockResolvedValueOnce(mockUpdated);

			const response = await PUT({
				request: makePutRequest({ amount: 1000, categoryId: 'cat-1', approved: false }),
				params: { id: EXPENSE_ID },
				locals: mockLocals,
				platform: mockPlatform
			} as any);

			expect(response.status).toBe(200);
		});
	});

	describe('異常系（バリデーション）', () => {
		it('[SPEC: AC-101] 金額が未入力の場合、400 VALIDATION_ERROR を返す', async () => {
			const response = await PUT({
				request: makePutRequest({ categoryId: 'cat-1', approved: false }),
				params: { id: EXPENSE_ID },
				locals: mockLocals,
				platform: mockPlatform
			} as any);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
			expect(body.fields).toContainEqual({ field: 'amount', message: '金額は必須です' });
		});

		it('[SPEC: AC-102] 金額が0以下の場合、400 VALIDATION_ERROR を返す', async () => {
			const response = await PUT({
				request: makePutRequest({ amount: 0, categoryId: 'cat-1', approved: false }),
				params: { id: EXPENSE_ID },
				locals: mockLocals,
				platform: mockPlatform
			} as any);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
			expect(body.fields).toContainEqual({
				field: 'amount',
				message: '1円以上の金額を入力してください'
			});
		});

		it('[SPEC: AC-103] 金額が9,999,999を超える場合、400 VALIDATION_ERROR を返す', async () => {
			const response = await PUT({
				request: makePutRequest({ amount: 10000000, categoryId: 'cat-1', approved: false }),
				params: { id: EXPENSE_ID },
				locals: mockLocals,
				platform: mockPlatform
			} as any);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
			expect(body.fields).toContainEqual({
				field: 'amount',
				message: '9,999,999円以下の金額を入力してください'
			});
		});

		it('[SPEC: AC-104] 金額が小数の場合、400 VALIDATION_ERROR を返す', async () => {
			const response = await PUT({
				request: makePutRequest({ amount: 100.5, categoryId: 'cat-1', approved: false }),
				params: { id: EXPENSE_ID },
				locals: mockLocals,
				platform: mockPlatform
			} as any);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
		});

		it('[SPEC: AC-105] カテゴリIDが未指定の場合、400 VALIDATION_ERROR を返す', async () => {
			const response = await PUT({
				request: makePutRequest({ amount: 1000, approved: false }),
				params: { id: EXPENSE_ID },
				locals: mockLocals,
				platform: mockPlatform
			} as any);

			expect(response.status).toBe(400);
			const body = await response.json();
			expect(body.code).toBe('VALIDATION_ERROR');
			expect(body.fields).toContainEqual({ field: 'categoryId', message: 'カテゴリは必須です' });
		});

		it('[SPEC: AC-106] 存在しない支出IDの場合、404 NOT_FOUND を返す', async () => {
			vi.mocked(service.updateExpense).mockRejectedValueOnce(
				new AppError('NOT_FOUND', 404, '該当データが見つかりません')
			);

			const response = await PUT({
				request: makePutRequest({ amount: 1000, categoryId: 'cat-1', approved: false }),
				params: { id: 'non-existent-id' },
				locals: mockLocals,
				platform: mockPlatform
			} as any);

			expect(response.status).toBe(404);
			const body = await response.json();
			expect(body.code).toBe('NOT_FOUND');
			expect(body.message).toBe('該当データが見つかりません');
		});
	});
});

describe('DELETE /expense/[id]', () => {
	it('[SPEC: AC-007] 正常に削除できる場合、204 を返す', async () => {
		vi.mocked(service.deleteExpense).mockResolvedValueOnce(undefined);

		const response = await DELETE({
			request: makeDeleteRequest(),
			params: { id: EXPENSE_ID },
			locals: mockLocals,
			platform: mockPlatform
		} as any);

		expect(response.status).toBe(204);
	});

	it('[SPEC: AC-106] 存在しない支出IDの場合、404 NOT_FOUND を返す', async () => {
		vi.mocked(service.deleteExpense).mockRejectedValueOnce(
			new AppError('NOT_FOUND', 404, '該当データが見つかりません')
		);

		const response = await DELETE({
			request: makeDeleteRequest(),
			params: { id: 'non-existent-id' },
			locals: mockLocals,
			platform: mockPlatform
		} as any);

		expect(response.status).toBe(404);
		const body = await response.json();
		expect(body.code).toBe('NOT_FOUND');
		expect(body.message).toBe('該当データが見つかりません');
	});
});
