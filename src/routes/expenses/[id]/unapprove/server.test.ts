/**
 * @file テスト: 支出承認取消 API ハンドラ
 * @module src/routes/expenses/[id]/unapprove/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/expenses/spec.md
 * @covers AC-005, AC-106, AC-113
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { AppError } from '$lib/server/errors.js';

vi.mock('../../service.js', () => ({
	unapproveExpense: vi.fn()
}));

vi.mock('$lib/server/db.js', () => ({
	createDb: vi.fn(() => ({}))
}));

import { POST } from './+server.js';
import { unapproveExpense } from '../../service.js';

function mockEvent(id: string) {
	return {
		params: { id },
		locals: { user: { id: 'user-1' } },
		platform: { env: { DB: {} } }
	} as Parameters<typeof POST>[0];
}

describe('POST /expenses/[id]/unapprove', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('[SPEC: AC-005] 確認済みの支出を未承認に戻すと 200 と更新後の支出が返る', async () => {
		const mockExpense = { id: 'expense-1', approvedAt: null, finalizedAt: null };
		vi.mocked(unapproveExpense).mockResolvedValueOnce(mockExpense as never);

		const response = await POST(mockEvent('expense-1'));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.id).toBe('expense-1');
		expect(body.approvedAt).toBeNull();
	});

	test('[SPEC: AC-106] 存在しない支出 ID に unapprove を試みると 404 NOT_FOUND が返る', async () => {
		vi.mocked(unapproveExpense).mockRejectedValueOnce(
			new AppError('NOT_FOUND', 404, '該当データが見つかりません')
		);

		const response = await POST(mockEvent('nonexistent-id'));
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body.code).toBe('NOT_FOUND');
		expect(body.message).toBe('該当データが見つかりません');
	});

	test('[SPEC: AC-113] 確定済みの支出に unapprove を試みると 409 CONFLICT が返る', async () => {
		vi.mocked(unapproveExpense).mockRejectedValueOnce(
			new AppError('CONFLICT', 409, '確定済みの支出は変更できません')
		);

		const response = await POST(mockEvent('finalized-expense'));
		const body = await response.json();

		expect(response.status).toBe(409);
		expect(body.code).toBe('CONFLICT');
		expect(body.message).toBe('確定済みの支出は変更できません');
	});
});
