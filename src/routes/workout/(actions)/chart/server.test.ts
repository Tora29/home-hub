/**
 * @file テスト: グラフデータ API ハンドラ
 * @module src/routes/workout/(actions)/chart/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect } from 'vitest';
import { GET } from './+server';

const mockLocals = { user: { id: 'test-user-id' } };
const mockPlatform = { env: { DB: {} } };

async function get(query: string): Promise<Response> {
	const url = new URL(`http://localhost/workout/chart?${query}`);
	return GET({ url, locals: mockLocals, platform: mockPlatform } as any);
}

describe('GET /workout/chart', () => {
	test('exerciseId が未指定の場合、400 VALIDATION_ERROR「種目IDは必須です」が返る', async () => {
		const response = await get('period=1m');
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([{ field: 'exerciseId', message: '種目IDは必須です' }]);
	});

	test('period が不正な値の場合、400 VALIDATION_ERROR が返る', async () => {
		const response = await get('exerciseId=ex-1&period=invalid');
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([
			{ field: 'period', message: '期間は 1m / year / all のいずれかを指定してください' }
		]);
	});

	test('month が13月の場合、400 VALIDATION_ERROR「月は01〜12で入力してください」が返る', async () => {
		const response = await get('exerciseId=ex-1&period=1m&month=2024-13');
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([{ field: 'month', message: '月は01〜12で入力してください' }]);
	});
});
