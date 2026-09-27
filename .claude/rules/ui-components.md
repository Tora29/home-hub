# UI Components

SvelteKit + Tailwind CSS v4 における UI コンポーネント設計規約。

---

## デザイントークン

`src/app.css` の `@theme` で定義。Tailwind クラスはトークン名をそのまま使う（`bg-accent`・`text-label` 等）。

### カラートークン

| トークン               | Tailwind クラス例                           | 用途                                 |
| ---------------------- | ------------------------------------------- | ------------------------------------ |
| `--color-bg`           | `bg-bg`                                     | ページ背景                           |
| `--color-bg-secondary` | `bg-bg-secondary`                           | サブ背景（サイドバー・セクション）   |
| `--color-bg-grouped`   | `bg-bg-grouped`                             | グループ背景（ヘッダー・ナビ選択）   |
| `--color-bg-tertiary`  | `bg-bg-tertiary`                            | 第 3 背景                            |
| `--color-bg-card`      | `bg-bg-card`                                | カード背景                           |
| `--color-label`        | `text-label`                                | 主要テキスト                         |
| `--color-secondary`    | `text-secondary`                            | 補助テキスト（60% 透明度）           |
| `--color-tertiary`     | `text-tertiary`                             | 控えめテキスト（30% 透明度）         |
| `--color-accent`       | `bg-accent` / `text-accent` / `ring-accent` | アクション・選択状態                 |
| `--color-destructive`  | `bg-destructive` / `text-destructive`       | 削除・エラー                         |
| `--color-success`      | `text-success`                              | 成功・完了                           |
| `--color-warning`      | `text-warning`                              | 警告・保留状態                       |
| `--color-bg-warning`   | `bg-bg-warning`                             | 警告背景                             |
| `--color-separator`    | `border-separator`                          | 境界線・区切り線                     |
| `--color-bg-dot`       | `bg-bg-dot`                                 | ドット・装飾背景                     |
| `--color-on-accent`    | `text-on-accent`                            | accent / destructive 背景上の文字    |
| `--color-overlay`      | `bg-overlay` / `backdrop:bg-overlay`        | モーダル・ドロワーの背景オーバーレイ |

- `text-white` / `bg-black/40` / `#hex` 等の生カラーは使わない。必要な色が無ければ `app.css` にトークンを追加する

### 特殊トークン

- `--shadow-sidebar`: Tailwind `shadow-*` で方向指定不可のため CSS 変数で個別定義
- ダークモード: `.dark` クラスでトークン値を上書き（`@custom-variant dark (&:where(.dark, .dark *))`）

---

## コンポーネント Props 設計

### HTMLAttributes の拡張

`data-testid`・`aria-label`・イベントハンドラ等をすべて透過させる。

```typescript
// button 系: HTMLButtonAttributes を extends
import type { HTMLButtonAttributes } from 'svelte/elements';

interface Props extends HTMLButtonAttributes {
	variant?: 'primary' | 'secondary' | 'destructive' | 'ghost-destructive';
	size?: 'sm' | 'md' | 'lg';
	children: Snippet;
}

let { variant = 'primary', size = 'md', children, ...rest }: Props = $props();
// <button {...rest}> で data-testid 等が自動透過
```

```typescript
// input 系: size 属性が HTML と衝突するため Omit して再定義
import type { HTMLInputAttributes } from 'svelte/elements';

interface Props extends Omit<HTMLInputAttributes, 'size'> {
	value?: string;
	size?: 'sm' | 'md' | 'lg';
}
```

### `$bindable` による双方向バインド

`Input` / `Textarea` / `Select` の `value` は `$bindable` で宣言し、`bind:value` を有効にする。

```typescript
let { value = $bindable(''), ...rest }: Props = $props();
```

```svelte
<!-- 呼び出し側 -->
<Input bind:value={name} />
```

### Snippet による子要素

`Button` のような子要素を含むコンポーネントは `Snippet` 型を使う。

```typescript
import type { Snippet } from 'svelte';

interface Props {
	children: Snippet;
}

let { children }: Props = $props();
// <button>{@render children()}</button>
```

---

## スタイル組み立てパターン

variant / size ごとにクラスを Record で定義し、文字列結合で適用する。

```typescript
const variantClasses: Record<NonNullable<Props['variant']>, string> = {
	primary: 'bg-accent text-on-accent hover:opacity-90 disabled:opacity-60 transition-opacity',
	secondary: 'border border-separator text-secondary hover:text-label transition-colors',
	destructive:
		'bg-destructive text-on-accent hover:opacity-90 disabled:opacity-60 transition-opacity',
	'ghost-destructive': 'bg-destructive/10 text-destructive hover:opacity-80 transition-opacity'
};

const sizeClasses: Record<NonNullable<Props['size']>, string> = {
	sm: 'py-1.5 px-3 text-xs',
	md: 'py-2 px-4 text-sm',
	lg: 'py-3 px-6'
};

const baseClass = 'inline-flex items-center gap-2 font-medium rounded-2xl';
```

```svelte
<button class="{baseClass} {variantClasses[variant]} {sizeClasses[size]} {className}" {type} {...rest}>
```

- `Record` のキーは Props の union 型にする（variant 追加時に定義漏れを型エラーで検出するため）
- 親からの追加クラスは `class?: string` prop で受け取り末尾に連結する
- `<button>` の `type` はデフォルト `'button'` にする（HTML 既定の `submit` による意図しないフォーム送信を防ぐ）
- `class` prop はリネームして受け取る: `class: className = ''`

---

## 共通コンポーネント一覧

| コンポーネント  | 場所                                      | variant                                                                 |
| --------------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| `Button`        | `src/lib/components/Button.svelte`        | primary / secondary / destructive / ghost-destructive                   |
| `Input`         | `src/lib/components/Input.svelte`         | サイズのみ（sm / md / lg）                                              |
| `Select`        | `src/lib/components/Select.svelte`        | サイズのみ                                                              |
| `Textarea`      | `src/lib/components/Textarea.svelte`      | サイズのみ                                                              |
| `Dialog`        | `src/lib/components/Dialog.svelte`        | role: dialog / alertdialog                                              |
| `ConfirmDialog` | `src/lib/components/ConfirmDialog.svelte` | Dialog のラッパー                                                       |
| `Checkbox`      | `src/lib/components/Checkbox.svelte`      | —（`<button role="checkbox">` 実装。`HTMLButtonAttributes` を extends） |
| `Header`        | `src/lib/components/Header.svelte`        | レイアウト専用（ロゴ・ダークモード切替・ログアウト）                    |
| `Sidebar`       | `src/lib/components/Sidebar.svelte`       | レイアウト専用（ナビゲーション）                                        |

- 開閉状態は `src/lib/stores/sidebar.svelte.ts`（`$state` モジュール）で共有する。`svelte/store` の `writable` は新規に使わない
- レイアウト専用コンポーネント内の素の `<button>` は許容するが `type="button"` を必ず明示する

---

## Dialog コンポーネント

`Dialog` は backdrop・Escape キー・aria 属性を担当するシェル。中身は `children` Snippet で差し込む。

```svelte
<Dialog
	open={deleteDialogOpen}
	onClose={() => (deleteDialogOpen = false)}
	role="alertdialog"
	aria-label="削除確認"
>
	<!-- 中身 -->
</Dialog>
```

- `closeOnBackdrop={false}` で backdrop クリックを無効化（処理中など）
- `disabled={isLoading}` で Escape・backdrop による閉じるを無効化

### ネイティブ `<dialog>` による実装

`Dialog.svelte` は `<dialog>` + `showModal()` で実装しており、WAI-ARIA Dialog パターンの要件をブラウザ標準で満たす。

| 要件                                             | 担当                                                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 開いたらダイアログ内へフォーカス移動             | `showModal()`（最初のフォーカス可能要素 / `autofocus`）                                                                        |
| 背景（ページ要素）へのフォーカス移動・操作を防ぐ | top layer + inert（ブラウザ標準。最後の要素の次はブラウザ UI へ抜けるのが仕様）                                                |
| 閉じたら開く前の要素へフォーカスを戻す           | 開く直前の `document.activeElement` を保持し、アンマウント時に `focus()`（DOM から外れる dialog では標準の復帰が働かないため） |
| Escape で閉じる                                  | `cancel` イベントを `preventDefault` し `onClose` で親に委譲                                                                   |
| backdrop クリック                                | `<dialog>` 自体（カード外）のクリックを `onClose` で親に委譲                                                                   |

- `open` の状態は親が持つ。`Dialog` 内で `dialog.close()` による自己クローズをしない（Escape も親経由）
- backdrop の色は `backdrop:` バリアント、表示時レイアウトは `open:flex` で指定する（常時 `flex` だと閉じた dialog が表示される）
- 自前の `role="dialog"` div + `tabindex="-1"` によるモーダルは新規に作らない
- 上記の挙動は `e2e/expenses.e2e.ts` の「キーボード・モーダル操作」で回帰テストしている

## 汎用コンポーネントへの data-testid

汎用コンポーネントは `data-testid` を内部に固定しない。`{...rest}` 透過で親から渡す。

```svelte
<!-- 呼び出し側 -->
<Button data-testid="expense-delete-button">削除</Button>
```

---

## アイコン

`@lucide/svelte` から import して使う。

```svelte
<script lang="ts">
	import { Plus, TriangleAlert } from '@lucide/svelte';
</script>

<Plus size={18} />
<TriangleAlert size={18} class="shrink-0 text-destructive" aria-hidden="true" />
```

- サイズは `size` prop で指定（px）
- カラーは Tailwind クラス（`class="text-secondary"`）で指定
- 旧名エイリアス（`AlertTriangle` → `TriangleAlert` 等）は非推奨。新規コードは正式名を使う
- 装飾目的のアイコンには `aria-hidden="true"`、アイコンのみのボタンには `aria-label` を付ける
  （lucide は a11y 属性が無いと自動で `aria-hidden` を付けるが、意図の明示のため書く。自前 `<svg>` は自動付与されない）

---

## 機能固有 vs 共有コンポーネント

| 条件                                         | 配置先                                   |
| -------------------------------------------- | ---------------------------------------- |
| 1つの機能でしか使わない                      | `src/lib/features/{feature}/components/` |
| 複数機能で再利用する（または汎用 UI パーツ） | `src/lib/components/`                    |

共有コンポーネントは `@feature` タグをファイルヘッダーから省略する（→ `file-headers.md` 参照）。

---

## ダークモード

`.dark` クラスで CSS トークンを上書きする設計。コンポーネント側はトークンを使うだけでダークモード対応になる。
明示的な `dark:` プレフィックスクラスは原則不要（トークン変数で吸収）。

---

## FOUC 対策（サイドバー）

サイドバーの開閉状態は `app.html` の blocking `<script>` で `data-sidebar-open` 属性をセットし、
CSS がレンダリング前に適用されるよう対処している。新たにレイアウト依存の初期状態が必要な場合も同じパターンで対応する。

---

## なぜ必要か

- デザイントークンの直接参照でカラー・タイポグラフィの一貫性を保つため
