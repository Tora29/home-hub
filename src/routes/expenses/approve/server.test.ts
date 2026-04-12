/**
 * @file テスト: API Expense 一括承認
 * @module src/routes/expenses/approve/server.test.ts
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
	approveExpenses: vi.fn(),
	getExpenseIdsByOwnerAndStatus: vi.fn(),
	getPartnerUserId: vi.fn(),
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

describe('POST /expenses/approve', () => {
	test('role=null かつ partner 未解決の場合、409 CONFLICT を返す', async () => {
		vi.mocked(service.getPartnerUserId).mockResolvedValueOnce(null);

		const response = await POST({
			locals: {
				user: { id: 'user-3', name: 'No Role User', role: null }
			},
			platform: mockPlatform
		} as Parameters<typeof POST>[0]);

		expect(service.approveExpenses).not.toHaveBeenCalled();
		expect(response.status).toBe(409);
		await expect(response.json()).resolves.toMatchObject({
			code: 'CONFLICT',
			message: '承認できる支出がありません'
		});
	});

	test('role=null でも partner 解決済みなら一括承認を続行する', async () => {
		vi.mocked(service.getPartnerUserId).mockResolvedValueOnce('user-2');
		vi.mocked(service.getExpenseIdsByOwnerAndStatus).mockResolvedValueOnce([
			'expense-1',
			'expense-2'
		]);
		vi.mocked(service.approveExpenses).mockResolvedValueOnce(3);

		const response = await POST({
			locals: {
				user: { id: 'user-3', name: 'No Role User', role: null }
			},
			platform: mockPlatform
		} as Parameters<typeof POST>[0]);

		expect(service.approveExpenses).toHaveBeenCalledWith({}, 'user-3', 'user-2');
		expect(service.getExpenseIdsByOwnerAndStatus).toHaveBeenCalledWith({}, 'user-2', 'pending');
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toMatchObject({ count: 3 });
	});

	test('LINE 宛先 ID 未設定でも 200 で一括承認を継続する', async () => {
		vi.mocked(service.getPartnerUserId).mockResolvedValueOnce('user-2');
		vi.mocked(service.getExpenseIdsByOwnerAndStatus).mockResolvedValueOnce([
			'expense-1',
			'expense-2'
		]);
		vi.mocked(service.approveExpenses).mockResolvedValueOnce(3);
		vi.mocked(line.getOppositeRole).mockReturnValueOnce('spouse');
		vi.mocked(line.getLineUserId).mockReturnValueOnce(undefined);

		const response = await POST({
			locals: {
				user: { id: 'user-1', name: 'Approver', role: 'primary' }
			},
			platform: mockPlatform
		} as Parameters<typeof POST>[0]);

		expect(response.status).toBe(200);
		expect(service.approveExpenses).toHaveBeenCalledWith({}, 'user-1', 'user-2');
		expect(line.sendLineMessage).not.toHaveBeenCalled();
		expect(service.updateExpenseStatusesByIds).not.toHaveBeenCalled();
		await expect(response.json()).resolves.toMatchObject({ count: 3 });
	});

	test('LINE 通知失敗時、status を pending に戻して 502 を返す', async () => {
		vi.mocked(service.getPartnerUserId).mockResolvedValueOnce('user-2');
		vi.mocked(service.getExpenseIdsByOwnerAndStatus).mockResolvedValueOnce([
			'expense-1',
			'expense-2'
		]);
		vi.mocked(service.approveExpenses).mockResolvedValueOnce(2);
		vi.mocked(line.getOppositeRole).mockReturnValueOnce('spouse');
		vi.mocked(line.getLineUserId).mockReturnValueOnce('line-user-1');
		vi.mocked(line.sendLineMessage).mockRejectedValueOnce(
			new AppError(
				'BAD_GATEWAY',
				502,
				'LINE 通知の送信に失敗したため承認フローを完了できませんでした'
			)
		);

		const response = await POST({
			locals: {
				user: { id: 'user-1', name: 'Approver', role: 'primary' }
			},
			platform: mockPlatform
		} as Parameters<typeof POST>[0]);

		expect(service.updateExpenseStatusesByIds).toHaveBeenCalledWith(
			{},
			['expense-1', 'expense-2'],
			'approved',
			'pending'
		);
		expect(response.status).toBe(502);
		await expect(response.json()).resolves.toMatchObject({
			code: 'BAD_GATEWAY',
			message: 'LINE 通知の送信に失敗したため承認フローを完了できませんでした'
		});
	});
});
