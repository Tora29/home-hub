/**
 * @file テスト: ダッシュボード集計 API ハンドラ
 * @module src/routes/dashboard/summary/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect, vi } from 'vitest';
import { GET } from './+server';

vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
vi.mock('$dashboard/summary/service', () => ({
	getDashboardSummary: vi.fn()
}));

const mockLocals = { user: { id: 'test-user-id' } };
const mockPlatform = { env: { DB: {} } };

describe('GET /dashboard/summary', () => {
	test('period が無効値の場合、400 VALIDATION_ERROR が返る', async () => {
		const response = await GET({
			url: new URL('http://localhost/dashboard/summary?period=week'),
			locals: mockLocals,
			platform: mockPlatform
		} as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('month の形式が YYYY-MM でない場合、400 VALIDATION_ERROR が返る', async () => {
		const response = await GET({
			url: new URL('http://localhost/dashboard/summary?period=month&month=2024/06'),
			locals: mockLocals,
			platform: mockPlatform
		} as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('month の月が13の場合、400 VALIDATION_ERROR が返る', async () => {
		const response = await GET({
			url: new URL('http://localhost/dashboard/summary?period=month&month=2024-13'),
			locals: mockLocals,
			platform: mockPlatform
		} as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('period=all のとき month が不正でも 400 にならない', async () => {
		const { getDashboardSummary } = await import('$dashboard/summary/service');
		vi.mocked(getDashboardSummary).mockResolvedValue({
			overall: 0,
			byPayer: [],
			byCategory: []
		} as any);
		const response = await GET({
			url: new URL('http://localhost/dashboard/summary?period=all&month=bad-format'),
			locals: mockLocals,
			platform: mockPlatform
		} as any);
		// period=all の場合は month を無視するため VALIDATION_ERROR にならない
		expect(response.status).not.toBe(400);
	});

	test('バリデーション失敗時は getDashboardSummary が呼ばれない', async () => {
		const { getDashboardSummary } = await import('$dashboard/summary/service');
		vi.mocked(getDashboardSummary).mockClear();
		await GET({
			url: new URL('http://localhost/dashboard/summary?period=invalid'),
			locals: mockLocals,
			platform: mockPlatform
		} as any);
		expect(getDashboardSummary).not.toHaveBeenCalled();
	});
});
