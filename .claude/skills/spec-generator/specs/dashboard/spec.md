# Feature: Dashboard（ダッシュボード）

## Overview

ダッシュボード（`/`）に支出の集計情報と承認依頼バナーを表示する。
月別・全期間を切り替えながら、全体合計・支払者別合計・カテゴリ別合計を確認できる。
全期間で相手から `pending`（申請中）の支出が 1 件以上存在する場合は承認依頼バナーを表示し、ユーザーが見落とさないよう通知する。

集計対象は **承認済み・申請中・確認済み・未承認の全ステータス**を含む（支払い記録としての合計を把握するため）。
集計は全ユーザー（主・妻）の支出を世帯合計として扱う。支払者別合計は `user` テーブルから取得する。

## User Stories

- ユーザーとして、今月の全体支出合計をダッシュボードで確認したい。月の支出状況を把握するため。
- ユーザーとして、誰がどれだけ払ったかをダッシュボードで確認したい。支払い負担のバランスを把握するため。
- ユーザーとして、カテゴリ別の支出合計をダッシュボードで確認したい。支出傾向を把握するため。
- ユーザーとして、月別表示と全期間表示を切り替えたい。短期・長期の両方の視点で確認するため。
- ユーザーとして、相手から承認依頼が届いた場合にダッシュボードで通知を受けたい。承認漏れを防ぐため。

## Schema Definition（サマリ）

エンティティの概要と主要フィールド。詳細は [openapi.yaml](./openapi.yaml) を参照。

| エンティティ     | 概要           | 主要フィールド                  | 備考 |
| ---------------- | -------------- | ------------------------------- | ---- |
| DashboardSummary | 集計サマリー   | overall, byPayer, byCategory    | -    |
| PayerSummary     | 支払者別合計   | payerId, payerName, total       | -    |
| CategorySummary  | カテゴリ別合計 | categoryId, categoryName, total | -    |

## Database Constraints（サマリ）

DB レベルの制約の概要。詳細は `src/lib/server/tables.ts` を参照。

ダッシュボードは集計専用機能のため、ユニーク制約なし。

> 設計指針は `.claude/rules/schemas.md` の「Database Constraints 設計指針」を参照。

## Error Responses（サマリ）

エラーレスポンスの概要。詳細は [openapi.yaml](./openapi.yaml) を参照。

| 操作 | エラーコード     | 条件                | 備考 |
| ---- | ---------------- | ------------------- | ---- |
| 集計 | VALIDATION_ERROR | period/month が不正 | -    |

## Query Parameters（サマリ）

一覧取得時のクエリパラメータ概要。詳細は [openapi.yaml](./openapi.yaml) を参照。

| パラメータ | 説明                   | 備考                                 |
| ---------- | ---------------------- | ------------------------------------ |
| period     | 集計期間               | デフォルト: month, 選択肢: month/all |
| month      | 対象月（YYYY-MM 形式） | period=month の場合のみ有効          |

## API Endpoints

API 詳細は [openapi.yaml](./openapi.yaml) を参照。

> 型定義・スキーマ・ステータスコード・エラーレスポンスは openapi.yaml が Single Source of Truth。

| メソッド | パス                 | 説明                              |
| -------- | -------------------- | --------------------------------- |
| GET      | `/dashboard/summary` | 集計サマリー取得（月別 / 全期間） |

## Acceptance Criteria

### 正常系

- AC-001: ダッシュボードにアクセスすると、当月の集計情報（全体合計・支払者別合計・カテゴリ別合計）が表示される
- AC-002: 月切り替えセレクトで別の月を選択すると、選択した月の集計情報に切り替わる
- AC-002b: 月切り替えセレクトの選択肢は、選択中の月に関わらず常に「当月を起点とした過去 13 か月分」で固定される（過去月を選択後も当月を含む選択肢が表示され続ける）
- AC-003: 「全期間」タブを選択すると、全期間の集計情報に切り替わり月切り替えセレクトが非表示になる
- AC-004: 「月別」タブを選択すると、月別集計に戻り月切り替えセレクトが再表示される
- AC-005: 全体合計金額がカンマ区切りで表示される（例: `¥12,300`）
- AC-006: 支払者別合計セクションに各支払者名と合計金額がカンマ区切りで表示される。合計金額が多い順でソートされる
- AC-007: カテゴリ別合計セクションに各カテゴリ名と合計金額がカンマ区切りで表示される。合計金額が多い順でソートされる
- AC-008: **全期間**で相手からの `pending`（申請中）支出が 1 件以上ある場合、`expense-pending-alert` バナーに「承認依頼が X 件届いています」と件数付きで表示され、`/expenses` へのリンクが付与される
- AC-009: 相手からの `pending` 支出がなくなる（0 件または承認済みになる）と、`expense-pending-alert` バナーが非表示になる

### 異常系

- AC-101: `period` が `month`・`all` 以外の場合、400 VALIDATION_ERROR が返る
- AC-102: `month` クエリパラメータの月部分が `01〜12` の範囲外の場合（例: `2026-13`、`2026-00`）、400 VALIDATION_ERROR「月は01〜12で入力してください」が返る
- AC-103: 集計 API 取得が失敗した場合、期間タブは切り替え前の状態を維持する（切り替え後の期間ラベルで古い集計データが表示されない）

### 境界値

- AC-201: 対象期間に支出が 0 件の場合、全体合計が「¥0」と表示される
- AC-202: 対象期間に支払者別集計対象の支出が 1 件もない場合、支払者別合計セクションに空状態メッセージが表示される
- AC-203: カテゴリが 1 件も登録されていない（または対象期間に支出がない）場合、カテゴリ別合計セクションに空状態メッセージが表示される

## UI Requirements

### ダッシュボードページ（`/`）

#### 画面構成

- **承認依頼バナー** (`expense-pending-alert`): 全期間で承認対象パートナーからの `pending` 支出が 1 件以上ある場合に表示。テキスト例: 「承認依頼が X 件届いています」（`/expenses` へのリンク付き）。SSR load 関数で全期間の承認依頼件数（`pendingApprovalCount`）を取得して表示判定する
- **期間切り替えタブ**: 「月別」(`dashboard-period-tab-month`) / 「全期間」(`dashboard-period-tab-all`) の 2 タブ
- **月切り替えセレクト** (`dashboard-month-select`): 「月別」タブ選択時のみ表示。デフォルトは当月（`YYYY-MM` 形式）。選択肢は当月を含む過去 13 か月分
- **全体合計カード** (`dashboard-total`): 対象期間の支出合計金額をカンマ区切りで表示（例: `¥12,300`）
- **支払者別合計セクション**:
  - リスト (`dashboard-payer-summary-list`): 各支払者の名前と合計金額を多い順に表示
  - 各行 (`dashboard-payer-summary-item`): 支払者名 + 合計金額
  - 空状態 (`dashboard-payer-summary-empty`): 対象期間に支出がない場合に表示
- **カテゴリ別合計セクション**:
  - リスト (`dashboard-category-summary-list`): 各カテゴリの名前と合計金額を多い順に表示
  - 各行 (`dashboard-category-summary-item`): カテゴリ名 + 合計金額
  - 空状態 (`dashboard-category-summary-empty`): 対象期間に支出がない場合に表示

#### インタラクション

- 初期表示（SSR）: `+page.server.ts` の load 関数で当月の集計データを取得
- 月切り替え: `GET /dashboard/summary?period=month&month=YYYY-MM` を fetch して集計データを更新
- 「全期間」タブ選択: `GET /dashboard/summary?period=all` を fetch して集計データを更新
- 「月別」タブ選択: `GET /dashboard/summary?period=month&month=YYYY-MM`（最後に選択した月）を fetch して更新

### コンポーネント階層

```
DashboardPage
├── PendingApprovalBanner (expense-pending-alert) ※条件付き
├── PeriodTabGroup
│   ├── MonthTab (dashboard-period-tab-month)
│   └── AllTab (dashboard-period-tab-all)
├── MonthSelect (dashboard-month-select) ※月別タブ時のみ
├── TotalCard (dashboard-total)
├── PayerSummarySection
│   ├── PayerSummaryList (dashboard-payer-summary-list)
│   │   └── PayerSummaryItem (dashboard-payer-summary-item) × N
│   └── PayerSummaryEmpty (dashboard-payer-summary-empty) ※0件時
└── CategorySummarySection
    ├── CategorySummaryList (dashboard-category-summary-list)
    │   └── CategorySummaryItem (dashboard-category-summary-item) × N
    └── CategorySummaryEmpty (dashboard-category-summary-empty) ※0件時
```

### レイアウト・スペーシング

| 要素                  | 配置                     | 幅・高さ  | 余白       | 備考                       |
| --------------------- | ------------------------ | --------- | ---------- | -------------------------- |
| PageContainer         | 中央寄せ                 | max-w-2xl | p-4 md:p-6 |                            |
| PendingApprovalBanner | 上部                     | w-full    | mb-4 p-3   | bg-warning/10 text-warning |
| PeriodTabGroup        | 横並び                   | auto      | mb-4       |                            |
| MonthSelect           | 左寄せ                   | auto      | mb-4       | 月別タブ時のみ表示         |
| TotalCard             | カード                   | w-full    | mb-6 p-4   |                            |
| SummarySection        | 縦並び                   | w-full    | gap-4      |                            |
| SummaryItem           | 横並び（名前左・金額右） | w-full    | py-2       |                            |

### 状態ごとの表示ルール

| 要素                  | 条件                        | 表示               | 備考                      |
| --------------------- | --------------------------- | ------------------ | ------------------------- |
| PendingApprovalBanner | pendingApprovalCount ≥ 1    | 表示               | DOM 追加                  |
| PendingApprovalBanner | pendingApprovalCount = 0    | 非表示             | DOM 除去                  |
| MonthSelect           | period=month タブ選択中     | 表示               |                           |
| MonthSelect           | period=all タブ選択中       | 非表示（DOM除去）  |                           |
| PayerSummaryEmpty     | 支払者別データが 0 件       | 表示               |                           |
| PayerSummaryList      | 支払者別データが 1 件以上   | 表示               |                           |
| CategorySummaryEmpty  | カテゴリ別データが 0 件     | 表示               |                           |
| CategorySummaryList   | カテゴリ別データが 1 件以上 | 表示               |                           |
| MonthTab              | period=month                | アクティブスタイル | border-b-2 border-primary |
| AllTab                | period=all                  | アクティブスタイル | border-b-2 border-primary |

### アニメーション・トランジション

なし（状態変化は即時反映。アニメーション過多を避ける方針に従う）

### レスポンシブ挙動

| ブレークポイント     | レイアウト変更 | 備考           |
| -------------------- | -------------- | -------------- |
| デフォルト（<768px） | 1カラム        | モバイル       |
| md（≥768px）         | 変更なし       | タブレット以上 |
| lg（≥1024px）        | 変更なし       | デスクトップ   |

### 空状態・ローディング

| 状態         | 表示内容                         | data-testid                      |
| ------------ | -------------------------------- | -------------------------------- |
| ローディング | -                                | -                                |
| 支払者0件    | 「支払者別の支出はありません」   | dashboard-payer-summary-empty    |
| カテゴリ0件  | 「カテゴリ別の支出はありません」 | dashboard-category-summary-empty |

## data-testid

| testid                             | 要素種別   | 説明                                                             |
| ---------------------------------- | ---------- | ---------------------------------------------------------------- |
| `dashboard-period-tab-month`       | `<button>` | 「月別」タブボタン                                               |
| `dashboard-period-tab-all`         | `<button>` | 「全期間」タブボタン                                             |
| `dashboard-month-select`           | `<select>` | 月切り替えセレクト（「月別」タブ選択時のみ表示）                 |
| `dashboard-total`                  | `<p>`      | 全体合計金額表示                                                 |
| `dashboard-payer-summary-list`     | `<ul>`     | 支払者別合計リスト                                               |
| `dashboard-payer-summary-item`     | `<li>`     | 支払者別合計行（支払者名 + 合計金額）                            |
| `dashboard-payer-summary-empty`    | `<p>`      | 支払者別合計の空状態メッセージ                                   |
| `dashboard-category-summary-list`  | `<ul>`     | カテゴリ別合計リスト                                             |
| `dashboard-category-summary-item`  | `<li>`     | カテゴリ別合計行（カテゴリ名 + 合計金額）                        |
| `dashboard-category-summary-empty` | `<p>`      | カテゴリ別合計の空状態メッセージ                                 |
| `expense-pending-alert`            | `<div>`    | 承認依頼バナー（全期間で相手の pending が 1 件以上のときに表示） |

## テスト戦略

| AC          | 種別        | 対象ファイル                                    | 備考                                                                              | spec_hash |
| ----------- | ----------- | ----------------------------------------------- | --------------------------------------------------------------------------------- | --------- |
| AC-001〜004 | Integration | `page.server.integration.test.ts`（`/` 側）     | SSR load 関数で当月集計データ取得を実 D1 で検証                                   | d9781175  |
| AC-001〜007 | Integration | `dashboard/summary/service.integration.test.ts` | 支払者別・カテゴリ別・全体合計算出を実 D1 で検証                                  | f06f17c7  |
| AC-008〜009 | Integration | `page.server.integration.test.ts`（`/` 側）     | 全期間の承認依頼件数取得・バナー表示判定を実 D1 で検証                            | 781c1362  |
| AC-008〜009 | Integration | `expenses/service.integration.test.ts`          | `getPendingApprovalCount` の DB ロジックを実 D1 で検証（expenses service に実装） | 5f0f5707  |
| AC-101〜102 | Unit        | `dashboard/schema.test.ts`                      | Zod スキーマによる入力バリデーションを検証                                        | 26d06d2d  |
| AC-002〜004 | E2E         | `e2e/dashboard.e2e.ts`                          | タブ切り替え・月切り替えのインタラクションを E2E で検証                           | dd25657e  |
| AC-201〜203 | Integration | `dashboard/summary/service.integration.test.ts` | 0 件境界値を実 D1 で検証                                                          | f20fc9c1  |
| AC-201〜203 | Unit        | `page.svelte.test.ts`（`/` 側）                 | 空状態メッセージの表示を検証                                                      | 1b71a382  |
| AC-005〜007 | Unit        | `page.svelte.test.ts`（`/` 側）                 | 合計金額のカンマ区切り表示・支払者別・カテゴリ別一覧の表示形式を検証              | f8af9313  |
| AC-008〜009 | Unit        | `page.svelte.test.ts`（`/` 側）                 | 承認依頼バナーの表示（件数テキスト含む）・非表示（DOM 除去）を検証                | fb5f539b  |

## Non-Functional Requirements

### Performance

- 集計クエリは月別・全期間ともに GROUP BY で DB 側で集計し、アプリ側での集計は行わない
- 集計対象は全ステータス（unapproved・checked・pending・approved）を含む
- 支払者別集計は `user` テーブルを JOIN して取得する
- 承認依頼件数（`pendingApprovalCount`）は自分以外の全ユーザーの `status='pending'` 件数を全期間で集計する

### Security

- `hooks.server.ts` の認証ガードにより全エンドポイント認証済み
- 集計は世帯全体（全ユーザー）を対象とする。`userId` による絞り込みは行わない
- `pendingApprovalCount` は自分自身を除く全ユーザーの `pending` を対象に取得する
- `{@html}` は不使用
