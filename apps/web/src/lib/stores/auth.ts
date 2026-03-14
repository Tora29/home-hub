/**
 * @file ヘルパー: 認証状態ストア
 * @module apps/web/src/lib/stores/auth.ts
 *
 * @description
 * ログインユーザー情報のグローバルストア。
 * +layout.ts でセッション取得後にセットする。
 */

import { writable } from 'svelte/store';

export type AuthUser = {
	id: string;
	name: string;
	email: string;
};

export const currentUser = writable<AuthUser | null>(null);
