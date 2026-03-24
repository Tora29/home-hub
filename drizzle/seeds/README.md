# Seeds（ローカル開発用）

ローカル開発環境にテストデータを投入するためのファイル群。

## 手順

### 1. テストユーザーを作成する

`npm run dev` でサーバーを起動した状態で実行する。

```bash
./drizzle/seeds/seed-user.sh
```

| 項目     | 値               |
| -------- | ---------------- |
| Email    | test@example.com |
| Password | password123      |

### 2. レシピのサンプルデータを投入する

```bash
wrangler d1 execute home-hub --local --file=drizzle/seeds/recipes.sql
```

肉じゃが・豚の生姜焼き・麻婆豆腐など 8 件のレシピが登録される。

## ファイル一覧

| ファイル       | 内容                                             |
| -------------- | ------------------------------------------------ |
| `seed-user.sh` | テストユーザー作成スクリプト（Better Auth 経由） |
| `recipes.sql`  | レシピサンプルデータ（8 件）                     |
