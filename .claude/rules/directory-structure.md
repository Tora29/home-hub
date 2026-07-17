# Directory Structure

SvelteKit における 2 層アーキテクチャの規約。

- `src/routes/` = 薄いルーティング層（SvelteKit 固有ファイルのみ）
- `src/lib/features/` = 実装層（コロケーションはここで完結）

---

## アーキテクチャ概要

```
src/
├── routes/
│   └── {feature}/
│       ├── +page.svelte        # $lib/features/{feature}/components から import して呼ぶだけ
│       ├── +page.server.ts     # $lib/features/{feature}/server/* を呼ぶだけ
│       └── +server.ts          # 外部 API として公開する場合のみ。基本は +page.server.ts で済ます
│
└── lib/
    └── features/
        └── {feature}/          # ここでコロケーションを完結させる
            ├── schema.ts       # Zod スキーマ（FE/BE 共通なので server/ の外）
            ├── types.ts        # FE/BE 共通の型
            ├── components/     # この feature の UI コンポーネント
            └── server/         # サーバー専用コード
                └── service.ts  # DB 操作・ビジネスロジック
```

---

## routes/ の責務

`src/routes/` には SvelteKit 固有ファイルのみを置く。ロジックを書かない。

| ファイル          | 責務                                                |
| ----------------- | --------------------------------------------------- |
| `+page.svelte`    | `$lib/features/` のコンポーネントを呼ぶだけ         |
| `+page.server.ts` | `$lib/features/{feature}/server/` を呼ぶだけ        |
| `+server.ts`      | CSR fetch 用 API が必要な場合のみ。薄いハンドラのみ |

```typescript
// +page.server.ts の例（これ以上のロジックを書かない）
import { getRecords } from '$lib/features/workout/server/records';

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = createDb(platform!.env.DB);
	return { records: await getRecords(db, locals.user!.id) };
};
```

```svelte
<!-- +page.svelte の例 -->
<script>
	import WorkoutPage from '$lib/features/workout/components/WorkoutPage.svelte';
	let { data } = $props();
</script>

<WorkoutPage {data} />
```

---

## lib/features/ の構成

### 基本構成

```
lib/features/{feature}/
  schema.ts                        # Zod スキーマ（FE/BE 共通）
  schema.test.ts
  types.ts                         # 共通型（必要な場合のみ）
  components/
    {ComponentName}.svelte
    {ComponentName}.svelte.test.ts
  server/
    service.ts                     # DB 操作・ビジネスロジック
    service.integration.test.ts
```

### 任意のヘルパーファイル

`schema.ts` / `types.ts` 以外にも、feature 内の複数箇所（`components/` 間・`components/` と `routes/`間）で共有する
サーバー非依存の純粋関数は feature 直下にファイルを切り出せる。

```
lib/features/{feature}/
  format.ts    # 表示整形（例: expenses/format.ts の formatAmount）
  labels.ts    # ラベル変換・マップ（例: recipes/labels.ts の DIFFICULTY_LABEL）
```

- クライアントから import 可能な純粋関数のみを置く（DB アクセス・シークレット参照は `server/` へ）
- 1 箇所でしか使わない関数は切り出さず、使用箇所にそのまま書く

### 責務が複数ある場合はファイル名で分割

```
lib/features/workout/
  schema.ts                        # 記録のスキーマ（メイン責務）
  types.ts
  components/
    WorkoutPage.svelte
    WeeklyVolumeChart.svelte
    WorkoutChart.svelte
  server/
    records.ts                     # getRecords / createRecord / deleteRecord
    records.integration.test.ts
    chart.ts                       # getChartData / getWeeklyVolume
    chart.integration.test.ts
    body-weight.ts                 # upsertBodyWeight
```

---

## サブ機能はネストして置く

サブ機能は親 feature ディレクトリ配下にネストする（**2階層まで**）。
URL 階層と対応させることで直感的な構造になる。

```
# ✅ 正しい（ネスト）
lib/features/
  workout/
    exercises/      # workout のサブ機能
  expenses/
    categories/     # expenses のサブ機能

# ❌ 誤り（プレフィックスでフラットに置く）
lib/features/
  workout/
  workout-exercises/    # プレフィックス命名は使わない
  expenses/
  expense-categories/
```

このプロジェクトの例:

```
lib/features/
  expenses/
    categories/
  recipes/
  workout/
    exercises/
  dashboard/
```

サブ機能のファイル構成はトップレベル feature と同じ（`schema.ts` / `server/` / `components/`）。
インポートは親 feature のエイリアスで解決できる（`$expenses/categories/server/service`）。

---

## components/ の配置ルール

| 条件                          | 配置先                                   |
| ----------------------------- | ---------------------------------------- |
| 1 つの feature でしか使わない | `src/lib/features/{feature}/components/` |
| 複数 feature で再利用する     | `src/lib/components/`                    |

---

## server/ サブディレクトリの使い方

`server/` はサーバー専用コードの境界を明示する。クライアントから import できない。

```
lib/features/{feature}/
  schema.ts     # ← クライアントから import 可（Zod バリデーション）
  types.ts      # ← クライアントから import 可
  server/
    service.ts  # ← サーバーのみ（DB アクセス・シークレット参照）
```

---

## 変更の影響範囲

| やりたいこと           | 触る場所                                        |
| ---------------------- | ----------------------------------------------- |
| URL を変えたい         | `src/routes/` のみ                              |
| ロジックを変えたい     | `src/lib/features/{feature}/server/` のみ       |
| UI を変えたい          | `src/lib/features/{feature}/components/` のみ   |
| 機能を丸ごと削除したい | `lib/features/{feature}/` + `routes/{feature}/` |

---

## なぜ必要か

- `src/routes/` にルーティングと実装が混在すると、URL 変更・機能削除・AI によるコード生成いずれも影響範囲が読めなくなる
- `lib/features/` に実装を集約することで feature 単位の独立性が保たれ、AI がコンテキストを最小化して正確なコードを生成できる
- `server/` サブディレクトリにより、クライアントに漏れてはいけないコードの境界が明確になる
