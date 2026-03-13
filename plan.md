# Plan — 設計決定事項

> 技術スタックの前提（infra-spec.md より）
> - FE: SvelteKit v5 + Tailwind CSS
> - BE: Hono + Cloudflare Workers
> - DB: Cloudflare D1 (Prisma)
> - バリデーション: Zod v4 (`packages/shared`)
> - テスト: Vitest + Playwright
> - 認証: Better Auth (Cookie)

---

## 1. スキーマ設計（→ `.claude/rules/schemas.md` に反映）

### 1-1. FE / BE バリデーション役割分担
- FE: 必須・文字数・形式（URL等）の即時フィードバック。`packages/shared` のスキーマをそのまま使う
- FE でやらないこと: ユニーク制約・権限チェック（BE のみ）
- BE: すべてのリクエストで必ずバリデーション実施（唯一の信頼源）

### 1-2. スキーマ配置規約
- `packages/shared/schemas/` → 入力スキーマ（Create/Update）を可能な限りすべて集約
- `apps/api/.../schemas/response.ts` → DBモデルからレスポンス型への変換など BE 固有のもの
- FE 固有スキーマ → コロケーション（`routes/{feature}/schemas/`）

### 1-3. 入力 / 出力スキーマの分離方針
- **PUT** を採用（編集フォームは全フィールド送信）
- Create と Update は `packages/shared` で同一スキーマを共通化
- レスポンス型の命名規則 → `{Entity}Response`（例: `DishResponse`）
- `nullable`: DBのNULL許可カラムに使用。`optional`: PUT採用のためほぼ不要

### 1-4. バリデーションメッセージ
- 言語: **日本語**
- フォーマット: `"名前は必須です"` 形式（フィールド名 + 日本語説明）

---

## 2. テスト戦略（→ `.claude/rules/testing.md` に反映）

### 2-1. テスト種別と境界
- Unit Test の対象: Service 層 + ユーティリティ。Prisma は `vitest-mock-extended` でモック
- API Test の対象: Hono ルートのリクエスト/レスポンス形式・ステータスコード検証。Service 層はモック
- E2E テスト環境: `wrangler dev --local`（BE: `localhost:8787`）+ `npm run dev`（FE: `localhost:5173`）で起動し Playwright から接続

### 2-2. テスト-仕様連携
- AC 紐付け形式: `test("[AC-001] ...")` 形式
- テストファイル配置: コロケーション（テスト対象と同ディレクトリ）

### 2-3. カバレッジ方針
- 目標: **行・ブランチ・関数すべて 80%**
- CI での強制: しない（参考値として計測のみ）

### 2-4. テストコマンド
| コマンド | 内容 |
|---------|------|
| `npm run test` | Unit + API テスト（Vitest） |
| `npm run test:unit` | Unit テストのみ |
| `npm run test:api` | API テストのみ |
| `npm run test:e2e` | E2E テスト（Playwright） |
| `npm run test:watch` | Watch モード（Unit + API） |

---

## 3. API パターン（→ `.claude/rules/api-patterns.md` に反映）

### 3-1. レスポンス形式
- 一覧: `{ "data": [...], "total": N, "page": N, "limit": N }` でラップ。ページサイズデフォルト **20**
- 単体: ラップなし（リソースを直接返す）
- 作成（201）: 作成後のリソースを返却
- 更新（200）: 更新後のリソースを返却
- 削除（204）: No Content（ボディなし）

### 3-2. エラーレスポンス構造
```json
// 通常エラー
{ "error": { "code": "NOT_FOUND", "message": "料理が見つかりません" } }

// バリデーションエラー
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に誤りがあります",
    "fields": [{ "field": "name", "message": "名前は必須です" }]
  }
}
```

### 3-3. API バージョニング
- URL パス `/api/v1/` を使用

### 3-4. Controller / Handler パターン
- Hono ルートの責務: バリデーション + Service 委譲 + レスポンス成形のみ（薄いコントローラー）
- `@hono/standard-validator` の適用: `zValidator('json', schema)` をミドルウェアとして渡す

### 3-5. FE からの API 呼び出し
- ベースクライアント（`lib/api/`）の共通処理:
  - ベースURL: 環境変数 `PUBLIC_API_URL` から取得
  - `credentials: 'include'`（Cookie送信）
  - `Content-Type: application/json`
  - レスポンスが 4xx/5xx の場合は `AppError` に変換して throw
- Hono 側 CORS: `cors({ origin: process.env.ALLOWED_ORIGIN, credentials: true })`

---

## 4. エラーハンドリング（→ `.claude/rules/error-handling.md` に反映）

### 4-1. エラー分類と HTTP ステータスマッピング
| エラーコード | HTTP | 用途 |
|------------|------|------|
| `VALIDATION_ERROR` | 400 | 入力バリデーション失敗 |
| `UNAUTHORIZED` | 401 | 未認証 |
| `FORBIDDEN` | 403 | 権限なし |
| `NOT_FOUND` | 404 | リソース不在 |
| `CONFLICT` | 409 | 重複（name ユニーク違反等） |
| `INTERNAL_ERROR` | 500 | 予期しないエラー |

- 500 エラー: ユーザーには「エラーが発生しました」の汎用メッセージ表示（詳細は非表示）

### 4-2. Service 層のエラー返却方式
- カスタムエラークラス（`AppError`）を throw + Hono の `onError` でグローバルに変換

### 4-3. エラーコード体系（`packages/constants/`）
- 命名規則: `SCREAMING_SNAKE_CASE`
- 一覧: 4-1 のテーブル通り

### 4-4. ロギングルール
- 出す情報: リクエストメソッド・パス・ステータスコード・レスポンスタイム・エラーコード
- 出してはいけない情報: パスワード・セッショントークン・認証ヘッダー・個人情報

### 4-5. FE エラーハンドリング
- 通常の API エラー（4xx）→ **トースト**で表示
- フィールドエラー（`VALIDATION_ERROR` の `fields`）→ フォームフィールド直下に**インライン**表示
- 予期しないエラー（500）→ **エラーページ**に遷移

---

## 5. E2E セレクタ規約（→ `.claude/rules/data-testid.md` に反映）

### 5-1. セレクタ戦略
- 属性名: `data-testid`

### 5-2. 命名規則
- パターン: `{feature}-{element}-{type}`
- 動的要素: `{feature}-item-{id}`（例: `dish-item-42`）
- 編集モード区別: `{feature}-view` / `{feature}-edit-form`

### 5-3. 命名テーブル
| セレクタ | 要素 |
|---------|------|
| `{feature}-list` | 一覧コンテナ |
| `{feature}-item-{id}` | リストアイテム |
| `{feature}-create-button` | 新規作成ボタン |
| `{feature}-edit-button-{id}` | 編集ボタン |
| `{feature}-delete-button-{id}` | 削除ボタン |
| `{feature}-create-form` | 作成フォーム |
| `{feature}-edit-form` | 編集フォーム |
| `{feature}-{field}-input` | 入力フィールド（例: `dish-name-input`） |
| `{feature}-submit-button` | フォーム送信ボタン |
| `{feature}-cancel-button` | キャンセルボタン |

---

## 6. セキュリティ（→ `.claude/rules/security.md` に反映）

### 6-1. 認証・認可
- 認可モデル: ロール不要。2ユーザーとも全リソースに同権限
- セッション有効期限: **30日**

### 6-2. CSRF / XSS 対策
- CSRF 対策: Better Auth に委ねる
- Content-Type 制限: `application/json` のみ受け付ける

### 6-3. CORS 設定
- 開発環境: `http://localhost:5173`
- 本番環境: 環境変数 `ALLOWED_ORIGIN` で管理（Cloudflare Workers の環境変数）

### 6-4. センシティブデータ
- パスワードハッシュ化: Better Auth に委ねる
- シークレット管理: `wrangler secret put` で登録。ローカル開発は `.dev.vars`（`.gitignore` 対象）

### 6-5. サプライチェーンセキュリティ
- `npm audit` を CI で実行
- `dependency-review-action` を GitHub Actions に追加
- パッケージ追加の承認プロセス: 個人アプリのため不要（hook の警告で十分）
