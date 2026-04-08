---
name: scaffold-ui-mockup
description: >
  spec.md を読んで、このプロジェクトのデザインシステム（テラコッタ・ベージュ系のほっこりトーン）に沿った
  インタラクティブな HTML UI モックアップを生成するスキル。scaffold-fe の「実装前プレビュー版」。
  ユーザーが「UI イメージを見たい」「画面をモックアップしたい」「どんな見た目になるか確認したい」
  「実装前にデザインを確認したい」と言ったときや、spec.md の内容を視覚化したいときに必ず使う。
  spec.md を引数に取り、specs/{feature}/ui-mockup.html を出力する。
---

# scaffold-ui-mockup

`specs/{feature}/spec.md` を主入力として、HTML UI モックアップを生成するスキル。  
**scaffold-fe の実装前プレビュー版**。Svelte コードは生成せず、単一の自己完結した HTML ファイルを出力する。

スキルフロー上の位置づけ:

```
/spec-generator → [/scaffold-ui-mockup] → /scaffold-contract → /scaffold-fe ...
```

## 前提条件

- `specs/{feature}/spec.md` が存在すること
- `specs/{feature}/openapi.yaml` が存在すること（フィールド型参照用）

worktree・scaffold-contract の実行は不要。

## 起動時の挙動

引数（spec.md のパス）がない場合、`specs/` 配下の feature ディレクトリをリストして確認する。

## ワークフロー

```
入力読み込み → design-system 参照 → 画面・状態の列挙 → HTML 生成 → チェックリスト検証
```

### Step 1: 入力読み込み

以下のファイルを Read ツールで読み込む:

1. `specs/{feature}/spec.md` — 画面仕様、UI Requirements、AC（受入条件）、data-testid 一覧
2. `specs/{feature}/openapi.yaml` — フィールド名・型・バリデーション制約の参照

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

spec.md の `## UI Requirements` と `## Acceptance Criteria` から、  
モックアップに含める「ページ × 状態」を洗い出してタブ一覧を決定する。

**必ず含めるタブの判断基準:**

| 条件                                         | 追加するタブ                                 |
| -------------------------------------------- | -------------------------------------------- |
| 一覧画面がある                               | データあり状態                               |
| AC-20x に空状態がある                        | 空状態タブ                                   |
| AC-20x に検索0件がある                       | 検索0件タブ                                  |
| AC-10x にフォームバリデーションがある        | フォームエラー状態タブ                       |
| マスタ管理画面がある（スーパー・カテゴリ等） | インライン編集モード込みのタブ               |
| 削除確認ダイアログがある                     | ダイアログが開いた状態（同一タブ or 別タブ） |

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

#### データ表現

- **ダミーデータ**: 現実的で日本語のものを 3〜5 件入れる。機能に合った自然な例を使う
- **バリデーションエラー**: エラーフィールドに `border-color: var(--destructive)` + エラーメッセージ表示。AC の文言を正確に使う
- **空状態**: アイコン + 説明文をページ中央に配置
- **ページネーション**: spec にある場合はダミーで表示

#### インタラクション（JS）

実際のデータ送信は行わない。以下を JS で実装する:

| インタラクション   | 実装                                                               |
| ------------------ | ------------------------------------------------------------------ |
| ページ切り替え     | `showPage(name)`                                                   |
| モーダル開閉       | `openModal(id)` / `closeModal(id)` + オーバーレイクリック + Escape |
| インライン編集切替 | 表示要素 ↔ 編集用 input の表示切り替え                             |

#### CSS の制約

- Tailwind クラスは使わない。`var(--accent)` 等の CSS 変数で書く
- hex カラーを直書きしない（`design-system.md` が Single Source of Truth なので、CSS 変数経由で間接参照する）

### Step 5: チェックリスト検証

- [ ] spec.md の UI Requirements に記載された全画面（URL）が少なくとも 1 タブに対応している
- [ ] 空状態タブがある（AC に空状態がある場合は必須）
- [ ] バリデーションエラー状態タブがある（AC-101〜199 系がある場合は必須）
- [ ] インライン編集モードがある（マスタ管理画面がある場合は必須）
- [ ] 削除確認ダイアログが開閉できる
- [ ] AC のバリデーションメッセージが spec の文言と一致している
- [ ] 主要要素に `data-testid` 属性が付与されており、spec の testid 一覧と一致している
- [ ] ダミーデータが日本語で機能に合った現実的な内容になっている
- [ ] CSS 変数の実値が `design-system.md` のトークンテーブルから正確に読み取られている
- [ ] 単一 HTML ファイルで外部依存なく動作する（Google Fonts 除く）

### Step 6: 出力と案内

`specs/{feature}/ui-mockup.html` に書き出し、以下を案内する:

```
UI モックアップを生成しました。

open specs/{feature}/ui-mockup.html

確認後、spec の修正や追加が必要であればお知らせください。
問題なければ次のステップ:
  /scaffold-contract
```
