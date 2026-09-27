/**
 * @file テスト: 筋トレ種目 API ハンドラ
 * @module src/routes/workout/exercises/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect } from 'vitest';
import { POST } from './+server';

const mockLocals = { user: { id: 'test-user-id' } };
const mockPlatform = { env: { DB: {} } };

async function post(body: unknown): Promise<Response> {
	const request = new Request('http://localhost/workout/exercises', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	return POST({ request, locals: mockLocals, platform: mockPlatform } as any);
}

describe('POST /workout/exercises', () => {
	test('name が空文字の場合、400 VALIDATION_ERROR「種目名は必須です」が返る', async () => {
		const response = await post({ name: '', categoryId: null });
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([{ field: 'name', message: '種目名は必須です' }]);
	});

	test('name が51文字の場合、400 VALIDATION_ERROR「50文字以内で入力してください」が返る', async () => {
		const response = await post({ name: 'a'.repeat(51), categoryId: null });
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([{ field: 'name', message: '50文字以内で入力してください' }]);
	});

	test('categoryId が未指定の場合、400 VALIDATION_ERROR が返る', async () => {
		const response = await post({ name: 'スクワット' });
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([
			{ field: 'categoryId', message: 'カテゴリの指定は必須です（未設定は null）' }
		]);
	});

	test('リクエストボディが JSON でない場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/workout/exercises', {
			method: 'POST',
			body: 'not-json'
		});
		const response = await POST({ request, locals: mockLocals, platform: mockPlatform } as any);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([]);
	});
});
