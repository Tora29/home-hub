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
	describe('基本プロパティ', () => {
		test('code, status, message が正しく設定される', () => {
			const err = new AppError('NOT_FOUND', 404, '該当データが見つかりません');
			expect(err.code).toBe('NOT_FOUND');
			expect(err.status).toBe(404);
			expect(err.message).toBe('該当データが見つかりません');
		});

		test('fields を指定しない場合は undefined になる', () => {
			const err = new AppError('NOT_FOUND', 404, '該当データが見つかりません');
			expect(err.fields).toBeUndefined();
		});

		test('fields を指定した場合に正しく設定される', () => {
			const fields = [{ field: 'name', message: '名前は必須です' }];
			const err = new AppError('VALIDATION_ERROR', 400, '入力値が正しくありません', fields);
			expect(err.fields).toEqual(fields);
		});

		test('Error のインスタンスである', () => {
			const err = new AppError('INTERNAL_SERVER_ERROR', 500, 'サーバーエラーが発生しました');
			expect(err).toBeInstanceOf(Error);
		});

		test('instanceof AppError でキャッチできる', () => {
			expect(() => {
				throw new AppError('FORBIDDEN', 403, 'アクセスが禁止されています');
			}).toThrow(AppError);
		});
	});

	describe('エラーコード', () => {
		test('VALIDATION_ERROR を設定できる', () => {
			const err = new AppError('VALIDATION_ERROR', 400, '入力値が正しくありません');
			expect(err.code).toBe('VALIDATION_ERROR');
			expect(err.status).toBe(400);
		});

		test('UNAUTHORIZED を設定できる', () => {
			const err = new AppError('UNAUTHORIZED', 401, '認証が必要です');
			expect(err.code).toBe('UNAUTHORIZED');
			expect(err.status).toBe(401);
		});

		test('FORBIDDEN を設定できる', () => {
			const err = new AppError('FORBIDDEN', 403, 'アクセスが禁止されています');
			expect(err.code).toBe('FORBIDDEN');
			expect(err.status).toBe(403);
		});

		test('NOT_FOUND を設定できる', () => {
			const err = new AppError('NOT_FOUND', 404, '該当データが見つかりません');
			expect(err.code).toBe('NOT_FOUND');
			expect(err.status).toBe(404);
		});

		test('CONFLICT を設定できる', () => {
			const err = new AppError('CONFLICT', 409, '競合が発生しました');
			expect(err.code).toBe('CONFLICT');
			expect(err.status).toBe(409);
		});

		test('INTERNAL_SERVER_ERROR を設定できる', () => {
			const err = new AppError('INTERNAL_SERVER_ERROR', 500, 'サーバーエラーが発生しました');
			expect(err.code).toBe('INTERNAL_SERVER_ERROR');
			expect(err.status).toBe(500);
		});
	});

	describe('fields', () => {
		test('複数フィールドエラーを設定できる', () => {
			const fields = [
				{ field: 'name', message: '名前は必須です' },
				{ field: 'email', message: '正しいメールアドレスを入力してください' }
			];
			const err = new AppError('VALIDATION_ERROR', 400, '入力値が正しくありません', fields);
			expect(err.fields).toHaveLength(2);
			expect(err.fields![0]).toEqual({ field: 'name', message: '名前は必須です' });
			expect(err.fields![1]).toEqual({
				field: 'email',
				message: '正しいメールアドレスを入力してください'
			});
		});
	});
});
