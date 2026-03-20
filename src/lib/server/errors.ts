/**
 * @file ヘルパー: AppError クラス
 * @module src/lib/server/errors.ts
 *
 * @description
 * アプリケーション全体で使用するカスタムエラークラス。
 * +server.ts 内で throw し、エラーレスポンスに変換する。
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
