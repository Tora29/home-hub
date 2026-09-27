/**
 * @file テスト: 週間ボリューム API ハンドラ
 * @module src/routes/workout/(actions)/volume/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect } from 'vitest';
import { GET } from './+server';

const mockLocals = { user: { id: 'test-user-id' } };
const mockPlatform = { env: { DB: {} } };

async function get(query: string): Promise<Response> {
	const url = new URL(`http://localhost/workout/volume?${query}`);
	return GET({ url, locals: mockLocals, platform: mockPlatform } as any);
}

describe('GET /workout/volume', () => {
	test('period が不正な値の場合、400 VALIDATION_ERROR が返る', async () => {
		const response = await get('period=invalid');
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([
			{ field: 'period', message: '期間は 1m / year / all のいずれかを指定してください' }
		]);
	});

	test('month の形式が不正な場合、400 VALIDATION_ERROR「月の形式は YYYY-MM です」が返る', async () => {
		const response = await get('period=1m&month=2024-1');
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([{ field: 'month', message: '月の形式は YYYY-MM です' }]);
	});

	test('weekStart の形式が不正な場合、400 VALIDATION_ERROR「日付の形式が正しくありません」が返る', async () => {
		const response = await get('weekStart=2024-W03');
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([{ field: 'weekStart', message: '日付の形式が正しくありません' }]);
	});

	test('weekStart が月曜日でない場合、400 VALIDATION_ERROR「週の開始日は月曜日を指定してください」が返る', async () => {
		// 2024-01-16 は火曜日
		const response = await get('weekStart=2024-01-16');
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([
			{ field: 'weekStart', message: '週の開始日は月曜日を指定してください' }
		]);
	});
});
