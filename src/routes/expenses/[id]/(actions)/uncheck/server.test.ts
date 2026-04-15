/**
 * @file テスト: API 支出確認取消
 * @module src/routes/expenses/[id]/(actions)/uncheck/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/expenses/spec.md
 * @covers AC-005, AC-106, AC-114
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import type * as ErrorsModule from '$lib/server/errors';

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn().mockReturnValue({})
}));

vi.mock('$expenses/_lib/service', () => ({
	uncheckExpense: vi.fn()
}));

vi.mock('$lib/server/errors', async (importOriginal) => {
	const actual = await importOriginal<typeof ErrorsModule>();
	return actual;
});

import { POST } from './+server';
import * as service from '$expenses/_lib/service';
import { AppError } from '$lib/server/errors';

const mockLocals = { user: { id: 'user-1' } };
const mockPlatform = { env: { DB: {} } };
const EXPENSE_ID = 'expense-id-1';

function makePostRequest(): Request {
	return new Request(`http://localhost/expenses/${EXPENSE_ID}/uncheck`, {
		method: 'POST'
	});
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('POST /expenses/[id]/uncheck', () => {
	describe('正常系', () => {
		test('[SPEC: AC-005] checked の支出を uncheck すると 200 と更新済み支出を返す', async () => {
			const mockUpdated = {
				id: EXPENSE_ID,
				userId: 'user-1',
				amount: 1000,
				categoryId: 'cat-1',
				payerUserId: 'user-2',
				status: 'unapproved' as const,
				createdAt: '2026-03-01T00:00:00Z',
				category: {
					id: 'cat-1',
					userId: 'user-1',
					name: '食費',
					createdAt: '2026-01-01T00:00:00Z'
				},
				payer: { id: 'user-2', name: '田中', email: 'tanaka@example.com' }
			};
			vi.mocked(service.uncheckExpense).mockResolvedValueOnce(mockUpdated);

			const response = await POST({
				request: makePostRequest(),
				params: { id: EXPENSE_ID },
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof POST>[0]);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.status).toBe('unapproved');
		});
	});

	describe('異常系', () => {
		test('[SPEC: AC-106] 存在しない支出 ID の場合、404 NOT_FOUND を返す', async () => {
			vi.mocked(service.uncheckExpense).mockRejectedValueOnce(
				new AppError('NOT_FOUND', 404, '該当データが見つかりません')
			);

			const response = await POST({
				request: makePostRequest(),
				params: { id: 'non-existent-id' },
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof POST>[0]);

			expect(response.status).toBe(404);
			const body = await response.json();
			expect(body.code).toBe('NOT_FOUND');
			expect(body.message).toBe('該当データが見つかりません');
		});

		test('[SPEC: AC-114] 他ユーザーの支出を uncheck しようとした場合、403 FORBIDDEN を返す', async () => {
			vi.mocked(service.uncheckExpense).mockRejectedValueOnce(
				new AppError('FORBIDDEN', 403, '他のユーザーの支出は操作できません')
			);

			const response = await POST({
				request: makePostRequest(),
				params: { id: EXPENSE_ID },
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof POST>[0]);

			expect(response.status).toBe(403);
			const body = await response.json();
			expect(body.code).toBe('FORBIDDEN');
			expect(body.message).toBe('他のユーザーの支出は操作できません');
		});

		test('[SPEC: BR-状態遷移] unapproved の支出を uncheck すると 409 CONFLICT // spec:9aa14e4f', async () => {
			vi.mocked(service.uncheckExpense).mockRejectedValueOnce(
				new AppError('CONFLICT', 409, '確認取消できる状態の支出ではありません')
			);

			const response = await POST({
				request: makePostRequest(),
				params: { id: EXPENSE_ID },
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof POST>[0]);

			expect(response.status).toBe(409);
			const body = await response.json();
			expect(body.code).toBe('CONFLICT');
		});

		test('[SPEC: BR-状態遷移] pending/approved の支出を uncheck すると 409 CONFLICT // spec:24e1765b', async () => {
			vi.mocked(service.uncheckExpense).mockRejectedValueOnce(
				new AppError('CONFLICT', 409, '確認取消できる状態の支出ではありません')
			);

			const response = await POST({
				request: makePostRequest(),
				params: { id: EXPENSE_ID },
				locals: mockLocals,
				platform: mockPlatform
			} as Parameters<typeof POST>[0]);

			expect(response.status).toBe(409);
			const body = await response.json();
			expect(body.code).toBe('CONFLICT');
		});
	});
});
