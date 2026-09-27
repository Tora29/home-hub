/**
 * @file テスト: 体重記録 API ハンドラ
 * @module src/routes/workout/(actions)/body-weight/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect } from 'vitest';
import { POST } from './+server';

const mockLocals = { user: { id: 'test-user-id' } };
const mockPlatform = { env: { DB: {} } };

async function post(body: unknown): Promise<Response> {
	const request = new Request('http://localhost/workout/body-weight', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	return POST({ request, locals: mockLocals, platform: mockPlatform } as any);
}

describe('POST /workout/body-weight', () => {
	test('体重が0の場合、400 VALIDATION_ERROR「体重は0より大きい値を入力してください」が返る', async () => {
		const response = await post({ date: '2024-01-15', weight: 0 });
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([
			{ field: 'weight', message: '体重は0より大きい値を入力してください' }
		]);
	});

	test('体重が300より大きい場合、400 VALIDATION_ERROR「体重は300以下で入力してください」が返る', async () => {
		const response = await post({ date: '2024-01-15', weight: 300.1 });
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([{ field: 'weight', message: '体重は300以下で入力してください' }]);
	});

	test('存在しない日付の場合、400 VALIDATION_ERROR「存在しない日付です」が返る', async () => {
		const response = await post({ date: '2026-02-30', weight: 72.5 });
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([{ field: 'date', message: '存在しない日付です' }]);
	});
});
