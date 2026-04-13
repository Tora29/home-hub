# Feature: Login

## Overview

ログイン画面。メールアドレスとパスワードで認証し、成功後にルートページ（`/`）へ遷移する。
認証は Better Auth の `emailAndPassword` モードを使用する。新規登録は対象外（シングルユーザー前提）。
カスタム API は不要（Better Auth が `/api/auth/*` を自動管理）。

## Schema Definition（サマリ）

エンティティの概要と主要フィールド。

| エンティティ | 概要         | 主要フィールド  | 備考               |
| ------------ | ------------ | --------------- | ------------------ |
| LoginRequest | ログイン入力 | email, password | Better Auth に委譲 |

Zod スキーマの詳細は `src/routes/login/schema.ts` を参照。

## Database Constraints（サマリ）

ログイン機能は DB への直接書き込みなし（Better Auth が管理）。

## data-testid

| testid                  | 要素種別   | 説明                           |
| ----------------------- | ---------- | ------------------------------ |
| `login-form`            | `<form>`   | ログインフォーム全体           |
| `login-email-input`     | `<input>`  | メールアドレス入力フィールド   |
| `login-password-input`  | `<input>`  | パスワード入力フィールド       |
| `login-password-toggle` | `<button>` | パスワード表示切替ボタン       |
| `login-submit-button`   | `<button>` | ログインボタン                 |
| `login-email-error`     | `<p>`      | メールアドレスフィールドエラー |
| `login-password-error`  | `<p>`      | パスワードフィールドエラー     |
| `login-auth-error`      | `<p>`      | 認証失敗エラー（フォーム全体） |

## Error Responses（サマリ）

| 操作     | エラーコード | 条件               | 備考                               |
| -------- | ------------ | ------------------ | ---------------------------------- |
| ログイン | -            | Better Auth が処理 | クライアントにエラー詳細は返さない |

## Query Parameters（サマリ）

該当なし。

## API Endpoints

該当なし（Better Auth が `/api/auth/sign-in/email` を内部管理）。

## Acceptance Criteria

### 正常系

- AC-001: メールアドレスとパスワードを入力してログインボタンを押すと、認証成功後 `/` へ遷移する
- AC-002: パスワード表示切替アイコンをクリックすると、パスワードの表示/非表示が切り替わる
- AC-003: 未認証で `/` にアクセスすると `/login` へリダイレクトされる

### 異常系

- AC-101: メールアドレスが空の場合、「メールアドレスは必須です」エラーが表示される
- AC-102: メールアドレスの形式が不正な場合、「正しいメールアドレスを入力してください」エラーが表示される
- AC-103: パスワードが空の場合、「パスワードは必須です」エラーが表示される
- AC-104: 認証に失敗した場合（メールアドレスまたはパスワードが間違い）、「メールアドレスまたはパスワードが正しくありません」エラーが表示される

### 境界値

- AC-201: メールアドレスが254文字（RFC 5321 上限）の場合、バリデーションを通過する
- AC-202: パスワードが8文字（下限）の場合、バリデーションを通過する
- AC-203: パスワードが128文字（上限）の場合、バリデーションを通過する

## UI Requirements

### 画面構成

- **ページ全体**: 画面中央にカード型のログインフォームを配置（`min-h-screen` で縦中央揃え）
- **カード**: ロゴ／アプリ名、フォーム（メール入力・パスワード入力・ログインボタン）を含む
- **メール入力フィールド**: ラベル「メールアドレス」、`type="email"`、プレースホルダーなし
- **パスワード入力フィールド**: ラベル「パスワード」、`type="password"` / `type="text"`（切替）、右端に目のアイコン
- **パスワード表示切替アイコン**: `Eye`（非表示時）/ `EyeOff`（表示時）from `@lucide/svelte`
- **ログインボタン**: 「ログイン」テキスト、フォーム幅いっぱい（`w-full`）

### コンポーネント階層

```
LoginPage（/login）
└── LoginCard
    ├── AppLogo
    ├── LoginForm (login-form)
    │   ├── EmailField
    │   │   ├── Label
    │   │   ├── EmailInput (login-email-input)
    │   │   └── EmailError (login-email-error)
    │   ├── PasswordField
    │   │   ├── Label
    │   │   ├── PasswordInput (login-password-input)
    │   │   ├── PasswordToggle (login-password-toggle)
    │   │   └── PasswordError (login-password-error)
    │   ├── AuthError (login-auth-error) ※認証失敗時
    │   └── SubmitButton (login-submit-button)
    └── （フッター省略）
```

### レイアウト・スペーシング

| 要素         | 配置     | 幅・高さ     | 余白  | 備考                             |
| ------------ | -------- | ------------ | ----- | -------------------------------- |
| LoginPage    | 垂直中央 | min-h-screen | -     | flex items-center justify-center |
| LoginCard    | 中央     | max-w-sm     | p-8   | rounded-2xl shadow-md            |
| LoginForm    | 縦並び   | w-full       | gap-4 |                                  |
| SubmitButton | 横幅全体 | w-full       | mt-2  |                                  |

### 状態ごとの表示ルール

| 要素           | 条件                        | 表示                 | 備考             |
| -------------- | --------------------------- | -------------------- | ---------------- |
| EmailError     | email バリデーション失敗    | 表示                 | text-destructive |
| PasswordError  | password バリデーション失敗 | 表示                 | text-destructive |
| AuthError      | 認証失敗（AC-104）          | 表示                 | role="alert"     |
| AuthError      | 認証前・成功                | 非表示（DOM除去）    |                  |
| PasswordInput  | showPassword=false          | type="password"      |                  |
| PasswordInput  | showPassword=true           | type="text"          |                  |
| PasswordToggle | showPassword=false          | Eye アイコン         |                  |
| PasswordToggle | showPassword=true           | EyeOff アイコン      |                  |
| SubmitButton   | 送信中                      | disabled + aria-busy | aria-busy="true" |

### アニメーション・トランジション

なし（シンプルなログインフォーム。アニメーション過多を避ける方針）

### レスポンシブ挙動

| ブレークポイント     | レイアウト変更 | 備考                       |
| -------------------- | -------------- | -------------------------- |
| デフォルト（<768px） | 変更なし       | カード幅は max-w-sm で制御 |
| md（≥768px）         | 変更なし       |                            |

### インタラクション

- **ログインボタンクリック**:
  1. クライアントサイドで `loginSchema` によるバリデーションを実行
  2. バリデーション失敗時: 各フィールドのエラーメッセージを表示し、処理を中止
  3. バリデーション成功時: Better Auth の `signIn.email()` を呼び出す
  4. 認証成功: `goto('/')` でルートページへ遷移
  5. 認証失敗: フォーム全体エラー「メールアドレスまたはパスワードが正しくありません」を表示
- **パスワード表示切替アイコンクリック**: パスワードフィールドの `type` を `password` ↔ `text` で切り替える

### バリデーション表示

- 各フィールドの下にエラーメッセージを表示する（インラインバリデーション）
- ログインボタンクリック時にバリデーションを実行する（入力中はリアルタイム検証しない）
- フォーム全体エラー（AC-104）はフォーム上部に表示する

### エラーメッセージの表示ルール

| タイミング                   | 表示箇所       | スタイル                 | 消える条件 |
| ---------------------------- | -------------- | ------------------------ | ---------- |
| ボタンクリック時（FE検証）   | フィールド直下 | text-destructive text-sm | 再送信時   |
| ボタンクリック時（認証失敗） | フォーム上部   | role="alert"             | 再送信時   |

## テスト戦略

| AC          | 種別 | 対象ファイル          | 備考                                                                     | spec_hash |
| ----------- | ---- | --------------------- | ------------------------------------------------------------------------ | --------- |
| AC-001      | Unit | `page.svelte.test.ts` | 認証成功後の `/` 遷移を検証                                              | da9785cc  |
| AC-001      | E2E  | `e2e/login.e2e.ts`    | 実 Better Auth を通じたログインフローを検証                              | 78fe0af7  |
| AC-002      | Unit | `page.svelte.test.ts` | パスワード表示切替の `type` 属性変化を検証                               | c08d3c32  |
| AC-002      | E2E  | `e2e/login.e2e.ts`    | ブラウザ上でのアイコン切替動作を検証                                     | 2e593d48  |
| AC-003      | E2E  | `e2e/login.e2e.ts`    | 未認証アクセス時の `/login` リダイレクトを検証（hooks.server.ts の動作） | e12d3ee2  |
| AC-101〜103 | Unit | `schema.test.ts`      | Zod バリデーション検証                                                   | f15abba7  |
| AC-101〜103 | E2E  | `e2e/login.e2e.ts`    | ブラウザ上でのエラーメッセージ表示を検証                                 | 5f663b17  |
| AC-104      | Unit | `page.svelte.test.ts` | 認証失敗時のフォーム全体エラー表示を検証                                 | 747f6263  |
| AC-104      | E2E  | `e2e/login.e2e.ts`    | 実 Better Auth に対する認証失敗を検証                                    | 5a1987d0  |
| AC-201〜203 | Unit | `schema.test.ts`      | Zod 境界値検証                                                           | 35b8f21a  |

## Non-Functional Requirements

### Performance

- ログインページは公開パス（`/login`）のため、`hooks.server.ts` の認証チェックをスキップする
- Better Auth の `signIn.email()` は非同期。送信中はボタンをローディング状態にする

### Security

- パスワードはフォームの `type="password"` で入力を受け付け、Better Auth に委譲する
- クライアントサイドのバリデーションは UX 補助のみ。認証の信頼は Better Auth に置く
- `{@html}` は使用しない
- ログインページ（`/login`）は `hooks.server.ts` の `PUBLIC_PATHS` に含まれていること

### Accessibility

- フォーム要素に `<label>` を明示的に紐付ける（`for` 属性）
- パスワード表示切替ボタンに `aria-label="パスワードを表示する"` / `aria-label="パスワードを隠す"` を動的に付与する
- ログインボタンに `aria-busy` を付与してローディング状態を伝える
- キーボードフォーカス可能な要素には `focus-visible:ring` を付与する
