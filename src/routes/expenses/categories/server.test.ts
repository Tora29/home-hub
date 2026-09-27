/**
 * @file テスト: 支出カテゴリ API ハンドラ
 * @module src/routes/expenses/categories/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect } from 'vitest';
import { POST } from './+server';

type ErrorBody = { code: string; fields: { field: string; message: string }[] };

async function callPost(body: string, contentType = 'application/json') {
	const request = new Request('http://localhost/expenses/categories', {
		method: 'POST',
		headers: { 'Content-Type': contentType },
		body
	});
	return POST({ request, platform: { env: { DB: {} } } } as unknown as Parameters<typeof POST>[0]);
}

describe('POST /expenses/categories', () => {
	test('カテゴリ名が空文字の場合、400 VALIDATION_ERROR「カテゴリ名は必須です」が返る', async () => {
		const response = await callPost(JSON.stringify({ name: '' }));
		expect(response.status).toBe(400);
		const body = (await response.json()) as ErrorBody;
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toContainEqual({ field: 'name', message: 'カテゴリ名は必須です' });
	});

	test('カテゴリ名が51文字の場合、400 VALIDATION_ERROR「50文字以内で入力してください」が返る', async () => {
		const response = await callPost(JSON.stringify({ name: 'a'.repeat(51) }));
		expect(response.status).toBe(400);
		const body = (await response.json()) as ErrorBody;
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toContainEqual({ field: 'name', message: '50文字以内で入力してください' });
	});

	test('リクエストボディが JSON でない場合、400 VALIDATION_ERROR が返る', async () => {
		const response = await callPost('not-json', 'text/plain');
		expect(response.status).toBe(400);
		const body = (await response.json()) as ErrorBody;
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toEqual([]);
	});
});
