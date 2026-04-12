/**
 * @file テスト: API Expense 一括承認依頼
 * @module src/routes/expenses/request/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AppError } from '$lib/server/errors';

const { mockDb } = vi.hoisted(() => ({ mockDb: {} }));

vi.mock('$lib/server/db', () => ({
	createDb: vi.fn().mockReturnValue(mockDb)
}));

vi.mock('../service', () => ({
	getExpenseIdsByOwnerAndStatus: vi.fn(),
	requestExpenses: vi.fn(),
	updateExpenseStatusesByIds: vi.fn()
}));

vi.mock('$lib/server/line', () => ({
	sendLineMessage: vi.fn(),
	getLineUserId: vi.fn(),
	getOppositeRole: vi.fn()
}));

import { POST } from './+server';
import * as service from '../service';
import * as line from '$lib/server/line';

const mockPlatform = { env: { DB: {}, LINE_CHANNEL_ACCESS_TOKEN: 'token' } };

beforeEach(() => {
	vi.clearAllMocks();
});

describe('POST /expenses/request', () => {
	test('LINE 宛先 ID 未設定でも 200 で一括承認依頼を継続する', async () => {
		vi.mocked(line.getOppositeRole).mockReturnValueOnce('spouse');
		vi.mocked(line.getLineUserId).mockReturnValueOnce(undefined);
		vi.mocked(service.getExpenseIdsByOwnerAndStatus).mockResolvedValueOnce([
			'expense-1',
			'expense-2'
		]);
		vi.mocked(service.requestExpenses).mockResolvedValueOnce(2);

		const response = await POST({
			locals: {
				user: { id: 'user-1', name: 'Requester', role: 'primary' }
			},
			platform: mockPlatform
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(200);
		expect(service.getExpenseIdsByOwnerAndStatus).toHaveBeenCalledWith({}, 'user-1', 'checked');
		expect(service.requestExpenses).toHaveBeenCalledWith({}, 'user-1');
		expect(line.sendLineMessage).not.toHaveBeenCalled();
		expect(service.updateExpenseStatusesByIds).not.toHaveBeenCalled();
		await expect(response.json()).resolves.toMatchObject({ count: 2 });
	});

	test('LINE 通知失敗時、status を checked に戻して 502 を返す', async () => {
		vi.mocked(line.getOppositeRole).mockReturnValueOnce('spouse');
		vi.mocked(line.getLineUserId).mockReturnValueOnce('line-user-1');
		vi.mocked(service.getExpenseIdsByOwnerAndStatus).mockResolvedValueOnce([
			'expense-1',
			'expense-2'
		]);
		vi.mocked(service.requestExpenses).mockResolvedValueOnce(2);
		vi.mocked(line.sendLineMessage).mockRejectedValueOnce(
			new AppError(
				'BAD_GATEWAY',
				502,
				'LINE 通知の送信に失敗したため承認フローを完了できませんでした'
			)
		);

		const response = await POST({
			locals: {
				user: { id: 'user-1', name: 'Requester', role: 'primary' }
			},
			platform: mockPlatform
		} as Parameters<typeof POST>[0]);

		expect(service.updateExpenseStatusesByIds).toHaveBeenCalledWith(
			{},
			['expense-1', 'expense-2'],
			'pending',
			'checked'
		);
		expect(response.status).toBe(502);
		await expect(response.json()).resolves.toMatchObject({
			code: 'BAD_GATEWAY',
			message: 'LINE 通知の送信に失敗したため承認フローを完了できませんでした'
		});
	});
});
