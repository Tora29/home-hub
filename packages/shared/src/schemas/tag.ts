/**
 * @file スキーマ: Tag
 * @module packages/shared/src/schemas/tag.ts
 *
 * @description
 * Tag エンティティの入出力スキーマ定義（FE・BE 共通）。
 *
 * @schemas
 * - tagCreateSchema - 作成用入力
 * - tagSchema       - 出力型
 *
 * @types
 * - TagCreate - 作成用入力型
 * - Tag       - 出力型
 */
import { z } from 'zod';

export const tagCreateSchema = z.object({
  name: z.string().min(1, 'タグ名は必須です').max(50, 'タグ名は50文字以内で入力してください'),
});

export const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string().datetime(),
});

export type TagCreate = z.infer<typeof tagCreateSchema>;
export type Tag = z.infer<typeof tagSchema>;
