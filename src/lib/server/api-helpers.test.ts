/**
 * @file テスト: API 共通処理
 * @module src/lib/server/api-helpers.test.ts
 * @testType unit
 *
 * @target ./api-helpers.ts
 */
import { describe, test, expect, vi, afterEach } from 'vitest';
import { z } from 'zod';
import { AppError } from './errors';
import { handleApiError, parseJsonBody, validationErrorResponse } from './api-helpers';

function jsonRequest(body: string): Request {
	return new Request('http://localhost/', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body
	});
}

describe('parseJsonBody', () => {
	test('正しい JSON のリクエストボディをパースできる', async () => {
		const result = await parseJsonBody(jsonRequest('{"name":"食費"}'));
		expect(result).toEqual({ ok: true, data: { name: '食費' } });
	});

	test('不正な JSON の場合、400 VALIDATION_ERROR「リクエストボディが不正です」が返る', async () => {
		const result = await parseJsonBody(jsonRequest('{invalid'));
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.response.status).toBe(400);
		expect(await result.response.json()).toEqual({
			code: 'VALIDATION_ERROR',
			message: 'リクエストボディが不正です',
			fields: []
		});
	});
});

describe('validationErrorResponse', () => {
	test('Zod の検証エラーの場合、400 VALIDATION_ERROR とフィールド別メッセージが返る', async () => {
		const schema = z.object({
			name: z.string().min(1, '名前は必須です'),
			detail: z.object({ amount: z.number().min(1, '金額は1円以上で入力してください') })
		});
		const parsed = schema.safeParse({ name: '', detail: { amount: 0 } });
		expect(parsed.success).toBe(false);
		if (parsed.success) return;

		const res = validationErrorResponse(parsed.error.issues);
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({
			code: 'VALIDATION_ERROR',
			message: '入力値が正しくありません',
			fields: [
				{ field: 'name', message: '名前は必須です' },
				{ field: 'detail.amount', message: '金額は1円以上で入力してください' }
			]
		});
	});
});

describe('handleApiError', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('AppError の場合、対応するステータスとエラーコード・メッセージが返る', async () => {
		const res = handleApiError(new AppError('CONFLICT', 409, '使用中のため削除できません'));
		expect(res.status).toBe(409);
		expect(await res.json()).toEqual({ code: 'CONFLICT', message: '使用中のため削除できません' });
	});

	test('予期しないエラーの場合、500 INTERNAL_SERVER_ERROR が返り、ログに記録される', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const res = handleApiError(new Error('D1 connection lost'));
		expect(res.status).toBe(500);
		expect(await res.json()).toEqual({
			code: 'INTERNAL_SERVER_ERROR',
			message: 'サーバーエラーが発生しました'
		});
		expect(consoleError).toHaveBeenCalledTimes(1);
	});
});
