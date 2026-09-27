/**
 * @file ヘルパー: Sidebar 状態
 * @module src/lib/stores/sidebar.svelte.ts
 *
 * @description
 * モバイル表示時のサイドバー開閉状態を管理する共有状態（Svelte 5 runes）。
 * Header のハンバーガーボタンと Sidebar コンポーネント間で状態を共有する。
 * モジュールの $state はサーバー上でリクエスト間共有されるが、SSR 中は書き込まない（クライアント操作でのみ変更）。
 */
export const sidebarState = $state({ mobileOpen: false });
