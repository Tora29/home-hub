# UI Components

SvelteKit + Tailwind CSS v4 における UI コンポーネント設計規約。

---

## デザイントークン

`src/app.css` の `@theme` で定義。Tailwind クラスはトークン名をそのまま使う（`bg-accent`・`text-label` 等）。

### カラートークン

| トークン               | Tailwind クラス例                           | 用途                               |
| ---------------------- | ------------------------------------------- | ---------------------------------- |
| `--color-bg`           | `bg-bg`                                     | ページ背景                         |
| `--color-bg-secondary` | `bg-bg-secondary`                           | サブ背景（サイドバー・セクション） |
| `--color-bg-card`      | `bg-bg-card`                                | カード背景                         |
| `--color-label`        | `text-label`                                | 主要テキスト                       |
| `--color-secondary`    | `text-secondary`                            | 補助テキスト（60% 透明度）         |
| `--color-tertiary`     | `text-tertiary`                             | 控えめテキスト（30% 透明度）       |
| `--color-accent`       | `bg-accent` / `text-accent` / `ring-accent` | アクション・選択状態               |
| `--color-destructive`  | `bg-destructive` / `text-destructive`       | 削除・エラー                       |
| `--color-success`      | `text-success`                              | 成功・完了                         |
| `--color-warning`      | `text-warning`                              | 警告・保留状態                     |
| `--color-bg-warning`   | `bg-bg-warning`                             | 警告背景                           |
| `--color-separator`    | `border-separator`                          | 境界線・区切り線                   |

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
const variantClasses: Record<string, string> = {
	primary: 'bg-accent text-white hover:opacity-90 disabled:opacity-60 transition-opacity',
	secondary: 'border border-separator text-secondary hover:text-label transition-colors',
	destructive: 'bg-destructive text-white hover:opacity-90 disabled:opacity-60 transition-opacity',
	'ghost-destructive': 'bg-destructive/10 text-destructive hover:opacity-80 transition-opacity'
};

const sizeClasses: Record<string, string> = {
	sm: 'py-1.5 px-3 text-xs',
	md: 'py-2 px-4 text-sm',
	lg: 'py-3 px-6'
};

const baseClass = 'inline-flex items-center gap-2 font-medium rounded-2xl';
```

```svelte
<button class="{baseClass} {variantClasses[variant]} {sizeClasses[size]} {className}" {…rest}>
```

- 親からの追加クラスは `class?: string` prop で受け取り末尾に連結する
- `class` prop はリネームして受け取る: `class: className = ''`

---

## 共通コンポーネント一覧

| コンポーネント  | 場所                                      | variant                                               |
| --------------- | ----------------------------------------- | ----------------------------------------------------- |
| `Button`        | `src/lib/components/Button.svelte`        | primary / secondary / destructive / ghost-destructive |
| `Input`         | `src/lib/components/Input.svelte`         | サイズのみ（sm / md / lg）                            |
| `Select`        | `src/lib/components/Select.svelte`        | サイズのみ                                            |
| `Textarea`      | `src/lib/components/Textarea.svelte`      | サイズのみ                                            |
| `Dialog`        | `src/lib/components/Dialog.svelte`        | role: dialog / alertdialog                            |
| `ConfirmDialog` | `src/lib/components/ConfirmDialog.svelte` | Dialog のラッパー                                     |

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

### `tabindex="-1"` の a11y 警告抑制

Svelte linter は `dialog` / `alertdialog` ロールを non-interactive と判定するため警告が出る。
`tabindex="-1"` はフォーカス管理に必要な正しいパターンのため `svelte-ignore` で抑制する（→ `svelte.md` 参照）。

---

## 汎用コンポーネントへの data-testid

汎用コンポーネントは `data-testid` を内部に固定しない。`{...rest}` 透過で親から渡す（→ `data-testid.md` 参照）。

```svelte
<!-- 呼び出し側 -->
<Button data-testid="expense-delete-button">削除</Button>
```

---

## アイコン

`@lucide/svelte` から import して使う。

```svelte
import {(Plus, Trash2, AlertTriangle)} from '@lucide/svelte';

<Plus size={18} />
<AlertTriangle size={18} class="shrink-0 text-destructive" />
```

- サイズは `size` prop で指定（px）
- カラーは Tailwind クラス（`class="text-secondary"`）で指定

---

## 機能固有 vs 共有コンポーネント

| 条件                                         | 配置先                             |
| -------------------------------------------- | ---------------------------------- |
| 1つの機能でしか使わない                      | `src/routes/{feature}/components/` |
| 複数機能で再利用する（または汎用 UI パーツ） | `src/lib/components/`              |

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

- scaffold-fe スキルが UI コードを生成する際の規約
- デザイントークンの直接参照でカラー・タイポグラフィの一貫性を保つため

## 参照するスキル

- scaffold-fe, scaffold-test-unit
