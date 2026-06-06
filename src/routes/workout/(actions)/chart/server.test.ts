/**
 * @file テスト: グラフデータ API ハンドラ
 * @module src/routes/workout/(actions)/chart/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect, vi } from 'vitest';
import { GET } from './+server';

vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
vi.mock('$workout/server/service', () => ({
	getChartData: vi.fn()
}));

const mockLocals = { user: { id: 'test-user-id' } };
const mockPlatform = { env: { DB: {} } };

describe('GET /workout/chart', () => {
	test('exerciseId が空の場合、400 VALIDATION_ERROR が返る', async () => {
		const url = new URL('http://localhost/workout/chart?exerciseId=');
		const response = await GET({ url, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('period が不正な値の場合、400 VALIDATION_ERROR が返る', async () => {
		const url = new URL('http://localhost/workout/chart?exerciseId=ex-1&period=invalid');
		const response = await GET({ url, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});

	test('バリデーション失敗時は getChartData が呼ばれない', async () => {
		const { getChartData } = await import('$workout/server/service');
		vi.mocked(getChartData).mockClear();
		const url = new URL('http://localhost/workout/chart?exerciseId=');
		await GET({ url, locals: mockLocals, platform: mockPlatform } as any);
		expect(getChartData).not.toHaveBeenCalled();
	});
});
