/**
 * @file テスト: 支出確定 API ハンドラ
 * @module src/routes/expenses/[id]/finalize/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/expenses/spec.md
 * @covers AC-106, AC-113, AC-114
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
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
		test('[SPEC: AC-114] 未承認の支出に対して finalize を試みると 409 CONFLICT が返る', async () => {
			vi.mocked(finalizeExpense).mockRejectedValueOnce(
				new AppError('CONFLICT', 409, '確認済みにしてから確定してください')
			);

			const response = await POST(mockEvent('expense-1'));
			const body = await response.json();

			expect(response.status).toBe(409);
			expect(body.code).toBe('CONFLICT');
			expect(body.message).toBe('確認済みにしてから確定してください');
		});

		test('[SPEC: AC-113] 確定済みの支出に対して finalize を試みると 409 CONFLICT が返る', async () => {
			vi.mocked(finalizeExpense).mockRejectedValueOnce(
				new AppError('CONFLICT', 409, '確定済みの支出は変更できません')
			);

			const response = await POST(mockEvent('expense-finalized'));
			const body = await response.json();

			expect(response.status).toBe(409);
			expect(body.code).toBe('CONFLICT');
			expect(body.message).toBe('確定済みの支出は変更できません');
		});

		test('[SPEC: AC-106] 存在しない支出 ID に finalize を試みると 404 NOT_FOUND が返る', async () => {
			vi.mocked(finalizeExpense).mockRejectedValueOnce(
				new AppError('NOT_FOUND', 404, '該当データが見つかりません')
			);

			const response = await POST(mockEvent('nonexistent-id'));
			const body = await response.json();

			expect(response.status).toBe(404);
			expect(body.code).toBe('NOT_FOUND');
			expect(body.message).toBe('該当データが見つかりません');
		});
	});
});
