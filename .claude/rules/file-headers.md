# File Headers

ソースコードから設計書をリバースエンジニアリングするインデックスとして、
各ファイル先頭に構造化されたコメントを付与する規約。

> **注意**: 具体的なファイルパス・ファイル名・コメント記法は採用技術スタックに依存する。
> `specs/infra-spec.md` のディレクトリ構成を参照し、プロジェクトの実態に合わせて記述すること。

scaffold-be / scaffold-fe / scaffold-test-unit / scaffold-test-e2e スキルが
コードを生成する際、**全ファイルにヘッダーコメントを付与すること**。

---

## コメント記法

採用言語に応じて適切なコメント記法を使用する。

| 言語 / フォーマット | 記法 |
| ------------------- | ---- |
| TypeScript / JavaScript | `/** ... */` |
| Python | `""" ... """` または `# ...` |
| Java / Kotlin / Scala | `/** ... */` |
| Go | `/* ... */` または `// ...` |
| HTML テンプレート（Vue, Svelte 等） | `<!-- ... -->` |
| Svelte `<script>` ブロック内 | `/** ... */` |
| Ruby | `# ...` |

テンプレートは TypeScript 記法で例示しているが、**実プロジェクトの言語に合わせて変更すること**。

---

## 共通タグ

| タグ           | 必須 | 説明 |
| -------------- | ---- | ---- |
| `@file`        | ◯    | 種別と名称（例: `画面: タスク一覧`、`API: タスク`） |
| `@module`      | ◯    | `infra-spec.md` で定義されたディレクトリ構成に基づくフルパス |
| `@feature`     | ◯    | 機能名（`specs/` 配下の feature ディレクトリ名、ネストしない）。共通ライブラリ配下では省略可 |
| `@description` | ◯    | 1〜3行の概要説明 |
| `@spec`        | △    | `specs/{feature}/spec.md` への相対パス。共通ライブラリ配下では省略可 |
| `@acceptance`  | △    | 対応する受入条件番号（`AC-001, AC-002`） |

---

## ファイル種別ごとのテンプレート

ファイル種別はフレームワーク固有の名称ではなく**責務（ロール）**で分類する。
`@module` のパスは `infra-spec.md` のディレクトリ構成に合わせて記述すること。

---

### 画面（View / Page コンポーネント）

FE の画面単位コンポーネント。React Page / Vue Page / Svelte Page など。

```
/**
 * @file 画面: {機能名}
 * @module {infra-spec.md に定義された FE ディレクトリ}/{feature}/{ファイル名}
 * @feature {feature}
 *
 * @description
 * {画面の概要説明}
 *
 * @spec specs/{feature}/spec.md
 * @acceptance AC-001, AC-002
 *
 * @navigation
 * - 遷移元: {パス} - {説明}
 * - 遷移先: {パス} - {説明}
 *
 * @api
 * - GET /api/v1/{feature} → 200 {Entity}[] - 一覧取得
 * - POST /api/v1/{feature} → 201 {Entity} - 新規作成
 */
```

---

### データ取得層（Loader / SSR Handler）

画面の初期データをサーバーサイドで取得する層。
SvelteKit の `+page.ts`、Next.js の `getServerSideProps`、Remix の `loader` など。
フレームワークにこの概念がない場合は省略する。

```
/**
 * @file データ取得: {機能名}
 * @module {infra-spec.md に定義された FE ディレクトリ}/{feature}/{ファイル名}
 * @feature {feature}
 *
 * @description
 * {機能}画面の初期データをサーバーサイドで取得する。
 *
 * @spec specs/{feature}/spec.md
 * @acceptance AC-001
 */
```

---

### API ルート（Controller / Handler）

HTTP リクエストを受け取るエンドポイント定義。
Express Router / Hono / FastAPI / Spring Controller など。

```
/**
 * @file API: {機能名}
 * @module {infra-spec.md に定義された BE ディレクトリ}/{feature}/{ファイル名}
 * @feature {feature}
 *
 * @description
 * {API の概要説明}
 *
 * @spec specs/{feature}/spec.md
 * @acceptance AC-001, AC-002
 *
 * @endpoints
 * - GET /api/v1/{feature} → 200 {Entity}[] - 一覧取得
 * - POST /api/v1/{feature} → 201 {Entity} - 新規作成
 *   @body {entity}CreateSchema
 *   @errors 400(VALIDATION_ERROR)
 *
 * @service {サービス層ファイルへの相対パス}
 * @schema {スキーマファイルへの相対パス}
 */
```

#### `@endpoints` 拡張記法

```
- {METHOD} {path} → {status} {ResponseType} - {説明}
  @body {schemaName}
  @query {param}:{type}={default}(enum1|enum2) ...
  @errors {status}({ErrorCode}) ...
```

---

### サービス層（Service / Use Case）

ビジネスロジックと DB 操作を担う層。

```
/**
 * @file サービス: {Entity}
 * @module {infra-spec.md に定義された BE ディレクトリ}/{feature}/{ファイル名}
 * @feature {feature}
 *
 * @description
 * {サービスの概要説明}
 *
 * @spec specs/{feature}/spec.md
 * @acceptance AC-001, AC-002
 *
 * @entity {Entity}
 *
 * @functions
 * - getEntities    - 一覧取得
 * - getEntityById  - ID 指定取得
 * - createEntity   - 新規作成
 * - updateEntity   - 更新
 * - deleteEntity   - 削除
 *
 * @test {テストファイルへの相対パス}
 */
```

---

### スキーマ / バリデーション定義（Schema / Validation）

リクエスト・レスポンスの型定義とバリデーションスキーマ。
Zod / Yup / Joi / Pydantic / Bean Validation など。

```
/**
 * @file スキーマ: {Entity}
 * @module {infra-spec.md に定義された BE/FE ディレクトリ}/{feature}/{ファイル名}
 * @feature {feature}
 *
 * @description
 * {スキーマの概要説明}
 *
 * @spec specs/{feature}/spec.md - Schema セクション
 *
 * @schemas
 * - {entity}CreateSchema - 作成用入力
 * - {entity}UpdateSchema - 更新用入力
 * - {entity}Schema       - 出力型
 *
 * @types
 * - {Entity}Create - 作成用入力型
 * - {Entity}Update - 更新用入力型
 * - {Entity}       - 出力型
 */
```

---

### UI コンポーネント（Component）

ページ固有または共有の UI 部品。
React Component / Vue Component / Svelte Component など。

```
/**
 * @file コンポーネント: {ComponentName}
 * @module {infra-spec.md に定義された FE ディレクトリ}/{feature または shared}/{ファイル名}
 * @feature {feature}  ← 共有コンポーネントの場合は省略
 *
 * @description
 * {コンポーネントの概要説明}
 *
 * @props
 * - {propName}: {型} - {説明}
 * - onCreate: (item: {Entity}) => void - 作成完了時のコールバック
 */
```

---

### 共通ユーティリティ / ヘルパー（Utility / Helper）

複数機能から横断的に利用される汎用モジュール。
feature に紐づかないため `@feature`・`@spec` は省略可。

```
/**
 * @file ヘルパー: {名称}
 * @module {infra-spec.md に定義された共通ライブラリパス}/{ファイル名}
 *
 * @description
 * {概要説明}
 */
```

---

### ユニットテスト / API テスト（Unit / API Test）

```
/**
 * @file テスト: {対象}
 * @module {テスト対象ファイルと同ディレクトリ or infra-spec.md 定義のテストディレクトリ}
 * @testType unit | api
 *
 * @target {テスト対象ファイルへの相対パス}
 * @spec specs/{feature}/spec.md
 * @covers AC-001, AC-002, AC-101, AC-102
 */
```

---

### E2E テスト（E2E Test）

```
/**
 * @file E2Eテスト: {シナリオ名}
 * @module {infra-spec.md に定義された E2E ディレクトリ}/{feature}.spec.{拡張子}
 * @testType e2e
 *
 * @spec specs/{feature}/spec.md
 * @covers AC-001, AC-002
 *
 * @scenarios
 * - {シナリオ1の説明}
 * - {シナリオ2の説明}
 *
 * @pages
 * - /{feature} - {画面名}
 */
```

---

## 受入条件の採番ルール

| 分類                | 番号範囲    | 説明 |
| ------------------- | ----------- | ---- |
| 正常系              | AC-001〜099 | 正常動作ケース |
| 異常系              | AC-101〜199 | エラー・例外ケース |
| 境界値/エッジケース | AC-201〜299 | 境界値・エッジケース |

上限を超える場合は 4 桁に拡張（`AC-0001〜`）。頻繁に超える場合は機能分割を検討。

---

## なぜ必要か

- 生成コードから設計書（spec.md / openapi.yaml）へのトレーサビリティを確保する
- `@acceptance` タグで AC と実装ファイルを直接紐付け、spec-coverage スキルの解析精度を高める
- コードレビュー時に設計意図・仕様参照先を即座に把握できるようにする

## 参照するスキル

- scaffold-be, scaffold-fe, scaffold-test-unit, scaffold-test-e2e, review-changes, spec-coverage
