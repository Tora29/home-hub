# Feature: 認証 (auth)

## Overview

夫婦2ユーザー固定の認証機能。Better Auth（Hono ミドルウェア + Prisma アダプター）で管理する。
新規登録画面はなく、DBシードで2ユーザーを初期登録する。未認証時は `/login` にリダイレクトする。

## User Stories

- 夫または妻として、メールアドレスとパスワードでログインしたい。アプリを使用するため。
- ログイン済みユーザーとして、ログアウトしたい。セッションを終了するため。

## Schema

### ログイン入力スキーマ

> `packages/shared/src/schemas/auth.ts` の `loginSchema` を参照。

| フィールド | 型 | バリデーション |
|-----------|-----|---------------|
| email | string | 必須、email 形式 |
| password | string | 必須 |

### ユーザー（Better Auth 管理）

Better Auth の Prisma アダプターが自動管理。独自スキーマ定義不要。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string (cuid) | Better Auth が採番 |
| name | string | 表示名（「夫」「妻」） |
| email | string | ログイン用メールアドレス |

## API Endpoints

Better Auth の組み込みエンドポイントを使用。FE は Better Auth クライアント SDK 経由で呼び出す。

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/sign-in/email | メールアドレス・パスワードでログイン |
| POST | /api/auth/sign-out | ログアウト（セッション削除） |
| GET | /api/auth/get-session | セッション情報取得 |

> 詳細は [Better Auth 公式ドキュメント](https://better-auth.com) を参照。

## Acceptance Criteria

### 正常系

- AC-001: 登録済みのメールアドレスと正しいパスワードを入力してログインボタンをタップすると、`/` にリダイレクトされる
- AC-002: ログアウトボタンをタップすると `/login` にリダイレクトされ、セッション Cookie が無効化される
- AC-003: 未認証状態で `/login` 以外のパスにアクセスすると `/login` にリダイレクトされる
- AC-004: ログイン済みの状態で `/login` にアクセスすると `/` にリダイレクトされる
- AC-005: ログイン済みの状態で `GET /api/auth/session` を呼び出すと、ユーザー情報（id, name, email）が返る
- AC-006: ログイン済みユーザーは authMiddleware で保護されたエンドポイントにアクセスできる（401 にならない）

### 異常系

- AC-101: 存在しないメールアドレスでログインしようとすると、「メールアドレスまたはパスワードが正しくありません」エラーが表示される
- AC-102: 正しいメールアドレスに対して誤ったパスワードでログインしようとすると、「メールアドレスまたはパスワードが正しくありません」エラーが表示される

### 境界値

- AC-201: email フィールドが空のままログインボタンをタップすると、「メールアドレスの形式が正しくありません」エラーが表示される
- AC-202: password フィールドが空のままログインボタンをタップすると、「パスワードは必須です」エラーが表示される

## UI Requirements

### 画面構成（/login）

- メールアドレス入力フィールド
- パスワード入力フィールド
- ログインボタン
- エラーメッセージ表示エリア（フォーム上部）

### インタラクション

- ログインボタンタップ: バリデーション実行 → API 呼び出し → リダイレクトまたはエラー表示
- エラー発生時: フォームをクリアせず、エラーメッセージを表示する
- 送信中: ボタンをローディング状態にして二重送信を防ぐ

### バリデーション表示

- email: フォーマットエラー時に「メールアドレスの形式が正しくありません」を表示
- password: 空の場合に「パスワードは必須です」を表示

### UX

- スマホ操作前提。入力フィールドは十分なタップ領域を確保する
- パスワードフィールドは入力内容を非表示にする

## Non-Functional Requirements

### Security

- パスワードは PBKDF2（Web Crypto API）でハッシュ化して保存する
  - Cloudflare Workers の CPU 制限により Better Auth デフォルトの scrypt が使用不可のため、カスタム実装（`apps/api/src/lib/auth.ts`）で対応
- Cookie は `HttpOnly` + `SameSite=Lax` を設定する（Better Auth のデフォルト設定に従う）
- セッション有効期限は **30日**（`session.expiresIn` で設定）

### Performance

- ログイン API のレスポンスは 1000ms 以内

### Accessibility

- 入力フィールドに適切な `label` を設定する
