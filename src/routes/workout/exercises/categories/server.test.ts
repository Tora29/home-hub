/**
 * @file テスト: 筋トレ種目カテゴリ API ハンドラ
 * @module src/routes/workout/exercises/categories/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect } from 'vitest';
import { POST } from './+server';

const mockLocals = { user: { id: 'test-user-id' } };
const mockPlatform = { env: { DB: {} } };

async function post(body: unknown): Promise<Response> {
	const request = new Request('http://localhost/workout/exercises/categories', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	return POST({ request, locals: mockLocals, platform: mockPlatform } as any);
}

describe('POST /workout/exercises/categories', () => {
	test('カテゴリ名が空の場合、400 VALIDATION_ERROR「カテゴリ名は必須です」が返る', async () => {
		const response = await post({ name: '' });
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([{ field: 'name', message: 'カテゴリ名は必須です' }]);
	});

	test('カテゴリ名が31文字の場合、400 VALIDATION_ERROR「30文字以内で入力してください」が返る', async () => {
		const response = await post({ name: 'あ'.repeat(31) });
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([{ field: 'name', message: '30文字以内で入力してください' }]);
	});

	test('リクエストボディが JSON でない場合、400 VALIDATION_ERROR が返る', async () => {
		const request = new Request('http://localhost/workout/exercises/categories', {
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
