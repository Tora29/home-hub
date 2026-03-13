# Schemas

バリデーションスキーマの設計規約。

## バリデーションライブラリ

- **Zod v4** を使用
- `@hono/standard-validator` の `zValidator` でリクエストバリデーションをミドルウェアとして適用

## FE/BE バリデーション役割分担

- **FE**: UX 向上の即時フィードバック（補助）。必須・文字数・形式（URL等）を実施。`packages/shared` のスキーマをそのまま使う
- **BE**: 信頼できる唯一のバリデーション（正）。すべてのリクエストで必ず実施
- **FE でやらないこと**: ユニーク制約（name の重複）・権限チェック → BE のみ

## スキーマ配置規約

| 種別 | 配置場所 | 例 |
|------|---------|-----|
| 入力スキーマ（Create/Update） | `packages/shared/schemas/` | `dish.ts`, `tag.ts` |
| BE 固有スキーマ（レスポンス変換等） | `apps/api/src/features/{feature}/schemas/response.ts` | DBモデル → レスポンス型への変換 |
| FE 固有スキーマ（フォームバリデーション等） | `apps/web/src/routes/{feature}/schemas/` | コロケーション配置 |

- 入力スキーマは可能な限り `packages/shared` に集約する

## 入力 / 出力スキーマの分離方針

- **PUT** を採用（編集フォームは全フィールド送信）
- Create と Update は `packages/shared` で同一スキーマを共通化してよい
- レスポンス型の命名規則: `{Entity}Response`（例: `DishResponse`）
- `nullable`: DBのNULL許可カラムに使用
- `optional`: PUT採用のためほぼ不要

```ts
// packages/shared/schemas/dish.ts の例
export const dishSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  recipeUrl: z.string().url("正しいURLを入力してください").nullable(),
  effort: z.enum(["EASY", "HARD"]),
  category: z.enum(["MAIN", "SIDE"]),
})
export type DishInput = z.infer<typeof dishSchema>
```

## バリデーションメッセージ

- 言語: **日本語**
- フォーマット: `"名前は必須です"` 形式（フィールド名 + 日本語説明）

## 参照するスキル

- scaffold-be, scaffold-fe, scaffold-test-unit
