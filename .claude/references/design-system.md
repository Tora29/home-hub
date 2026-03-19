# Design System

このプロジェクトのビジュアルデザイン方針。
scaffold-fe スキルがコード生成時に参照する。

## アプリコンセプト

**夫婦2人で使う暮らし管理アプリ**

- 献立・家計・思い出など、日々の暮らしを2人で積み重ねる
- 衝動的に残したくなる瞬間をスクラップブック的に記録する
- ターゲット: 自分と妻（クローズドな2人用空間）

## トーン＆ムード

- **可愛らしく、温かみがある**（ほっこり系）
- スクラップブック・ポラロイド的な手作り感
- 生活感があるが、整理されている

## カラートークン

`app.css` で定義済み。必ず Tailwind クラス経由で使うこと（インラインの hex 指定は禁止）。

### ライトモード実値（参考）

| トークン（Tailwindクラス） | 実値 | 用途 |
|--------------------------|------|------|
| `bg-bg` / `bg-bg-tertiary` | `#fdfaf6` | ページ背景 |
| `bg-bg-secondary` | `#f5efe6` | セクション背景 |
| `bg-bg-grouped` | `#f0e9de` | グループ背景 |
| `bg-bg-card` | `#ffffff` | カード背景 |
| `text-label` | `#3d3530` | 本文テキスト |
| `text-secondary` | `rgba(61,53,48,.6)` | 補助テキスト |
| `text-tertiary` | `rgba(61,53,48,.3)` | プレースホルダー |
| `bg-accent` / `text-accent` | `#c4705a` | プライマリアクション（テラコッタ） |
| `bg-success` | `#5a9e65` | 成功（セージグリーン） |
| `bg-destructive` | `#c94b4b` | エラー |
| `border-separator` | `rgba(180,155,135,.35)` | 区切り線 |

## フォント

`app.css` で `font-sans` に **Zen Maru Gothic**（Google Fonts）を設定済み。
`font-sans` クラスを使えば自動適用される。追加のフォント指定は不要。

## 形状・レイアウト

- 角丸: 強め（`rounded-2xl` `rounded-3xl`）
- シャドウ: 柔らかく薄め（`shadow-sm` `shadow-md`）
- 余白: ゆとりを持たせる（`p-6`〜`p-8`、`gap-4`〜`gap-6`）
- 基本は整頓された温かさ優先（過度な非対称レイアウトは避ける）

## アイコン

**`@lucide/svelte`**（Svelte 5 専用パッケージ）を使用する。`lucide-svelte` は Svelte 4 用なので使わない。SVG をインラインで書かない。

```svelte
<script>
  import { UtensilsCrossed, Heart, Home, BookOpen } from '@lucide/svelte';
</script>

<UtensilsCrossed size={20} class="text-accent" />
```

- サイズ: `size` prop で指定（UI内: 16〜20、ヒーロー: 24〜32）
- カラー: Tailwind の `class="text-accent"` 等で指定

## 装飾パターン

### 背景テクスチャ
薄いドットパターンを CSS で実装：
```html
<div class="bg-bg-grouped"
  style="background-image: radial-gradient(circle, rgba(180,155,135,.2) 1px, transparent 1px); background-size: 20px 20px;">
```

### カード
```html
<div class="rounded-3xl bg-bg-card shadow-md p-6">
```

### アクセントボタン
```html
<button class="rounded-2xl bg-accent text-white font-medium px-6 py-3 shadow-sm">
```

## 避けること

- インラインの hex カラー指定（トークンを使う）
- iOS ブルー（旧 `#007aff`）の混入
- 角丸なし・ハードシャドウ（企業システムっぽさ）
- アニメーション過多（`transition-*` 程度に留める）
