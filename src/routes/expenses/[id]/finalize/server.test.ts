/**
 * @file テスト: 支出確定 API ハンドラ
 * @module src/routes/expenses/[id]/finalize/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/expenses/spec.md
 * @covers AC-113, AC-114
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '$lib/server/errors.js';

vi.mock('../../service.js', () => ({
	finalizeExpense: vi.fn()
}));

vi.mock('$lib/server/db.js', () => ({
	createDb: vi.fn(() => ({}))
}));

import { POST } from './+server.js';
import { finalizeExpense } from '../../service.js';

function mockEvent(id: string) {
	return {
		params: { id },
		locals: { user: { id: 'user-1' } },
		platform: { env: { DB: {} } }
	} as Parameters<typeof POST>[0];
}

describe('POST /expenses/[id]/finalize', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('finalizeExpense', () => {
		it('[SPEC: AC-114] 未承認の支出に対して finalize を試みると 409 CONFLICT が返る', async () => {
			vi.mocked(finalizeExpense).mockRejectedValueOnce(
				new AppError('CONFLICT', 409, '確認済みにしてから確定してください')
			);

			const response = await POST(mockEvent('expense-1'));
			const body = await response.json();

			expect(response.status).toBe(409);
			expect(body.code).toBe('CONFLICT');
			expect(body.message).toBe('確認済みにしてから確定してください');
		});

		it('[SPEC: AC-113] 確定済みの支出に対して finalize を試みると 409 CONFLICT が返る', async () => {
			vi.mocked(finalizeExpense).mockRejectedValueOnce(
				new AppError('CONFLICT', 409, '確定済みの支出は変更できません')
			);

			const response = await POST(mockEvent('expense-finalized'));
			const body = await response.json();

			expect(response.status).toBe(409);
			expect(body.code).toBe('CONFLICT');
			expect(body.message).toBe('確定済みの支出は変更できません');
		});

		it('[SPEC: AC-106] 存在しない支出 ID に finalize を試みると 404 NOT_FOUND が返る', async () => {
			vi.mocked(finalizeExpense).mockRejectedValueOnce(
				new AppError('NOT_FOUND', 404, '該当データが見つかりません')
			);

			const response = await POST(mockEvent('nonexistent-id'));
			const body = await response.json();

			expect(response.status).toBe(404);
			expect(body.code).toBe('NOT_FOUND');
			expect(body.message).toBe('該当データが見つかりません');
		});

		it('[SPEC: AC-014] 確認済みの支出を確定すると 200 と更新済み支出が返る', async () => {
			const mockExpense = {
				id: 'expense-1',
				userId: 'user-1',
				amount: 3000,
				categoryId: 'cat-1',
				approvedAt: new Date('2026-03-01T10:00:00.000Z'),
				finalizedAt: new Date('2026-03-31T12:00:00.000Z'),
				createdAt: new Date('2026-03-01T09:00:00.000Z'),
				category: {
					id: 'cat-1',
					userId: 'user-1',
					name: '食費',
					createdAt: new Date('2026-01-01T00:00:00.000Z')
				}
			};
			vi.mocked(finalizeExpense).mockResolvedValueOnce(mockExpense);

			const response = await POST(mockEvent('expense-1'));
			const body = await response.json();

			expect(response.status).toBe(200);
			expect(body.id).toBe('expense-1');
			expect(body.finalizedAt).toBe('2026-03-31T12:00:00.000Z');
		});
	});
});
