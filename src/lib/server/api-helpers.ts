/**
 * @file ヘルパー: API 共通処理
 * @module src/lib/server/api-helpers.ts
 *
 * @description
 * +server.ts 内で繰り返されるリクエストパース・バリデーション・エラーハンドリングを共通化する。
 */
import { json } from '@sveltejs/kit';
import { AppError } from './errors';

/** Zod safeParse 失敗時の issues を 400 VALIDATION_ERROR レスポンスに変換する。 */
export function validationErrorResponse(
	issues: { path: readonly PropertyKey[]; message: string }[]
): Response {
	return json(
		{
			code: 'VALIDATION_ERROR',
			message: '入力値が正しくありません',
			fields: issues.map((i) => ({ field: i.path.map(String).join('.'), message: i.message }))
		},
		{ status: 400 }
	);
}

/** リクエストボディを JSON として parse し、失敗時は 400 レスポンスを返す。 */
export async function parseJsonBody(
	request: Request
): Promise<{ ok: true; data: unknown } | { ok: false; response: Response }> {
	try {
		return { ok: true, data: await request.json() };
	} catch {
		return {
			ok: false,
			response: json(
				{ code: 'VALIDATION_ERROR', message: 'リクエストボディが不正です', fields: [] },
				{ status: 400 }
			)
		};
	}
}

/** AppError または未知のエラーを JSON レスポンスに変換する。 */
export function handleApiError(e: unknown): Response {
	if (e instanceof AppError) {
		return json({ code: e.code, message: e.message, fields: e.fields }, { status: e.status });
	}
	console.error(e);
	return json(
		{ code: 'INTERNAL_SERVER_ERROR', message: 'サーバーエラーが発生しました' },
		{ status: 500 }
	);
}
