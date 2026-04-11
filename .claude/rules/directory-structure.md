# Directory Structure

本プロジェクトにおけるディレクトリ構成の基本ルール。

## 基本方針

- `src/routes` は **URL の入口** を表現する場所として使う
- `src/lib` は **再利用可能な実装** を置く場所として使う
- `src/lib/server` は **サーバー専用の実装** を置く場所として使う
- route file は薄く保ち、重いロジックを抱え込まない

---

## `src/routes` に置くもの

`src/routes` には、filesystem routing に直接関係するものだけを置く。

- `+page.svelte`
- `+page.server.ts`
- `+layout.svelte`
- `+layout.server.ts`
- `+server.ts`
- `error.svelte`
- route 専用で、その route からしか使わない小さな UI 部品

例:

```text
src/routes/hoge/
├── +page.svelte
├── +page.server.ts
├── +server.ts
├── [id]/+server.ts
├── request/+server.ts
├── approve/+server.ts
├── cancel/+server.ts
└── components/
    ├── HogeForm.svelte
    └── HogeFormDialog.svelte
```

---

## `src/routes` に置かないもの

次のような実装は、原則として `src/routes` 直下に置かない。

- 大きなビジネスロジック
- DB 操作
- サーバー専用 helper
- 複数 route から参照される schema
- 複数 route から参照される type
- feature 全体で共有される実装

これらは `src/lib` または `src/lib/server` へ移す。

---

## `src/lib` に置くもの

`src/lib` には、クライアント・サーバーの両方から再利用されるコードを置く。

- 共通 UI コンポーネント
- 共通 utility
- 共通 store
- route をまたいで使う schema
- route をまたいで使う type

例:

```text
src/lib/
├── components/
│   ├── Button.svelte
│   ├── Header.svelte
│   └── Sidebar.svelte
├── stores/
├── utils/
└── types/
```

---

## `src/lib/server` に置くもの

`src/lib/server` には、サーバー側でのみ使うコードを置く。

- DB 接続
- service
- repository 相当の処理
- 認証補助
- 外部 API クライアント
- server-only utility

例:

```text
src/lib/server/
├── db.ts
├── errors.ts
├── feature-a/
│   ├── item.service.ts
│   ├── item-action.service.ts
│   ├── item.schema.ts
│   └── item.types.ts
├── feature-b/
└── feature-c/
```

---

## feature の切り方

spec は `specs/{feature}` に外出しし、実装は feature 単位でまとめる。

- `specs/{feature}`: 仕様
- `src/routes/{feature}`: URL の入口
- `src/lib/server/{feature}`: サーバー実装
- `src/lib/{feature}` または `src/lib/components`: 共有 UI / 共通コード

feature が大きくなっても、`src/routes/{feature}` を肥大化させず、責務ごとに外へ逃がす。

---

## route file の責務

### `+page.server.ts`

- query / params の受け取り
- service 呼び出し
- 初期表示用データの返却

### `+server.ts`

- HTTP エンドポイントの受け口
- body / query のパース
- schema でのバリデーション
- service 呼び出し
- レスポンス返却

### `+page.svelte`

- 画面描画
- ユーザー操作
- 必要最小限の UI ロジック

DB 操作や重いビジネスロジックは route file に書かない。

---

## route 専用 component の扱い

その route でしか使わない UI は `src/routes/{feature}/components` に置いてよい。

ただし、次のどちらかに該当したら `src/lib/components` へ移す。

- 複数 feature で使う
- route 専用ではなくなった

---

## action endpoint と page route の考え方

SvelteKit では page route と endpoint route が同じ階層に並びやすい。
そのため、見通しを保つために以下を徹底する。

- `src/routes` は URL 表現として割り切る
- 実装本体は `src/lib` / `src/lib/server` に寄せる
- endpoint directory が増えても、route file 自体は薄く保つ

---

## 命名の目安

- service: `*.service.ts`
- schema: `*.schema.ts`
- type: `*.types.ts`
- server-only module: `.server.ts` または `src/lib/server/*`

---

## やらないこと

- `src/routes` に大きな service を置き続ける
- feature ごとに別々の構成ルールを採用する
- route file に DB クエリを直接書く
- 再利用コードを route 配下に分散させる

---

## 判断基準

配置に迷ったら次で判断する。

1. URL に対応する入口か
   - Yes: `src/routes`
2. 複数箇所で再利用するか
   - Yes: `src/lib`
3. サーバー専用か
   - Yes: `src/lib/server`
4. その route でしか使わない小さな UI か
   - Yes: `src/routes/{feature}/components`

このルールで迷いが残る場合は、`src/routes` を薄く保てる方を優先する。
