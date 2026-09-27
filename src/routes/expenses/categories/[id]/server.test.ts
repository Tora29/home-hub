/**
 * @file テスト: 支出カテゴリ詳細 API ハンドラ
 * @module src/routes/expenses/categories/[id]/server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 */
import { describe, test, expect } from 'vitest';
import { PUT } from './+server';

type ErrorBody = { code: string; fields: { field: string; message: string }[] };

async function callPut(body: unknown) {
	const request = new Request('http://localhost/expenses/categories/category-1', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	return PUT({
		request,
		params: { id: 'category-1' },
		platform: { env: { DB: {} } }
	} as unknown as Parameters<typeof PUT>[0]);
}

describe('PUT /expenses/categories/[id]', () => {
	test('カテゴリ名が空文字の場合、400 VALIDATION_ERROR「カテゴリ名は必須です」が返る', async () => {
		const response = await callPut({ name: '' });
		expect(response.status).toBe(400);
		const body = (await response.json()) as ErrorBody;
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toContainEqual({ field: 'name', message: 'カテゴリ名は必須です' });
	});

	test('カテゴリ名が51文字の場合、400 VALIDATION_ERROR「50文字以内で入力してください」が返る', async () => {
		const response = await callPut({ name: 'a'.repeat(51) });
		expect(response.status).toBe(400);
		const body = (await response.json()) as ErrorBody;
		expect(body.code).toBe('VALIDATION_ERROR');
		expect(body.fields).toContainEqual({ field: 'name', message: '50文字以内で入力してください' });
	});
});
