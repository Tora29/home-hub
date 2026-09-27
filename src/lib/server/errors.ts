/**
 * @file ヘルパー: AppError クラス
 * @module src/lib/server/errors.ts
 *
 * @description
 * アプリケーション全体で使用するカスタムエラークラス。
 * 期待されるエラー（NOT_FOUND・CONFLICT 等）を service で throw し、
 * +server.ts ハンドラは api-helpers.ts の handleApiError でエラーレスポンスに変換する。
 */

export type ErrorCode =
	| 'VALIDATION_ERROR'
	| 'UNAUTHORIZED'
	| 'FORBIDDEN'
	| 'NOT_FOUND'
	| 'CONFLICT'
	| 'INTERNAL_SERVER_ERROR';

export class AppError extends Error {
	constructor(
		public code: ErrorCode,
		public status: number,
		message: string,
		public fields?: { field: string; message: string }[]
	) {
		super(message);
	}
}
