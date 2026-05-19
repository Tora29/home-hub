---
name: scaffold-ui-mockup
description: >
  ユーザーの要望から、このプロジェクトのデザインシステム（テラコッタ・ベージュ系のほっこりトーン）に沿った
  インタラクティブな HTML UI モックアップを生成するスキル。
  生成した ui-mockup.html がこのプロジェクトの唯一の仕様ファイルとなる。
  ユーザーが「UI イメージを見たい」「画面をモックアップしたい」「どんな見た目になるか確認したい」
  「新機能を実装したい」「仕様を作りたい」と言ったときに使う。
  specs/{feature}/ui-mockup.html を出力する。
---

# scaffold-ui-mockup

ユーザーの要望から、HTML UI モックアップを生成するスキル。
`specs/{feature}/ui-mockup.html` が唯一の仕様ファイルとなる。
Svelte コードは生成せず、単一の自己完結した HTML ファイルを出力する。

スキルフロー上の位置づけ:

```
[/scaffold-ui-mockup] → /scaffold-contract → /scaffold-fe ...
```

## 前提条件

- なし（ユーザーの要望から直接生成する）

既存 feature の更新の場合は `specs/{feature}/ui-mockup.html` を Read して現行 mockup を把握する。

worktree・scaffold-contract の実行は不要。

## 起動時の挙動

引数（feature 名）がない場合、ユーザーに確認する。

## ワークフロー

```
要望収集 → design-system 参照 → 画面・状態の列挙 → HTML 生成 → チェックリスト検証
```

### Step 1: 要望収集

ユーザーに以下を確認する（AskUserQuestion または直接テキストで）:

- 機能名（feature ディレクトリ名になる）
- 画面に表示するデータの項目
- ユーザーが行う操作（一覧・作成・編集・削除 等）
- バリデーションルール（文字数・必須 等）

既存 feature の更新の場合は `specs/{feature}/ui-mockup.html` を Read して現行 mockup を把握する。

### Step 2: design-system 参照

`.claude/references/design-system.md` を Read ツールで読み込み、HTML 生成の設計規約とする。

design-system.md はこのプロジェクトの **Single Source of Truth**。  
カラートークン・フォント・形状・アイコン規約がここに定義されている。

**HTML 用 CSS 変数への変換ルール:**

design-system.md のトークンテーブルの「ライトモード実値」列を `:root` の CSS 変数に変換して使う。  
Tailwind クラス名ではなく CSS 変数 `var(--accent)` 等で記述する。

| design-system.md の Tailwind クラス | HTML 用 CSS 変数名 |
| ----------------------------------- | ------------------ |
| `bg-accent` / `text-accent`         | `--accent`         |
| `text-label`                        | `--label`          |
| `text-secondary`                    | `--secondary`      |
| `text-tertiary`                     | `--tertiary`       |
| `bg-bg`                             | `--bg`             |
| `bg-bg-secondary`                   | `--bg-secondary`   |
| `bg-bg-grouped`                     | `--bg-grouped`     |
| `bg-bg-card`                        | `--bg-card`        |
| `bg-success`                        | `--success`        |
| `bg-destructive`                    | `--destructive`    |
| `border-separator`                  | `--separator`      |

```css
/* 生成する HTML の <style> 先頭に必ず含める */
:root {
	/* 実値は design-system.md のトークンテーブルから読み取る */
	--accent: <accent 実値>;
	--label: <label 実値>;
	--secondary: <secondary 実値>;
	--tertiary: <tertiary 実値>;
	--bg: <bg 実値>;
	--bg-secondary: <bg-secondary 実値>;
	--bg-grouped: <bg-grouped 実値>;
	--bg-card: <bg-card 実値>;
	--success: <success 実値>;
	--destructive: <destructive 実値>;
	--separator: <separator 実値>;
}
```

**フォント:** design-system.md の「フォント」セクションに従い、Google Fonts から Zen Maru Gothic を読み込む。

**形状:** design-system.md の「形状・レイアウト」セクションに従い、角丸・シャドウ・余白を設定する。

**アイコン:** design-system.md では `@lucide/svelte` を指定しているが、HTML モックでは SVG インラインで代替する。  
`stroke="currentColor" stroke-width="2" fill="none"` を共通属性として使い、色は `style="color: var(--accent)"` 等で指定する。

### Step 3: 画面と状態の列挙

ユーザーから収集した要望をもとに、モックアップに含める「ページ × 状態」を洗い出してタブ一覧を決定する。

**必ず含めるタブの判断基準:**

| 条件                         | 追加するタブ                                 |
| ---------------------------- | -------------------------------------------- |
| 一覧画面がある               | データあり状態                               |
| 空状態が想定される           | 空状態タブ                                   |
| フォームバリデーションがある | フォームエラー状態タブ                       |
| 削除確認ダイアログがある     | ダイアログが開いた状態（同一タブ or 別タブ） |

ユーザーに列挙した構成を提示し、確認を取ってから Step 4 へ進む。

### Step 4: HTML 生成

#### 全体構造

```html
<!DOCTYPE html>
<html lang="ja">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>{Feature名} UI Mockup</title>
		<link rel="preconnect" href="https://fonts.googleapis.com" />
		<link
			href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700&display=swap"
			rel="stylesheet"
		/>
		<style>
			/* Step 2 で導出した CSS 変数 */
			/* レイアウト・コンポーネント CSS */
		</style>
	</head>
	<body>
		<div class="app">
			<header class="header">
				<!-- ハンバーガー + ロゴ + スペーサー + テーマ切替 + ログアウト -->
			</header>
			<div class="body">
				<aside class="sidebar"><!-- サイドナビ（今回の機能をアクティブ表示）--></aside>
				<main class="main">
					<!-- モックアップ専用タブ（Step 3 で決定した構成） -->
					<div class="page-tabs">...</div>
					<div id="page-{name}" class="page active">...</div>
				</main>
			</div>
		</div>
		<!-- モーダル・ダイアログ -->
		<script>
			function showPage(name) {
				document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
				document.querySelectorAll('.page-tab').forEach((t) => t.classList.remove('active'));
				const page = document.getElementById('page-' + name);
				if (page) page.classList.add('active');
			}
			function openModal(id) {
				document.getElementById(id).classList.add('open');
			}
			function closeModal(id) {
				document.getElementById(id).classList.remove('open');
			}
			function closeOnOverlay(e) {
				if (e.target.classList.contains('overlay')) e.target.classList.remove('open');
			}
			document.addEventListener('keydown', (e) => {
				if (e.key === 'Escape')
					document.querySelectorAll('.overlay.open').forEach((o) => o.classList.remove('open'));
			});
		</script>
	</body>
</html>
```

#### ページレベルのメタ情報（必須）

`<html>` 直後に `@feature` / `@entity` / `@api` コメントを必ず付与する:

```html
<!--
  @feature {feature}
  @entity {Entity}
  @api GET /{feature} → 200 {Entity}[]
  @api POST /{feature} → 201 {Entity}
  @api PUT /{feature}/:id → 200 {Entity}
  @api DELETE /{feature}/:id → 204
-->
```

#### data-\* 属性の付与（必須）

フォームフィールドには必ず以下の属性を付与する:

- `data-testid` — E2E セレクタ（命名は `{feature}-{element}` の kebab-case）
- `data-required="true"` — 必須フィールド
- `data-min="{n}"` — 最小文字数
- `data-max="{n}"` — 最大文字数
- `data-min-val="{n}"` — 最小数値
- `data-max-val="{n}"` — 最大数値
- `data-error-msg="{msg}"` — 必須違反エラーメッセージ（日本語）
- `data-max-msg="{msg}"` — 上限超過エラーメッセージ（日本語）
- `data-min-msg="{msg}"` — 下限未満エラーメッセージ（日本語）
- `data-unique="true"` — 一意制約あり
- `data-nullable="false"` — NOT NULL

フィールドには `.field-hint` で人間向けの制約説明を付与する:

```html
<div class="field-hint">
	<span>・1〜100文字</span>
	<span>・必須入力</span>
</div>
```

フィールド例:

```html
<div class="field">
	<label>料理名 <span class="required">*</span></label>
	<input
		type="text"
		data-testid="recipe-name-input"
		data-required="true"
		data-min="1"
		data-max="100"
		data-error-msg="料理名は必須です"
		data-max-msg="100文字以内で入力してください"
	/>
	<div class="field-hint">
		<span>・1〜100文字</span>
		<span>・必須入力</span>
	</div>
	<p class="error-text" data-testid="recipe-name-error">料理名は必須です</p>
</div>
```

#### データ表現

- **ダミーデータ**: 現実的で日本語のものを 3〜5 件入れる。機能に合った自然な例を使う
- **バリデーションエラー**: エラーフィールドに `border-color: var(--destructive)` + エラーメッセージ表示
- **空状態**: アイコン + 説明文をページ中央に配置
- **ページネーション**: 必要な場合はダミーで表示

#### インタラクション（JS）

実際のデータ送信は行わない。以下を JS で実装する:

| インタラクション   | 実装                                                               |
| ------------------ | ------------------------------------------------------------------ |
| ページ切り替え     | `showPage(name)`                                                   |
| モーダル開閉       | `openModal(id)` / `closeModal(id)` + オーバーレイクリック + Escape |
| インライン編集切替 | 表示要素 ↔ 編集用 input の表示切り替え                             |

#### CSS の制約

- Tailwind クラスは使わない。`var(--accent)` 等の CSS 変数で書く
- hex カラーを直書きしない（design-system.md が Single Source of Truth なので、CSS 変数経由で間接参照する）

### Step 5: チェックリスト検証

- [ ] ユーザーの要望で挙がった全画面が少なくとも 1 タブに対応している
- [ ] 空状態タブがある（空状態が想定される場合は必須）
- [ ] バリデーションエラー状態タブがある（バリデーションがある場合は必須）
- [ ] 削除確認ダイアログが開閉できる
- [ ] `<html>` 直後に `@feature` / `@entity` / `@api` コメントが付与されている
- [ ] 全フォームフィールドに `data-*` 属性が付与されている
- [ ] `data-testid` の命名が `{feature}-{element}` の kebab-case になっている
- [ ] `.field-hint` でバリデーション制約の視覚的説明が付与されている
- [ ] ダミーデータが日本語で機能に合った現実的な内容になっている
- [ ] CSS 変数の実値が `design-system.md` のトークンテーブルから正確に読み取られている
- [ ] 単一 HTML ファイルで外部依存なく動作する（Google Fonts 除く）

### Step 6: 出力と案内

`specs/{feature}/ui-mockup.html` に書き出し、以下を案内する:

```
UI モックアップを生成しました。

open specs/{feature}/ui-mockup.html

確認後、修正や追加が必要であればお知らせください。
問題なければ次のステップ:
  /scaffold-contract
```
