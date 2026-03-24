# Feature: Recipes（レシピ管理）

## Overview

ネット上のレシピを整形してシステムに集約する個人向けレシピ管理機能。
一覧・詳細閲覧・登録・更新・削除に加え、Cloudflare Workers AI を使った自然言語による献立相談を提供する。

## User Stories

- ユーザーとして、登録済みレシピの一覧をカード形式で確認したい。広告なしで自分のレシピにアクセスするため。
- ユーザーとして、レシピの材料・手順・評価・難易度を登録・更新したい。調理実績を記録するため。
- ユーザーとして、サイトのテキストを丸ごとコピペするだけで AI がレシピ情報を抽出してフォームに入力してほしい。手動入力の手間を省くため。
- ユーザーとして、一覧をソートして目的のレシピを探したい。ローテーションや定番探しに使うため。
- ユーザーとして、「最近作ってないもので肉系が食べたいんだけど」のような自然言語で献立を相談したい。今日何を作るか迷ったときに使うため。

## API Endpoints

API 詳細は [openapi.yaml](./openapi.yaml) を参照。

> 型定義・スキーマ・ステータスコード・エラーレスポンスは openapi.yaml が Single Source of Truth。

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/recipes` | 一覧取得（SSR load 兼用） |
| POST | `/recipes` | 登録 |
| PUT | `/recipes/[id]` | 更新 |
| DELETE | `/recipes/[id]` | 削除 |
| POST | `/recipes/ask` | AI 献立相談 |
| POST | `/recipes/extract` | AI レシピ抽出（テキスト → 構造化データ） |

## Acceptance Criteria

### 正常系

- AC-001: `/recipes` にアクセスすると、登録済みのレシピカードが作成日時の新しい順（デフォルト）で表示される
- AC-002: 登録フォームで name を入力して送信すると 201 が返り、一覧にレシピが追加される
- AC-003: レシピカードをクリックすると `/recipes/[id]` に遷移し、材料・手順・メモ等の詳細が表示される
- AC-004: 詳細画面の編集ボタンから内容を変更して送信すると 200 が返り、変更が反映される
- AC-005: 詳細画面の削除ボタンをクリックし確認ダイアログで確定すると 204 が返り、一覧からレシピが消える
- AC-006: AI 相談欄に質問を入力して送信すると、登録済みレシピを参照した回答が表示される
- AC-007: 材料・手順の「追加」ボタンで入力行が増え、「削除」ボタンで行を除去できる
- AC-011: テキストエリアにレシピテキストを貼り付けて「AI で解析」ボタンを押すと、name・ingredients・steps・servings・cookingTimeMinutes が抽出されてフォームに自動入力される
- AC-012: ノイズを含む（ナビゲーション・広告文言等）テキストを貼り付けた場合でも、レシピ情報のみが抽出される
- AC-013: AI 解析タブで sourceUrl を入力して「AI で解析」を実行すると、手動入力タブの sourceUrl フィールドに値が引き継がれる
- AC-008: ソートを「しばらく作ってない順」に切り替えると `lastCookedAt` の古い順（NULL が先頭）で並び替わる
- AC-009: ソートを「よく作る順」に切り替えると `cookedCount` の多い順で並び替わる
- AC-010: ソートを「評価が高い順」に切り替えると `excellent → good → average → poor → 未設定` の順で並び替わる

### 異常系

- AC-101: name が空の場合、400 VALIDATION_ERROR「レシピ名は必須です」が返る
- AC-102: name が 101 文字以上の場合、400 VALIDATION_ERROR「100 文字以内で入力してください」が返る
- AC-103: description が 501 文字以上の場合、400 VALIDATION_ERROR「500 文字以内で入力してください」が返る
- AC-104: memo が 1001 文字以上の場合、400 VALIDATION_ERROR「1000 文字以内で入力してください」が返る
- AC-105: rating に `excellent/good/average/poor` 以外の値を指定した場合、400 VALIDATION_ERROR が返る
- AC-106: difficulty に `easy/medium/hard` 以外の値を指定した場合、400 VALIDATION_ERROR が返る
- AC-107: 存在しない ID に対して GET/PUT/DELETE した場合、404 NOT_FOUND が返る
- AC-108: servings に 1 未満の値を指定した場合、400 VALIDATION_ERROR「1 以上の値を入力してください」が返る
- AC-109: cookingTimeMinutes に 1 未満の値を指定した場合、400 VALIDATION_ERROR「1 以上の値を入力してください」が返る
- AC-110: cookedCount に負の値を指定した場合、400 VALIDATION_ERROR「0 以上の値を入力してください」が返る
- AC-111: AI 相談で question が空の場合、400 VALIDATION_ERROR が返る
- AC-112: AI 相談で question が 501 文字以上の場合、400 VALIDATION_ERROR が返る
- AC-113: sort に定義外の値を指定した場合、400 VALIDATION_ERROR が返る
- AC-114: AI 抽出で text が空の場合、400 VALIDATION_ERROR が返る

### 境界値

- AC-201: name が 100 文字の場合、登録できる
- AC-202: description が 500 文字の場合、登録できる
- AC-203: memo が 1000 文字の場合、登録できる
- AC-204: レシピが 0 件の場合、空状態メッセージが表示される
- AC-205: servings が 1 の場合、登録できる
- AC-206: cookedCount が 0 の場合、詳細・一覧画面に「0 回」と表示される

## UI Requirements

### 一覧画面（`/recipes`）

#### 画面構成

- **レシピ一覧**: `RecipeCard` のレスポンシブグリッド（モバイル 1 列 / タブレット 2 列 / デスクトップ 3 列）
- **RecipeCard**: 画像（imageUrl がない場合はプレースホルダー）・レシピ名・難易度バッジ・評価バッジ・作った回数・最終調理日
- **ソートセレクト**: 一覧右上（登録ボタンの左隣）。4 択 select
  - 登録順（デフォルト）: `createdAt_desc`
  - しばらく作ってない順: `lastCookedAt_asc`（NULL 先頭）
  - よく作る順: `cookedCount_desc`
  - 評価が高い順: `rating_desc`（excellent=4, good=3, average=2, poor=1, NULL 末尾）
- **登録ボタン**: 右上。クリックで登録フォームダイアログを開く
- **AI 相談ウィジェット**: 一覧グリッドの下部にインライン配置。質問を送信すると回答を表示
- **空状態**: レシピが 0 件のとき `recipes-empty` を表示

#### インタラクション

- カードクリック → `/recipes/[id]` に遷移
- ソート変更 → `?sort={value}` のクエリパラメータを URL に反映し、`GET /recipes?sort=` を再取得
- 登録ボタンクリック → 登録フォームをダイアログで表示
- AI 相談送信 → `POST /recipes/ask` を fetch し、回答をインライン表示

### 詳細画面（`/recipes/[id]`）

#### 画面構成

- ヒーロー画像（imageUrl がない場合は省略）
- レシピ名、概要
- バッジ: 難易度・評価・何人前・調理時間
- 材料リスト（name + amount）
- 手順リスト（番号付き）
- メモ
- 参照元 URL リンク（sourceUrl が設定されている場合）
- 作った回数・最終調理日
- 編集ボタン・削除ボタン

#### インタラクション

- 編集ボタンクリック → 編集フォームをダイアログで表示
- 削除ボタンクリック → `recipes-delete-dialog` を表示し確定で `DELETE /recipes/[id]` を呼ぶ
- 削除完了 → `/recipes` にリダイレクト

### 登録・編集フォーム（`RecipeForm`）

#### 画面構成（登録時）

登録フォームは **AI 解析タブ** と **手動入力タブ** の 2 タブ構成とする。

**AI 解析タブ（デフォルト）**:
- sourceUrl 入力欄（`recipes-source-url-input`、任意）: コピー元サイトの URL。解析後に手動入力タブへ引き継ぐ
- テキストエリア（`recipes-extract-input`）: サイトから丸ごとコピペするための大きめの入力欄
- 「AI で解析」ボタン（`recipes-extract-button`）: `POST /recipes/extract` を呼び出し、結果を手動入力タブのフォームに反映して手動入力タブへ切り替える
- ローディング表示: 解析中はボタンを無効化しスピナーを表示

**手動入力タブ（AI 解析後の確認・修正にも使用）**:
- name（必須）、description、imageUrl、sourceUrl
- servings（数値）、cookingTimeMinutes（数値）
- difficulty（select: 簡単 / 普通 / 難しい）
- rating（select: 非常に美味しい / 美味しい / 普通 / 微妙）
- **材料**: 「追加」ボタンで `{ name, amount }` 行を動的追加。各行に削除ボタン
- **手順**: 「追加」ボタンでテキスト行を動的追加。各行に削除ボタン
- memo（textarea）
- 送信ボタン・キャンセルボタン

#### 画面構成（編集時）

手動入力タブのみ表示（AI 解析タブは不要）。

#### AI 解析の仕組み

- `POST /recipes/extract` に `{ text }` を送信
- Workers AI（llama-3.1）が以下を JSON で返す:
  ```json
  { "name": "...", "description": "...", "servings": 2, "cookingTimeMinutes": 30,
    "ingredients": [{"name": "...", "amount": "..."}], "steps": ["..."] }
  ```
- 抽出できなかったフィールドは `null`。ユーザーが手動で補完する

#### インタラクション

- 「AI で解析」クリック → ローディング → 解析完了 → 手動入力タブに切り替わりフォームが自動入力される
- ユーザーは内容を確認・修正してから「保存」

#### バリデーション表示

- `recipes-name-error`: name が空またはオーバーの場合に表示

### AI 献立相談

- `POST /recipes/ask` に `{ question }` を送信
- ユーザーの全レシピ（name・ingredients・lastCookedAt・rating・difficulty・cookedCount）をコンテキストにプロンプトへ埋め込む
- `platform.env.AI` 経由で Workers AI（llama-3.1）に問い合わせる
- 回答を `recipes-ask-answer` に表示

## data-testid

| testid | 要素種別 | 説明 |
|--------|---------|------|
| `recipes-sort-select` | `<select>` | ソート選択 |
| `recipes-extract-input` | `<textarea>` | AI 解析用テキスト貼り付け欄 |
| `recipes-extract-button` | `<button>` | AI で解析ボタン |
| `recipes-list` | `<ul>` | レシピカード一覧 |
| `recipes-item` | `<li>` | レシピカード |
| `recipes-create-button` | `<button>` | 登録ボタン |
| `recipes-empty` | `<p>` | 0 件時の空状態メッセージ |
| `recipes-form` | `<form>` | 登録・編集フォーム |
| `recipes-name-input` | `<input>` | レシピ名入力 |
| `recipes-description-input` | `<textarea>` | 概要入力 |
| `recipes-image-url-input` | `<input>` | 画像 URL 入力 |
| `recipes-source-url-input` | `<input>` | 参照元 URL 入力 |
| `recipes-servings-input` | `<input>` | 何人前入力 |
| `recipes-cooking-time-input` | `<input>` | 調理時間入力 |
| `recipes-difficulty-select` | `<select>` | 難易度選択 |
| `recipes-rating-select` | `<select>` | 評価選択 |
| `recipes-cooked-count-input` | `<input>` | 作った回数入力 |
| `recipes-last-cooked-input` | `<input>` | 最終調理日入力 |
| `recipes-memo-input` | `<textarea>` | メモ入力 |
| `recipes-ingredient-item` | `<div>` | 材料行 |
| `recipes-ingredient-name-input` | `<input>` | 材料名入力 |
| `recipes-ingredient-amount-input` | `<input>` | 材料量入力 |
| `recipes-ingredient-add-button` | `<button>` | 材料追加ボタン |
| `recipes-ingredient-remove-button` | `<button>` | 材料削除ボタン |
| `recipes-step-item` | `<div>` | 手順行 |
| `recipes-step-input` | `<textarea>` | 手順入力 |
| `recipes-step-add-button` | `<button>` | 手順追加ボタン |
| `recipes-step-remove-button` | `<button>` | 手順削除ボタン |
| `recipes-submit-button` | `<button>` | フォーム送信ボタン |
| `recipes-delete-button` | `<button>` | 削除ボタン |
| `recipes-delete-dialog` | `<dialog>` | 削除確認ダイアログ |
| `recipes-delete-confirm-button` | `<button>` | 削除確認ダイアログの確定ボタン |
| `recipes-name-error` | `<p>` | レシピ名エラーメッセージ |
| `recipes-ask-input` | `<input>` | AI 相談入力欄 |
| `recipes-ask-button` | `<button>` | AI 相談送信ボタン |
| `recipes-ask-answer` | `<div>` | AI 回答表示エリア |

## テスト戦略

| AC | 種別 | 対象ファイル | 備考 |
|----|------|------------|------|
| AC-001 | Integration | `service.integration.test.ts` | 実 D1 で一覧取得を検証 |
| AC-002 | Integration | `service.integration.test.ts` | 実 D1 でレシピ作成を検証 |
| AC-003 | Integration | `service.integration.test.ts` | 実 D1 で ID 指定取得を検証 |
| AC-004 | Integration | `service.integration.test.ts` | 実 D1 でレシピ更新を検証 |
| AC-005 | Integration | `service.integration.test.ts` | 実 D1 でレシピ削除を検証 |
| AC-006 | E2E | `e2e/recipes.e2e.ts` | Workers AI はブラウザ全体が必要 |
| AC-011〜013 | E2E | `e2e/recipes.e2e.ts` | Workers AI 抽出はブラウザ全体が必要 |
| AC-007 | Unit | `RecipeForm.svelte.test.ts` | 動的フォーム行の追加・削除検証 |
| AC-008〜010 | Integration | `service.integration.test.ts` | 各ソート順を実 D1 で検証 |
| AC-101〜113 | Unit | `schema.test.ts` | Zod バリデーション検証 |
| AC-201〜203 | Unit | `schema.test.ts` | Zod 境界値検証 |
| AC-204 | E2E | `e2e/recipes.e2e.ts` | 空状態はブラウザ全体が必要 |
| AC-205〜206 | Unit | `schema.test.ts` | Zod 境界値検証 |

## Non-Functional Requirements

### Performance

- 一覧取得はデフォルト 20 件。`limit` 最大 100 件
- Workers AI への問い合わせはレシピ 100 件以内を想定。Vector DB 不要

### Security

- `hooks.server.ts` の認証ガードにより全エンドポイント認証済み
- `userId` でオーナーを絞り込み、他ユーザーのレシピは 404 として扱う（存在を露出しない）
- `{@html}` 不使用。ingredients / steps の JSON は Zod で型検証済み

### Accessibility

- RecipeCard に `<article>` を使用し、レシピ名を `<h2>` でマークアップする
- 削除確認ダイアログに `role="alertdialog"` を付与する
- フォームの各入力要素に `<label>` を関連付ける
