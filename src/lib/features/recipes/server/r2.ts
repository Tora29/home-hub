/**
 * @file ヘルパー: レシピ画像 R2 削除
 * @module src/lib/features/recipes/server/r2.ts
 * @feature recipes
 *
 * @description
 * レシピ画像の R2 オブジェクト削除をベストエフォートで行うヘルパー。
 * DB 更新・削除は完了済みの状態で呼ばれるため、失敗してもログのみで飲み込む。
 */
import type { R2Bucket } from '@cloudflare/workers-types';

/**
 * R2 オブジェクトを削除する。失敗してもログ出力のみで例外を投げない。
 */
export async function deleteR2ImageBestEffort(
	bucket: R2Bucket,
	key: string,
	context: string
): Promise<void> {
	try {
		await bucket.delete(key);
	} catch (r2Err) {
		console.error(`R2 ${context}の削除に失敗しました（DB更新は完了済み）`, r2Err);
	}
}
