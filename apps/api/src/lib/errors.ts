/**
 * @file ヘルパー: AppError
 * @module apps/api/src/lib/errors.ts
 *
 * @description
 * アプリ全体で使用するカスタムエラークラス。
 * Hono の onError でグローバルにキャッチして統一レスポンスに変換する。
 */
import type { ErrorCode } from '@what-to-eat/constants';

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public status: number,
    message: string,
    public fields?: { field: string; message: string }[]
  ) {
    super(message);
    this.name = 'AppError';
  }
}
