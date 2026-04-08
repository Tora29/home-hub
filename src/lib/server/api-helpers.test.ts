/**
 * @file テスト: API 共通処理
 * @module src/lib/server/api-helpers.test.ts
 * @testType unit
 *
 * @target ./api-helpers.ts
 */
import { describe, test, expect } from 'vitest';
import { validationErrorResponse, parseJsonBody, handleApiError } from './api-helpers';
import { AppError } from './errors';

describe('validationErrorResponse', () => {
	test('issues を VALIDATION_ERROR 400 レスポンスに変換する', async () => {
		const res = validationErrorResponse([{ path: ['name'], message: '名前は必須です' }]);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toEqual({
			code: 'VALIDATION_ERROR',
			message: '入力値が正しくありません',
			fields: [{ field: 'name', message: '名前は必須です' }]
		});
	});

	test('ネストしたパスを . で結合する', async () => {
		const res = validationErrorResponse([{ path: ['user', 'email'], message: '無効です' }]);
		const body = await res.json();
		expect(body.fields[0].field).toBe('user.email');
	});

	test('issues が空配列の場合は fields も空になる', async () => {
		const res = validationErrorResponse([]);
		const body = await res.json();
		expect(body.fields).toEqual([]);
	});
});

describe('parseJsonBody', () => {
	test('正常な JSON ボディを parse する', async () => {
		const req = new Request('http://localhost', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ amount: 1000 })
		});
		const result = await parseJsonBody(req);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toEqual({ amount: 1000 });
	});

	test('不正な JSON は 400 レスポンスを返す', async () => {
		const req = new Request('http://localhost', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: 'invalid json'
		});
		const result = await parseJsonBody(req);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.response.status).toBe(400);
	});
});

describe('handleApiError', () => {
	test('AppError を対応するステータスコードで返す', async () => {
		const err = new AppError('NOT_FOUND', 404, '見つかりません');
		const res = handleApiError(err);
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe('NOT_FOUND');
		expect(body.message).toBe('見つかりません');
	});

	test('未知のエラーは 500 を返す', async () => {
		const res = handleApiError(new Error('unexpected'));
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.code).toBe('INTERNAL_SERVER_ERROR');
	});
});
