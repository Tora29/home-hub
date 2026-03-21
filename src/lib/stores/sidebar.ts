/**
 * @file ヘルパー: Sidebar ストア
 * @module src/lib/stores/sidebar.ts
 *
 * @description
 * モバイル表示時のサイドバー開閉状態を管理する共有ストア。
 * Header のハンバーガーボタンと Sidebar コンポーネント間で状態を共有する。
 */
import { writable } from 'svelte/store';

export const mobileOpen = writable(false);
