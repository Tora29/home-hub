# Step 3.6: テスト戦略テーブル生成

spec.md の「テスト戦略」セクションを生成する際、以下のルールに従って**全テストファイルを網羅する**。

---

## 必ず含める行

| 対象                       | テスト種別  | ファイル                          |
| -------------------------- | ----------- | --------------------------------- |
| Zod スキーマ               | Unit        | `schema.test.ts`                  |
| API ハンドラ（POST）       | Unit        | `server.test.ts`                  |
| API ハンドラ（PUT/DELETE） | Unit        | `[id]/server.test.ts`             |
| サービス層                 | Integration | `service.integration.test.ts`     |
| load 関数                  | Integration | `page.server.integration.test.ts` |
| ページコンポーネント       | Unit        | `page.svelte.test.ts`             |
| E2E フロー                 | E2E         | `e2e/{feature}.e2e.ts`            |

---

## Business Rules 由来のテストケース追加

Business Rules セクションが存在する場合、**AC に書かれていないルール違反もテスト戦略テーブルに含める**。
以下のルールからテストケースを導出し、対応するテストファイルに行を追加する。

| Business Rules                   | テストケース                                   | テスト種別         | テストファイル                                    |
| -------------------------------- | ---------------------------------------------- | ------------------ | ------------------------------------------------- |
| 状態遷移（不正遷移）             | `[SPEC: BR-状態遷移]` 不正な状態遷移でエラー   | Unit               | `server.test.ts`                                  |
| 権限マトリクス（権限違反）       | `[SPEC: BR-権限]` 権限のない操作でエラー       | Unit               | `server.test.ts`                                  |
| エンティティ間制約（所有権違反） | `[SPEC: BR-制約]` 他人のリソース参照でエラー   | Unit               | `server.test.ts`                                  |
| 外部API連携（失敗パターン）      | `[SPEC: BR-外部API]` ネットワークエラー等      | Unit               | `server.test.ts`                                  |
| 境界条件（null・未設定）         | `[SPEC: BR-境界]` null値・未設定のハンドリング | Unit / Integration | `server.test.ts` or `service.integration.test.ts` |

この行を追加することで、scaffold-test-unit が AC 由来のテストだけでなく、Business Rules 由来のテストも「期待ファイルリスト」に含めて生成できる。

---

## FE コンポーネントテストの追加ルール

UI Requirements に**独立したコンポーネント**（フォーム・カード・ダイアログ等）が登場し、かつ対応する AC（特に FE バリデーション AC や操作 AC）が存在する場合、以下の行を追加する。

```
| AC-XXX〜YYY | Unit | components/{ComponentName}.svelte.test.ts | {コンポーネントの責務}の検証 |
```

### 判定基準

以下のいずれかを満たすコンポーネントはテスト対象とする

- FE バリデーション（フォームの入力チェック）を持つ
- 独立した状態（`$state`）と操作を持つ
- 複数の画面・ダイアログから再利用される

### 例

```
| AC-111〜112 | Unit | components/ExpenseForm.svelte.test.ts | FE バリデーション（金額・カテゴリ）の検証 |
| AC-003      | Unit | components/RecipeCard.svelte.test.ts  | カードクリックの動作検証 |
```

この行を追加することで、scaffold-test-unit が「期待ファイルリスト」にコンポーネントテストを含め、scaffold-fe 実行前に RED テストとして生成できる。

---

## spec ハッシュの付与（差分検知用）

テスト戦略テーブルの各行に **spec ハッシュ**を付与する。scaffold-test-unit / scaffold-test-e2e はこのハッシュを使って spec 変更を検知する。

### ハッシュの生成方法

1. テスト戦略テーブルの各行の「マーカー + 説明」を結合した文字列を入力とする
2. `sha256` でハッシュ化し、先頭8文字を取り出す
3. テスト戦略テーブルの `spec_hash` 列に記載する

### 具体例

```
入力文字列: "[SPEC: AC-001] 支出一覧に今月の支出が新しい順で表示される"
ハッシュ: sha256 → "a1b2c3d4"
```

### テスト戦略テーブルのフォーマット

```
| マーカー | テスト種別 | ファイル | 説明 | spec_hash |
|----------|-----------|----------|------|-----------|
| [SPEC: AC-001] ... | Unit | server.test.ts | ... | a1b2c3d4 |
| [SPEC: BR-権限] ... | Unit | server.test.ts | ... | e5f6a7b8 |
```

### scaffold 側での使用

scaffold-test-unit / scaffold-test-e2e は、生成するテストケースの test 名末尾に `// spec:{hash}` を埋め込む。

```typescript
test('[SPEC: AC-001] 支出一覧に今月の支出が新しい順で表示される // spec:a1b2c3d4', async () => {
```

再実行時に grep でハッシュを抽出し、spec.md のテスト戦略テーブルのハッシュと比較することで「新規追加・既存削除・既存更新」の3パターンを検知する。
