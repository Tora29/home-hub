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
	describe('異常系', () => {
		it('[SPEC: AC-101] メールアドレスが空の場合は「メールアドレスは必須です」エラーになる', () => {
			const result = loginSchema.safeParse({ email: '', password: 'password123' });
			expect(result.success).toBe(false);
			const issue = result.error?.issues.find((i) => i.path[0] === 'email');
			expect(issue?.message).toBe('メールアドレスは必須です');
		});

		it('[SPEC: AC-102] メールアドレスの形式が不正な場合は「正しいメールアドレスを入力してください」エラーになる', () => {
			const result = loginSchema.safeParse({ email: 'not-an-email', password: 'password123' });
			expect(result.success).toBe(false);
			const issue = result.error?.issues.find((i) => i.path[0] === 'email');
			expect(issue?.message).toBe('正しいメールアドレスを入力してください');
		});

		it('[SPEC: AC-103] パスワードが空の場合は「パスワードは必須です」エラーになる', () => {
			const result = loginSchema.safeParse({ email: 'test@example.com', password: '' });
			expect(result.success).toBe(false);
			const issue = result.error?.issues.find((i) => i.path[0] === 'password');
			expect(issue?.message).toBe('パスワードは必須です');
		});
	});

	describe('境界値', () => {
		it('[SPEC: AC-201] メールアドレスが254文字（上限）の場合はバリデーションを通過する', () => {
			// 'a'.repeat(242) + '@example.com' = 254 文字
			const email = 'a'.repeat(242) + '@example.com';
			const result = loginSchema.safeParse({ email, password: 'password123' });
			expect(result.success).toBe(true);
		});

		it('[SPEC: AC-201] メールアドレスが255文字（上限超過）の場合はバリデーションエラーになる', () => {
			// 'a'.repeat(243) + '@example.com' = 255 文字
			const email = 'a'.repeat(243) + '@example.com';
			const result = loginSchema.safeParse({ email, password: 'password123' });
			expect(result.success).toBe(false);
		});

		it('[SPEC: AC-202] パスワードが8文字（下限）の場合はバリデーションを通過する', () => {
			const result = loginSchema.safeParse({ email: 'test@example.com', password: '12345678' });
			expect(result.success).toBe(true);
		});

		it('[SPEC: AC-202] パスワードが7文字（下限未満）の場合はバリデーションエラーになる', () => {
			const result = loginSchema.safeParse({ email: 'test@example.com', password: '1234567' });
			expect(result.success).toBe(false);
			const issue = result.error?.issues.find((i) => i.path[0] === 'password');
			expect(issue?.message).toBe('8文字以上で入力してください');
		});

		it('[SPEC: AC-203] パスワードが128文字（上限）の場合はバリデーションを通過する', () => {
			const result = loginSchema.safeParse({
				email: 'test@example.com',
				password: 'a'.repeat(128)
			});
			expect(result.success).toBe(true);
		});

		it('[SPEC: AC-203] パスワードが129文字（上限超過）の場合はバリデーションエラーになる', () => {
			const result = loginSchema.safeParse({
				email: 'test@example.com',
				password: 'a'.repeat(129)
			});
			expect(result.success).toBe(false);
		});
	});
});
