---
name: prototype
description: spec.md から単一 HTML ファイルのプロトタイプを生成する。
---

# Prototype Generator

spec.md を主入力として、ビルドツール不要の単一 HTML プロトタイプを生成するスキル。
ブラウザで直接開いてデモが可能。

## 前提条件

- `specs/{feature}/spec.md` が存在すること

## 起動時の挙動

スキル起動後、AskUserQuestion ツールを使って対象 feature を確認する。

```
question: "どの feature のプロトタイプを生成しますか？"
options:
  - specs/ 配下の feature ディレクトリを動的にリスト
```

## ワークフロー

```
入力読み込み → モックデータ準備 → HTML 生成 → チェックリスト検証
```

### Step 1: 入力読み込み

以下のファイルを Read ツールで読み込む:

1. `specs/{feature}/spec.md` — UI Requirements, Schema, AC
2. `specs/{feature}/openapi.yaml` — API レスポンスのモックデータ参照（存在する場合のみ）
3. `.claude/references/ui-patterns.md` — スタイリング方針（定義されている場合）
4. `.claude/rules/data-testid.md` — テスト用セレクタ命名規則（定義されている場合）

### Step 2: モックデータ準備

spec.md の Schema セクションと openapi.yaml（存在する場合）から、モックデータを設計する:

- Entity スキーマに基づくサンプルデータ（3〜5件）
- CRUD 操作のレスポンスモック
- バリデーションエラー時のモックレスポンス

### Step 3: HTML 生成

単一の `index.html` ファイルを生成する:

#### 構成

- **inline CSS**: `<style>` タグ内にスタイルを記述（外部依存なし）
- **inline JS**: `<script>` タグ内にロジックを記述（外部依存なし）
- **モックデータ**: JS 配列/オブジェクトとして埋め込み

#### 再現する要素

- spec.md の UI Requirements の画面構成
- 主要なインタラクション（フォーム送信、CRUD 操作等）
- バリデーション表示
- data-testid 属性（data-testid rule が定義されている場合）

### Step 4: チェックリスト検証

- [ ] ファイルを直接ブラウザで開いて動作する（サーバー不要）
- [ ] spec.md の UI Requirements の画面構成を再現している
- [ ] 主要なインタラクション（CRUD 操作等）がモックで動作する
- [ ] レスポンシブ対応（基本的なメディアクエリ）

## 生成原則

### 外部依存ゼロ

CDN リンクも使わない。HTML + inline CSS + inline JS のみ。ブラウザだけで動作する。

### モックファースト

API 呼び出しは JS 配列でモック。実際の API 接続は不要。
CRUD 操作はメモリ上の配列を操作し、画面に即時反映する。

### 見た目より動作

デモで「動く」ことが最優先。デザインの完成度は二の次。
最低限の見た目（余白、フォント、色）は確保するが、凝ったデザインは不要。

### data-testid 維持

data-testid rule が定義されている場合、セレクタを付与する。
scaffold-fe → E2E テストへの移行時にセレクタを流用可能。

## 出力先

```
prototypes/{feature}/index.html
```
