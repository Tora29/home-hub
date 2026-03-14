/**
 * @file テスト: loginSchema
 * @module packages/shared/src/schemas/auth.test.ts
 * @testType unit
 *
 * @target ./auth.ts
 * @spec specs/auth/spec.md
 * @covers AC-201, AC-202
 */
import { describe, test, expect } from 'vitest';
import { loginSchema } from './auth.js';

describe('loginSchema', () => {
  describe('[AC-201] email フィールドのバリデーション', () => {
    test('email が空の場合は「メールアドレスの形式が正しくありません」エラーになる', () => {
      const result = loginSchema.safeParse({ email: '', password: 'password' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailErrors = result.error.issues.filter((i) => i.path[0] === 'email');
        expect(emailErrors.length).toBeGreaterThan(0);
        expect(emailErrors[0].message).toBe('メールアドレスの形式が正しくありません');
      }
    });

    test('email が不正なフォーマットの場合は「メールアドレスの形式が正しくありません」エラーになる', () => {
      const result = loginSchema.safeParse({ email: 'not-an-email', password: 'password' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailErrors = result.error.issues.filter((i) => i.path[0] === 'email');
        expect(emailErrors.length).toBeGreaterThan(0);
        expect(emailErrors[0].message).toBe('メールアドレスの形式が正しくありません');
      }
    });

    test('正しい email フォーマットはバリデーションを通過する', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: 'password' });
      expect(result.success).toBe(true);
    });
  });

  describe('[AC-202] password フィールドのバリデーション', () => {
    test('password が空の場合は「パスワードは必須です」エラーになる', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordErrors = result.error.issues.filter((i) => i.path[0] === 'password');
        expect(passwordErrors.length).toBeGreaterThan(0);
        expect(passwordErrors[0].message).toBe('パスワードは必須です');
      }
    });

    test('password が1文字以上あればバリデーションを通過する', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com', password: 'a' });
      expect(result.success).toBe(true);
    });
  });

  describe('正常系: 有効な入力', () => {
    test('正しい email と password でパースに成功し値が返る', () => {
      const result = loginSchema.safeParse({
        email: 'husband@example.com',
        password: 'correct-password',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('husband@example.com');
        expect(result.data.password).toBe('correct-password');
      }
    });
  });
});
