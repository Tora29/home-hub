/**
 * @file テスト: loginSchema
 * @module src/routes/login/schema.test.ts
 * @testType unit
 *
 * @target ./schema.ts
 * @spec specs/login/spec.md
 * @covers AC-101, AC-102, AC-103, AC-201, AC-202, AC-203
 */
import { describe, it, expect } from 'vitest';
import { loginSchema } from './schema';

describe('loginSchema', () => {
	describe('正常系', () => {
		it('[SPEC: AC-201] メールアドレスが254文字の場合、バリデーションを通過する', () => {
			// 242 + '@example.com'(12) = 254文字
			const email = 'a'.repeat(242) + '@example.com';
			const result = loginSchema.safeParse({ email, password: 'password123' });
			expect(result.success).toBe(true);
		});

		it('[SPEC: AC-202] パスワードが8文字（下限）の場合、バリデーションを通過する', () => {
			const result = loginSchema.safeParse({ email: 'test@example.com', password: '12345678' });
			expect(result.success).toBe(true);
		});

		it('[SPEC: AC-203] パスワードが128文字（上限）の場合、バリデーションを通過する', () => {
			const password = 'a'.repeat(128);
			const result = loginSchema.safeParse({ email: 'test@example.com', password });
			expect(result.success).toBe(true);
		});
	});

	describe('異常系', () => {
		describe('email フィールド', () => {
			it('[SPEC: AC-101] メールアドレスが空の場合、「メールアドレスは必須です」エラーになる', () => {
				const result = loginSchema.safeParse({ email: '', password: 'password123' });
				expect(result.success).toBe(false);
				const issue = result.error?.issues.find((i) => i.path.includes('email'));
				expect(issue?.message).toBe('メールアドレスは必須です');
			});

			it('[SPEC: AC-102] メールアドレスの形式が不正な場合、「正しいメールアドレスを入力してください」エラーになる', () => {
				const result = loginSchema.safeParse({ email: 'invalid-email', password: 'password123' });
				expect(result.success).toBe(false);
				const issue = result.error?.issues.find((i) => i.path.includes('email'));
				expect(issue?.message).toBe('正しいメールアドレスを入力してください');
			});
		});

		describe('password フィールド', () => {
			it('[SPEC: AC-103] パスワードが空の場合、「パスワードは必須です」エラーになる', () => {
				const result = loginSchema.safeParse({ email: 'test@example.com', password: '' });
				expect(result.success).toBe(false);
				const issue = result.error?.issues.find((i) => i.path.includes('password'));
				expect(issue?.message).toBe('パスワードは必須です');
			});
		});
	});

	describe('境界値', () => {
		describe('email フィールド', () => {
			it('[SPEC: AC-201] メールアドレスが255文字（上限超過）の場合、バリデーションエラーになる', () => {
				// 243 + '@example.com'(12) = 255文字
				const email = 'a'.repeat(243) + '@example.com';
				const result = loginSchema.safeParse({ email, password: 'password123' });
				expect(result.success).toBe(false);
			});
		});

		describe('password フィールド', () => {
			it('[SPEC: AC-202] パスワードが7文字（下限未満）の場合、バリデーションエラーになる', () => {
				const result = loginSchema.safeParse({ email: 'test@example.com', password: '1234567' });
				expect(result.success).toBe(false);
				const issue = result.error?.issues.find((i) => i.path.includes('password'));
				expect(issue?.message).toBe('8文字以上で入力してください');
			});

			it('[SPEC: AC-203] パスワードが129文字（上限超過）の場合、バリデーションエラーになる', () => {
				const password = 'a'.repeat(129);
				const result = loginSchema.safeParse({ email: 'test@example.com', password });
				expect(result.success).toBe(false);
				const issue = result.error?.issues.find((i) => i.path.includes('password'));
				expect(issue?.message).toBe('128文字以内で入力してください');
			});
		});
	});
});
