/**
 * @file テスト: AppError
 * @module src/lib/server/errors.test.ts
 * @testType unit
 *
 * @target ./errors.ts
 */
import { describe, test, expect } from 'vitest';
import { AppError } from './errors';

describe('AppError', () => {
	test('エラーコード・ステータス・メッセージを保持した Error として throw できる', () => {
		const err = new AppError('NOT_FOUND', 404, '該当データが見つかりません');
		expect(err).toBeInstanceOf(Error);
		expect(err.code).toBe('NOT_FOUND');
		expect(err.status).toBe(404);
		expect(err.message).toBe('該当データが見つかりません');
		expect(err.fields).toBeUndefined();
	});

	test('フィールドエラーを付与した VALIDATION_ERROR を生成できる', () => {
		const fields = [{ field: 'name', message: '名前は必須です' }];
		const err = new AppError('VALIDATION_ERROR', 400, '入力値が正しくありません', fields);
		expect(err.fields).toEqual(fields);
	});
});
