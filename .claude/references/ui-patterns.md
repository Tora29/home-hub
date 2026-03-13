# UI Patterns

Apple Human Interface Guidelines (HIG) に準拠したモバイルファーストの FE 設計規約。
技術スタック: **SvelteKit v5 + Tailwind CSS**
参考: https://developer.apple.com/design/human-interface-guidelines

---

## 1. タッチターゲット

**最小 44 × 44px**（Apple HIG 公式要件）。
視覚的に小さいアイコンでも、`padding` で当たり判定を 44px に拡張する。

```svelte
<!-- アイコンボタンの例 -->
<button class="min-w-[44px] min-h-[44px] flex items-center justify-center">
  <Icon />
</button>
```

---

## 2. Safe Area / 画面端の余白

ノッチ・Dynamic Island・ホームインジケーターによるコンテンツの隠れを防ぐ。

```css
/* app.css または +layout.svelte の global スタイル */
.page {
  padding-top: env(safe-area-inset-top);
  padding-bottom: calc(env(safe-area-inset-bottom) + 1rem);
  padding-left: max(1rem, env(safe-area-inset-left));
  padding-right: max(1rem, env(safe-area-inset-right));
}

/* 固定タブバー・フッター */
.fixed-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

Tailwind では `pb-[env(safe-area-inset-bottom)]` は使えないため、
`tailwind.config.js` に以下を追加する:

```js
// tailwind.config.js
theme: {
  extend: {
    spacing: {
      'safe-top': 'env(safe-area-inset-top)',
      'safe-bottom': 'env(safe-area-inset-bottom)',
    }
  }
}
```

---

## 3. コンポーネント高さの基準値（HIG 準拠）

| コンポーネント | 高さ |
|---|---|
| ナビゲーションバー | 44px |
| タブバー | 49px + safe-area-bottom |
| 標準ボタン / セル / テキストフィールド | 44px |
| CTA（大ボタン） | 50〜56px |

---

## 4. タイポグラフィ（Dynamic Type 準拠）

iOS HIG のテキストスタイルを `rem` で表現する（1rem = 17px = Body）。
**最小フォントサイズは 11px（0.647rem）**。これ以下は使用禁止。

```js
// tailwind.config.js
theme: {
  extend: {
    fontSize: {
      'ios-large-title': ['2rem', { lineHeight: '2.41rem', letterSpacing: '0.022em' }],    // 34px
      'ios-title1':      ['1.647rem', { lineHeight: '2rem', letterSpacing: '0.021em' }],   // 28px
      'ios-title2':      ['1.294rem', { lineHeight: '1.647rem', letterSpacing: '0.021em' }], // 22px
      'ios-title3':      ['1.176rem', { lineHeight: '1.47rem', letterSpacing: '0.022em' }],  // 20px
      'ios-headline':    ['1rem', { lineHeight: '1.294rem', fontWeight: '600', letterSpacing: '-0.024em' }], // 17px
      'ios-body':        ['1rem', { lineHeight: '1.294rem', letterSpacing: '-0.024em' }],   // 17px
      'ios-callout':     ['0.941rem', { lineHeight: '1.235rem', letterSpacing: '-0.019em' }], // 16px
      'ios-subheadline': ['0.882rem', { lineHeight: '1.176rem', letterSpacing: '-0.014em' }], // 15px
      'ios-footnote':    ['0.765rem', { lineHeight: '1.059rem', letterSpacing: '-0.005em' }], // 13px
      'ios-caption1':    ['0.706rem', { lineHeight: '0.941rem', letterSpacing: '0' }],      // 12px
      'ios-caption2':    ['0.647rem', { lineHeight: '0.765rem', letterSpacing: '0.004em' }], // 11px（最小）
    }
  }
}
```

### 使い方
```svelte
<h1 class="text-ios-large-title font-normal">今日の献立</h1>
<p  class="text-ios-body">タップして料理を選んでください</p>
<span class="text-ios-caption1 text-secondary">2024/01/01</span>
```

---

## 5. カラーシステム（ダークモード対応）

iOS セマンティックカラーを CSS カスタムプロパティ + Tailwind で管理。

```css
/* app.css */
:root {
  /* 背景 */
  --color-bg:           #ffffff;
  --color-bg-secondary: #f2f2f7;
  --color-bg-tertiary:  #ffffff;
  --color-bg-grouped:   #f2f2f7;
  --color-bg-card:      #ffffff;

  /* テキスト */
  --color-label:           #000000;
  --color-label-secondary: rgba(60,60,67,.60);
  --color-label-tertiary:  rgba(60,60,67,.30);
  --color-placeholder:     rgba(60,60,67,.30);

  /* アクセント */
  --color-accent:      #007aff;
  --color-destructive: #ff3b30;
  --color-success:     #34c759;
  --color-warning:     #ff9500;

  /* セパレーター */
  --color-separator:   rgba(60,60,67,.29);
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg:           #000000;
    --color-bg-secondary: #1c1c1e;
    --color-bg-tertiary:  #2c2c2e;
    --color-bg-grouped:   #000000;
    --color-bg-card:      #1c1c1e;

    --color-label:           #ffffff;
    --color-label-secondary: rgba(235,235,245,.60);
    --color-label-tertiary:  rgba(235,235,245,.30);
    --color-placeholder:     rgba(235,235,245,.30);

    --color-accent:      #0a84ff;
    --color-destructive: #ff453a;
    --color-success:     #30d158;
    --color-warning:     #ff9f0a;

    --color-separator:   rgba(84,84,88,.65);
  }
}
```

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      bg:          'var(--color-bg)',
      'bg-secondary': 'var(--color-bg-secondary)',
      'bg-tertiary':  'var(--color-bg-tertiary)',
      'bg-card':   'var(--color-bg-card)',
      label:       'var(--color-label)',
      secondary:   'var(--color-label-secondary)',
      tertiary:    'var(--color-label-tertiary)',
      accent:      'var(--color-accent)',
      destructive: 'var(--color-destructive)',
      success:     'var(--color-success)',
      warning:     'var(--color-warning)',
      separator:   'var(--color-separator)',
    }
  }
}
```

### 使い方
```svelte
<!-- ハードコードの hex 値は使用禁止。必ず Tailwind カラートークン経由で参照 -->
<div class="bg-bg text-label">
  <p class="text-secondary">補足テキスト</p>
  <button class="bg-accent text-white">保存</button>
  <button class="text-destructive">削除</button>
</div>
```

---

## 6. スペーシング（8pt グリッド）

4pt の倍数を基本単位とし、主に 8pt（= Tailwind の `2` 単位）の倍数を使用する。

| 用途 | Tailwind クラス | 実値 |
|---|---|---|
| アイコン周囲の最小余白 | `p-1` | 4px |
| 関連要素間 | `gap-2` | 8px |
| セル内パディング（小） | `p-3` | 12px |
| 標準コンテンツ余白 | `px-4` | 16px |
| セクション間 | `gap-5` | 20px |
| カード・セクション余白 | `gap-6` | 24px |
| ページレベルの上下余白 | `py-8` | 32px |

---

## 7. ナビゲーション

### タブバー
- 2〜5 個のトップレベル機能に使用
- アイコン + ラベルのセット（ラベルは省略しない）
- `fixed bottom-0 left-0 right-0 h-[49px]` に配置し、safe-area-bottom を加算

### ナビゲーションバー
- 高さ: `h-[44px]`
- 左に戻るボタン、中央にタイトル、右にプライマリアクション（1〜2 個まで）
- ラージタイトルはトップレベル画面のみ（階層が深い画面では通常タイトル）

### モーダル / ボトムシート
- プライマリコンテンツを中断するタスクには**ボトムシート**を使用
- 完全に独立したフローには**フルスクリーンモーダル**を使用
- ドラッグハンドル（上部中央の細い棒）を必ず表示
- 下スワイプで閉じる動作をサポートする

---

## 8. ジェスチャー

| ジェスチャー | CSS / 実装上の注意 |
|---|---|
| タップ | `touch-action: manipulation` でタップ遅延を除去（Tailwind: `touch-manipulation`）|
| 水平スワイプ | `touch-action: pan-y` を指定してスクロールと競合させない |
| 垂直スクロール | `overflow-y: scroll; -webkit-overflow-scrolling: touch;` + `overscroll-behavior-y: contain` |
| スワイプバック | `overflow: hidden` による妨害を最小化する |

```svelte
<!-- スクロールコンテナの基本 -->
<div class="overflow-y-scroll overscroll-y-contain touch-pan-y">
  ...
</div>
```

---

## 9. アニメーション / モーション

iOS らしいスプリングアニメーションを CSS で近似する。

```css
/* app.css */
:root {
  --ease-ios: cubic-bezier(0.25, 0.46, 0.45, 0.94);   /* smooth（汎用） */
  --ease-snappy: cubic-bezier(0.34, 1.56, 0.64, 1.0); /* snappy（操作フィードバック） */
  --ease-page: cubic-bezier(0.32, 0.72, 0, 1);         /* 画面遷移 */
}
```

```js
// tailwind.config.js
theme: {
  extend: {
    transitionTimingFunction: {
      ios:    'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      snappy: 'cubic-bezier(0.34, 1.56, 0.64, 1.0)',
      page:   'cubic-bezier(0.32, 0.72, 0, 1)',
    },
    transitionDuration: {
      // 使用する duration は下記から選択
      // 150ms（微細フィードバック）/ 250ms（コンポーネント）/ 350ms（画面遷移）
    }
  }
}
```

| 用途 | duration | easing |
|---|---|---|
| ボタン押下フィードバック | 150ms | `ease-ios` |
| コンポーネントの表示・非表示 | 250ms | `ease-ios` |
| ボトムシートのスライドイン | 350ms | `ease-ios` |
| 画面遷移 | 350ms | `ease-page` |

### Reduce Motion（必須）
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 10. コンポーネント分割基準

### 分割トリガー
- 100 行を超える `.svelte` ファイルは分割を検討する
- 3 つ以上の責務を持つコンポーネントは分割する
- 2 箇所以上で使われる UI は `lib/components/` の共有コンポーネントへ切り出す

### CRUD パターンの分割指針

```
+page.svelte         ← ルーティング・データフェッチ（SvelteKit load）
components/
├── DishList.svelte  ← 一覧の描画・空状態・ローディング
│   └── DishItem.svelte ← 1件分の表示
└── DishForm.svelte  ← 作成・編集フォーム（モーダルまたは別ページ）
```

### ページ vs 部品コンポーネントの責務

| 種別 | 責務 |
|---|---|
| `+page.svelte` | SvelteKit load / データフェッチ / ルーティング / レイアウト全体 |
| `components/*.svelte` | 表示ロジックのみ。データは props 経由で受け取る |
| `lib/components/*.svelte` | 汎用 UI 部品。アプリ固有のドメイン知識を持たない |

---

## 11. 状態管理

| 状態の種類 | 管理方法 |
|---|---|
| コンポーネントローカル状態 | Svelte 5 の `$state` rune |
| フォーム状態 | `$state` + `$derived` で計算値を管理 |
| グローバル状態（認証・ユーザー情報等） | `lib/stores/` の Svelte store |
| サーバー起因のデータ | SvelteKit の `load` 関数 + `$page.data` |

---

## 12. 命名規則

| 種別 | 規約 | 例 |
|---|---|---|
| コンポーネントファイル | PascalCase | `DishCard.svelte`, `MenuList.svelte` |
| コンポーネント props | camelCase | `dishName`, `isLoading` |
| イベント emit | `on` + PascalCase | `onSelect`, `onDelete`, `onCreate` |
| ページファイル | SvelteKit 規約そのまま | `+page.svelte`, `+layout.svelte` |
| CSS クラス | Tailwind ユーティリティを直接使用 | `flex flex-col gap-4` |

---

## 13. アクセシビリティ要件

### 準拠基準
- **WCAG 2.1 AA** 準拠
- コントラスト比: 通常テキスト **4.5:1** 以上、大きいテキスト（18px+）は **3:1** 以上
- Light / Dark 両モードで確認する

### フォーム
```svelte
<!-- すべての入力フィールドに label を関連付ける -->
<label for="dish-name">料理名</label>
<input id="dish-name" type="text" aria-describedby="dish-name-error" />
{#if error}
  <span id="dish-name-error" role="alert" class="text-destructive text-ios-caption1">
    {error}
  </span>
{/if}
```

### その他
- ボタンは `<button>`、リンクは `<a>` を使う（`div` / `span` にクリックイベントを付けない）
- アイコンのみのボタンには `aria-label` を必ず付与
- 装飾目的の `<img>` には `alt=""`
- フォーカスインジケーターは `:focus-visible` を維持する（`outline: none` の全体適用禁止）

---

## 14. スタイリング方針

- **Tailwind CSS のユーティリティクラスを基本とする**
- コンポーネント固有の複雑なスタイルは `<style>` ブロックに記述（CSS Modules 相当）
- グローバルスタイルは `app.css` に集約
- `!important` の使用は最小限（Tailwind の `!` modifier も同様）

### レスポンシブ方針
- **モバイルファースト**（幅 375px の iPhone SE を基準）
- タブレット向けは `md:` (768px)、デスクトップは `lg:` (1024px) のブレークポイントを使用
- 基本レイアウトは縦一列（`flex flex-col`）

---

## 15. 実装チェックリスト（必須 / 禁止）

### 必須
- [ ] インタラクティブ要素のタッチターゲットが 44 × 44px 以上
- [ ] Safe Area insets の動的対応（`env(safe-area-inset-*)` 使用）
- [ ] カラーは Tailwind トークン経由（ハードコード hex 禁止）
- [ ] `@media (prefers-reduced-motion: reduce)` でアニメーション無効化
- [ ] `@media (prefers-color-scheme: dark)` でダークモード対応
- [ ] すべての `<button>` に意味のある `aria-label` または テキストラベル
- [ ] すべての `<input>` に `<label>` を関連付け

### 禁止
- [ ] フォントサイズ 11px 未満の使用
- [ ] 色のハードコード（`#007aff` 等の直接記述）
- [ ] 44px 未満のタッチターゲット
- [ ] `div` / `span` へのクリックイベント（`<button>` または `<a>` を使う）
- [ ] `outline: none` のグローバル適用（フォーカスインジケーターを消さない）

---

## なぜ必要か

- scaffold-fe スキルが FE コードを生成する際の規約
- code-simplifier スキルがコンポーネント分割を判断する際の基準
- Apple HIG 準拠によりスマートフォンでネイティブアプリに近い操作感を実現する
- アクセシビリティ（WCAG 2.1 AA）と操作性を保つため

## 参照するスキル

- scaffold-fe, scaffold-test-e2e, code-simplifier, review-changes
