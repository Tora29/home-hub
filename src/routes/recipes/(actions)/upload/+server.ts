/**
 * @file API: レシピ画像アップロード
 * @module src/routes/recipes/(actions)/upload/+server.ts
 * @feature recipes
 *
 * @description
 * レシピ画像を Cloudflare R2 にアップロードし、公開 URL を返す。
 * 対応形式: JPEG / PNG / WebP、上限サイズ: 5 MB。
 * ローカル開発環境（dev=true）では R2 呼び出しをスキップし、固定のダミー URL を返す。
 *
 * @spec specs/recipes/spec.md
 * @acceptance AC-014, AC-015, AC-116, AC-117
 *
 * @endpoints
 * - POST /recipes/upload → 200 RecipeUploadResponse - 画像アップロード
 *   @body multipart/form-data { file: File }
 *   @errors 400(VALIDATION_ERROR)
 */
import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const EXT_MAP: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp'
};

/**
 * 画像ファイルを R2 にアップロードし、公開 URL を返す。
 * @ac AC-014, AC-015, AC-116, AC-117
 * @throws VALIDATION_ERROR - ファイル形式またはサイズが不正な場合
 */
export const POST: RequestHandler = async ({ request, platform }) => {
	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return json(
			{ code: 'VALIDATION_ERROR', message: 'リクエストが不正です', fields: [] },
			{ status: 400 }
		);
	}

	const file = formData.get('file');

	if (!file || !(file instanceof File)) {
		return json(
			{
				code: 'VALIDATION_ERROR',
				message: '入力値が正しくありません',
				fields: [{ field: 'file', message: 'ファイルは必須です' }]
			},
			{ status: 400 }
		);
	}

	if (!ALLOWED_TYPES.includes(file.type)) {
		return json(
			{
				code: 'VALIDATION_ERROR',
				message: '入力値が正しくありません',
				fields: [{ field: 'file', message: 'JPEG / PNG / WebP 形式のファイルを選択してください' }]
			},
			{ status: 400 }
		);
	}

	if (file.size > MAX_SIZE) {
		return json(
			{
				code: 'VALIDATION_ERROR',
				message: '入力値が正しくありません',
				fields: [{ field: 'file', message: 'ファイルサイズは 5 MB 以下にしてください' }]
			},
			{ status: 400 }
		);
	}

	if (dev && !platform?.env?.USE_REAL_AI) {
		return json({ url: 'https://placehold.co/400x300?text=Recipe+Image' });
	}

	try {
		const ext = EXT_MAP[file.type];
		const key = `${crypto.randomUUID()}.${ext}`;
		const buffer = await file.arrayBuffer();

		await platform!.env.RECIPE_IMAGES.put(key, buffer, {
			httpMetadata: { contentType: file.type }
		});

		const url = `${platform!.env.RECIPE_IMAGES_PUBLIC_URL}/${key}`;
		return json({ url });
	} catch (e) {
		console.error(e);
		return json(
			{ code: 'INTERNAL_SERVER_ERROR', message: 'サーバーエラーが発生しました' },
			{ status: 500 }
		);
	}
};
