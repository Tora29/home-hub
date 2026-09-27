/**
 * @file テスト: 筋トレ記録 API ハンドラ
 * @module src/routes/workout/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect } from 'vitest';
import { POST } from './+server';

const mockLocals = { user: { id: 'test-user-id' } };
const mockPlatform = { env: { DB: {} } };

async function post(body: unknown): Promise<Response> {
	const request = new Request('http://localhost/workout', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	return POST({ request, locals: mockLocals, platform: mockPlatform } as any);
}

describe('POST /workout', () => {
	test('exerciseId が空の場合、400 VALIDATION_ERROR「種目を選択してください」が返る', async () => {
		const response = await post({ exerciseId: '', date: '2024-01-15', weight: 80, reps: 5 });
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([{ field: 'exerciseId', message: '種目を選択してください' }]);
	});

	test('重量が負の場合、400 VALIDATION_ERROR「重量は0以上で入力してください」が返る', async () => {
		const response = await post({ exerciseId: 'ex-1', date: '2024-01-15', weight: -1, reps: 5 });
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toContainEqual({
			field: 'weight',
			message: '重量は0以上で入力してください'
		});
	});

	test('回数が11の場合、400 VALIDATION_ERROR「回数は10以下で入力してください」が返る', async () => {
		const response = await post({ exerciseId: 'ex-1', date: '2024-01-15', weight: 80, reps: 11 });
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([{ field: 'reps', message: '回数は10以下で入力してください' }]);
	});

	test('日付フォーマットが不正な場合、400 VALIDATION_ERROR「日付の形式が正しくありません」が返る', async () => {
		const response = await post({ exerciseId: 'ex-1', date: '2024/01/15', weight: 80, reps: 5 });
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([{ field: 'date', message: '日付の形式が正しくありません' }]);
	});

	test('リクエストボディが JSON でない場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/workout', { method: 'POST', body: 'not-json' });
		const response = await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([]);
	});
});
