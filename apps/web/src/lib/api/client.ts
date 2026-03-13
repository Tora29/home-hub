/**
 * @file ヘルパー: API ベースクライアント
 * @module apps/web/src/lib/api/client.ts
 *
 * @description
 * API リクエストの共通処理（ベース URL 付与・Cookie 送信・エラーハンドリング）
 */

import { PUBLIC_API_BASE_URL } from '$env/static/public';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${PUBLIC_API_BASE_URL}${path}`, {
		...init,
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...init?.headers
		}
	});

	if (!res.ok) {
		const error = await res.json().catch(() => ({ message: 'Unknown error' }));
		throw new Error(error.message ?? `HTTP ${res.status}`);
	}

	return res.json();
}
