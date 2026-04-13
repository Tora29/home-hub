# Feature: Header

## Overview

全ページ共通のヘッダーコンポーネント。ロゴ・ダークモード切替・ログアウトを提供する。
`src/lib/components/Header.svelte` として実装し、`+layout.svelte` から使用する。API は不要。

## Schema Definition（サマリ）

該当なし（UI 専用コンポーネント。API なし）。

## Database Constraints（サマリ）

該当なし（UI 専用コンポーネント）。

## data-testid

| testid                 | 要素種別   | 説明                                             |
| ---------------------- | ---------- | ------------------------------------------------ |
| `header-logo`          | `<a>`      | ロゴリンク                                       |
| `header-dark-toggle`   | `<button>` | ダークモード切替ボタン                           |
| `header-logout-button` | `<button>` | ログアウトボタン                                 |
| `sidebar-hamburger`    | `<button>` | モバイル用ハンバーガーボタン（Sidebar 機能兼務） |

## Error Responses（サマリ）

該当なし（API なし）。

## Query Parameters（サマリ）

該当なし（API なし）。

## API Endpoints

該当なし（UI 専用コンポーネント）。

## Acceptance Criteria

### 正常系

- AC-001: ロゴをクリックすると `/` へ遷移する
- AC-002: ダークモード切替ボタンをクリックすると、ライト/ダーク表示が切り替わる
- AC-003: ダークモード状態が localStorage に保存され、ページリロード後も維持される
- AC-004: ログアウトボタンをクリックすると、セッションが破棄され `/login` へ遷移する

### 異常系

なし（認証チェックは `hooks.server.ts` が保証するため、ヘッダー側での対応は不要）

### 境界値

- AC-201: localStorage に `theme` が未設定の場合、`<html>` 要素の `dark` クラスの有無に従って初期モードが決まる

## UI Requirements

### 画面構成

- **ヘッダー全体**: 固定高さ（`h-14` 程度）、`bg-bg-secondary` 背景、下部に `border-separator` ボーダー
- **左側**:
  - ハンバーガーボタン（モバイルのみ表示、`md` 以上では非表示）: `Menu` アイコン。クリックでサイドバーを開く（→ `specs/sidebar/spec.md` AC-005）
  - ロゴ（アプリ名またはアイコン）。`<a href="/">` でルートへリンク。モバイルでは中央揃え、デスクトップでは左揃え
- **右側（ボタン群）**:
  - ダークモード切替ボタン: ライトモード時は `Moon` アイコン、ダークモード時は `Sun` アイコン（`@lucide/svelte`）+ 「テーマ切り替え」テキスト（`md` 以上のみ表示）
  - ログアウトボタン: `LogOut` アイコン + 「ログアウト」テキスト（`md` 以上のみ表示）

### コンポーネント階層

```
Header（src/lib/components/Header.svelte）
├── LeftSection
│   ├── HamburgerButton (sidebar-hamburger) ※モバイルのみ
│   └── LogoLink (header-logo)
└── RightSection
    ├── DarkModeToggle (header-dark-toggle)
    └── LogoutButton (header-logout-button)
```

### レイアウト・スペーシング

| 要素         | 配置           | 幅・高さ    | 余白  | 備考                                      |
| ------------ | -------------- | ----------- | ----- | ----------------------------------------- |
| Header       | 横並び（両端） | h-14 w-full | px-4  | bg-bg-secondary border-b border-separator |
| LeftSection  | 横並び         | auto        | gap-2 |                                           |
| RightSection | 横並び         | auto        | gap-2 |                                           |
| ButtonText   | テキスト       | auto        | ml-1  | md:block hidden                           |

### 状態ごとの表示ルール

| 要素            | 条件                   | 表示          | 備考      |
| --------------- | ---------------------- | ------------- | --------- |
| HamburgerButton | モバイル（<768px）     | 表示          | md:hidden |
| HamburgerButton | デスクトップ（≥768px） | 非表示        |           |
| DarkModeToggle  | ライトモード           | Moon アイコン |           |
| DarkModeToggle  | ダークモード           | Sun アイコン  |           |
| ButtonText      | モバイル（<768px）     | 非表示        |           |
| ButtonText      | デスクトップ（≥768px） | 表示          |           |

### アニメーション・トランジション

なし

### レスポンシブ挙動

| ブレークポイント     | レイアウト変更                                     | 備考 |
| -------------------- | -------------------------------------------------- | ---- |
| デフォルト（<768px） | Hamburger 表示。ロゴ中央寄せ。ボタンテキスト非表示 |      |
| md（≥768px）         | Hamburger 非表示。ロゴ左寄せ。ボタンテキスト表示   |      |

### インタラクション

- ロゴクリック: `href="/"` でルートページへ遷移
- ダークモード切替クリック:
  1. `<html>` 要素の `class="dark"` を追加/削除（Tailwind `dark:` strategy）
  2. `localStorage.setItem('theme', 'dark' | 'light')` で状態保存
- ページ初期化時: `localStorage.getItem('theme')` を読み取り `<html class>` に反映
- ログアウトクリック: Better Auth の signOut API を呼び出し、完了後 `/login` へリダイレクト

### バリデーション表示

なし（入力フォームなし）

## テスト戦略

| AC     | 種別 | 対象ファイル            | 備考                              | spec_hash |
| ------ | ---- | ----------------------- | --------------------------------- | --------- |
| AC-001 | Unit | `Header.svelte.test.ts` | ロゴの href="/" 確認              | fcd544b7  |
| AC-002 | Unit | `Header.svelte.test.ts` | ダークモード切替アイコン変化      | 6a02b9fc  |
| AC-003 | Unit | `Header.svelte.test.ts` | localStorage への保存確認         | 4fc1778b  |
| AC-003 | E2E  | `e2e/header.e2e.ts`     | ページリロード後の状態維持        | c3d3e606  |
| AC-004 | Unit | `Header.svelte.test.ts` | signOut 呼び出し確認              | 8512a206  |
| AC-004 | E2E  | `e2e/header.e2e.ts`     | ログアウト後 /login リダイレクト  | 7acad64f  |
| AC-201 | Unit | `Header.svelte.test.ts` | localStorage 未設定時の初期モード | 9bba50c5  |

## Non-Functional Requirements

### Performance

- ヘッダーは `+layout.svelte` に配置するため、ページ遷移時に再マウントしない

### Security

- ログアウト処理は Better Auth の `signOut()` を使用し、クライアントサイドのセッション情報を安全に破棄する
- `{@html}` は使用しない

### Accessibility

- ロゴリンクに `aria-label="ホームへ戻る"` を付与する
- ダークモード切替ボタンに `aria-label="ダークモードに切り替える"` / `aria-label="ライトモードに切り替える"` を動的に付与する
- ログアウトボタンに `aria-label="ログアウト"` を付与する
- キーボードフォーカス可能な要素には `focus-visible:ring` を付与する
