# Feature: Sidebar

## Overview

全ページ共通のサイドバーナビゲーションコンポーネント。カテゴリ別の入れ子メニューを提供し、デスクトップ・モバイル両環境で開閉操作をサポートする。
`src/lib/components/Sidebar.svelte` として実装し、`+layout.svelte` から使用する。API は不要。

## API Endpoints

該当なし（UI 専用コンポーネント）。

## Acceptance Criteria

### 正常系

- AC-001: メニュー項目をクリックすると対応するページへ遷移する
- AC-002: カテゴリ見出しをクリックすると配下のメニューが開閉する
- AC-003: サイドバー開閉ボタンをクリックすると、サイドバー全体が表示/非表示に切り替わる
- AC-004: 現在表示中のページに対応するメニュー項目がアクティブ状態（アンダーライン）で表示される
- AC-005: モバイル幅（`< md`）ではサイドバーはデフォルト非表示で、ハンバーガーボタンから開くことができる
- AC-006: デスクトップ幅（`>= md`）ではサイドバーはデフォルト表示される

### 異常系

なし（入力なし）

### 境界値

なし（入力フィールドなし）

## UI Requirements

### 画面構成

- **サイドバー全体**: 固定幅（`w-56` 程度）、`bg-bg-secondary` 背景、右側に `border-separator` ボーダー
- **サイドバー開閉ボタン（デスクトップ）**: サイドバー内またはヘッダー隣に配置。`PanelLeftClose` / `PanelLeftOpen` アイコン（`@lucide/svelte`）
- **ハンバーガーボタン（モバイル）**: ヘッダー左側に配置。`Menu` アイコン。クリックでオーバーレイ付きサイドバーを表示
- **ナビゲーションメニュー**:
  - カテゴリ: `ChevronDown` / `ChevronRight` アイコンで開閉状態を示す
  - メニュー項目: アイコン + ラベルの横並び。クリックでページ遷移
- **メニュー構成（ハードコード）**:
  ```
  献立系（UtensilsCrossed アイコン）
    └ レシピ一覧（/recipes）
    └ タグ（/recipes/tags）
  収支系（Wallet アイコン）
    └ 家計簿（/expenses）
  ```

### インタラクション

- メニュー項目クリック: SvelteKit の `<a href>` でページ遷移（ソフトナビゲーション）
- カテゴリクリック: 該当カテゴリの `open` 状態をトグル（Svelte `$state`）
- サイドバー開閉ボタンクリック: サイドバーの `open` 状態をトグル（Svelte `$state`）
- モバイルのハンバーガーボタンクリック: オーバーレイとともにサイドバーを表示
- モバイルのオーバーレイクリック: サイドバーを閉じる
- ページ遷移検知: `$page.url.pathname` を参照し、一致する項目をアクティブ状態に設定

### バリデーション表示

なし

## data-testid

| testid                          | 要素種別    | 説明                             |
| ------------------------------- | ----------- | -------------------------------- |
| `sidebar`                       | `<nav>`     | サイドバー全体                   |
| `sidebar-toggle`                | `<button>`  | デスクトップ用サイドバー開閉ボタン |
| `sidebar-hamburger`             | `<button>`  | モバイル用ハンバーガーボタン     |
| `sidebar-overlay`               | `<div>`     | モバイル用オーバーレイ           |
| `sidebar-category-meal`         | `<button>`  | 献立系カテゴリ見出し             |
| `sidebar-category-expense`      | `<button>`  | 収支系カテゴリ見出し             |
| `sidebar-item-recipes`          | `<a>`       | レシピ一覧メニュー項目           |
| `sidebar-item-recipes-tags`     | `<a>`       | タグメニュー項目                 |
| `sidebar-item-expenses`         | `<a>`       | 家計簿メニュー項目               |

## Non-Functional Requirements

### Performance

- サイドバーは `+layout.svelte` に配置するため、ページ遷移時に再マウントしない
- メニュー項目はハードコード定数のため、API 呼び出しなし

### Security

- `{@html}` は使用しない
- メニュー項目の URL はコード内定数のみ。外部入力から生成しない

### Accessibility

- サイドバー全体を `<nav aria-label="メインナビゲーション">` でマークアップする
- カテゴリボタンに `aria-expanded="true|false"` を付与する
- サイドバー開閉ボタンに `aria-label="サイドバーを閉じる"` / `aria-label="サイドバーを開く"` を動的に付与する
- ハンバーガーボタンに `aria-label="メニューを開く"` を付与する
- アクティブなメニュー項目に `aria-current="page"` を付与する
- キーボードフォーカス可能な要素には `focus-visible:ring` を付与する
- モバイルオーバーレイ表示中は背後のコンテンツを `inert` にする（スクリーンリーダー対応）
