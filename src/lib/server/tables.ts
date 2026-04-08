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
 * - expensePayer                        — 支出支払者テーブル
 * - expense                             — 支出テーブル（payerId 含む）
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
	updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull()
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

export const expensePayer = sqliteTable('ExpensePayer', {
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
	payerId: text('payerId').references(() => expensePayer.id, { onDelete: 'restrict' }),
	approvedAt: integer('approvedAt', { mode: 'timestamp' }),
	finalizedAt: integer('finalizedAt', { mode: 'timestamp' }),
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
