/**
 * @file テーブル定義: Drizzle テーブル定義
 * @module src/lib/server/tables.ts
 *
 * @description
 * Cloudflare D1（SQLite）のテーブル定義。
 * Better Auth テーブルとアプリ固有テーブルを含む。
 *
 * @schemas
 * - user, session, account, verification — Better Auth 管理テーブル
 * - recipe                              — アプリ固有テーブル
 * - expenseCategory                     — 支出カテゴリテーブル
 * - expense                             — 支出テーブル（payerUserId / status 含む）
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ---- Better Auth テーブル ----

export const user = sqliteTable('User', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull(),
	image: text('image'),
	createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
	// 'primary'（主）または 'spouse'（妻）。承認フロー・LINE 通知先決定に使用
	// 段階的 migration: まず nullable で追加 → seed/本番 SQL 投入後に NOT NULL 化
	role: text('role')
});

export const session = sqliteTable('Session', {
	id: text('id').primaryKey(),
	expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
	token: text('token').notNull().unique(),
	createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
	ipAddress: text('ipAddress'),
	userAgent: text('userAgent'),
	userId: text('userId')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' })
});

export const account = sqliteTable('Account', {
	id: text('id').primaryKey(),
	accountId: text('accountId').notNull(),
	providerId: text('providerId').notNull(),
	userId: text('userId')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('accessToken'),
	refreshToken: text('refreshToken'),
	idToken: text('idToken'),
	accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
	refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
	scope: text('scope'),
	password: text('password'),
	createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull()
});

export const verification = sqliteTable('Verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
	createdAt: integer('createdAt', { mode: 'timestamp' }),
	updatedAt: integer('updatedAt', { mode: 'timestamp' })
});

// ---- アプリ固有テーブル ----

export const expenseCategory = sqliteTable('ExpenseCategory', {
	id: text('id').primaryKey(),
	userId: text('userId').notNull(),
	name: text('name').notNull(),
	createdAt: integer('createdAt', { mode: 'timestamp' }).notNull()
});

export const expense = sqliteTable('Expense', {
	id: text('id').primaryKey(),
	userId: text('userId').notNull(),
	amount: integer('amount').notNull(),
	categoryId: text('categoryId')
		.notNull()
		.references(() => expenseCategory.id, { onDelete: 'restrict' }),
	// 支払者ユーザー ID（User テーブルの id を参照）。nullable: migration 中の既存データ対応
	payerUserId: text('payerUserId').references(() => user.id, { onDelete: 'restrict' }),
	// 承認ステータス: 'unapproved' | 'checked' | 'pending' | 'approved'
	status: text('status').notNull().default('unapproved'),
	createdAt: integer('createdAt', { mode: 'timestamp' }).notNull()
});

export const recipe = sqliteTable('Recipe', {
	id: text('id').primaryKey(),
	userId: text('userId').notNull(),
	name: text('name').notNull(),
	description: text('description'),
	imageUrl: text('imageUrl'),
	ingredients: text('ingredients'), // JSON: { name: string; amount?: string }[]
	steps: text('steps'), // JSON: string[]
	sourceUrl: text('sourceUrl'),
	servings: integer('servings'),
	cookingTimeMinutes: integer('cookingTimeMinutes'),
	cookedCount: integer('cookedCount').notNull().default(0),
	lastCookedAt: integer('lastCookedAt', { mode: 'timestamp' }),
	rating: text('rating'), // 'excellent' | 'good' | 'average' | 'poor'
	difficulty: text('difficulty'), // 'easy' | 'medium' | 'hard'
	memo: text('memo'),
	createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull()
});
