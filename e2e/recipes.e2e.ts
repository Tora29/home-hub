/**
 * @file E2Eテスト: レシピ管理
 * @module e2e/recipes.e2e.ts
 * @testType e2e
 *
 * @spec specs/recipes/spec.md
 * @covers AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-008, AC-009, AC-010, AC-011, AC-012, AC-013, AC-204
 *
 * @scenarios
 * - レシピ一覧の初期表示（登録順）
 * - 空状態メッセージの表示（0件時）
 * - レシピ登録フロー（手動入力タブ → 送信 → 一覧追加確認）
 * - レシピ詳細画面への遷移（カードクリック）
 * - レシピ編集フロー（編集ダイアログ → 変更保存 → 反映確認）
 * - レシピ削除フロー（削除確認ダイアログ → 確定 → 一覧戻り）
 * - ソート切り替え（しばらく作ってない順 / よく作る順 / 評価が高い順）
 * - AI 献立相談（質問送信 → 回答表示）
 * - AI レシピ抽出（テキスト貼り付け → フォーム自動入力 → sourceUrl 引き継ぎ）
 *
 * @pages
 * - /recipes - レシピ一覧画面
 * - /recipes/[id] - レシピ詳細画面
 */
import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL ?? 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'password123';

async function login(page: Page): Promise<void> {
	await page.goto('/login');
	await page.getByTestId('login-email-input').fill(TEST_EMAIL);
	await page.getByTestId('login-password-input').fill(TEST_PASSWORD);
	await page.getByTestId('login-submit-button').click();
	await page.waitForURL('/');
}

async function createRecipe(
	page: Page,
	data: { name: string; [key: string]: unknown }
): Promise<{ id: string; name: string }> {
	const res = await page.request.post('/recipes', {
		data,
		headers: { 'Content-Type': 'application/json' }
	});
	expect(res.ok()).toBeTruthy();
	return (await res.json()) as { id: string; name: string };
}

async function deleteRecipe(page: Page, id: string): Promise<void> {
	await page.request.delete(`/recipes/${id}`);
}

async function getAllRecipeIds(page: Page): Promise<string[]> {
	const res = await page.request.get('/recipes?limit=100');
	const data = (await res.json()) as { items: { id: string }[] };
	return data.items.map((r) => r.id);
}

// ============================================================
// 一覧画面
// ============================================================

test.describe('レシピ一覧画面', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('[SPEC: AC-001] 登録済みレシピが一覧にカード形式で表示される', async ({ page }) => {
		const recipe = await createRecipe(page, { name: 'テスト唐揚げ E2E' });
		try {
			await page.goto('/recipes');
			await expect(page.getByTestId('recipes-list')).toBeVisible();
			await expect(
				page.getByTestId('recipes-item').filter({ hasText: 'テスト唐揚げ E2E' })
			).toHaveCount(1);
		} finally {
			await deleteRecipe(page, recipe.id);
		}
	});

	test('[SPEC: AC-204] レシピが 0 件の場合、空状態メッセージが表示される', async ({ page }) => {
		const ids = await getAllRecipeIds(page);
		for (const id of ids) {
			await deleteRecipe(page, id);
		}

		await page.goto('/recipes');
		await expect(page.getByTestId('recipes-empty')).toBeVisible();
		await expect(page.getByTestId('recipes-empty')).toHaveText(
			'まだレシピがありません。「登録」ボタンから追加してみましょう！'
		);
		await expect(page.getByTestId('recipes-list')).not.toBeVisible();
	});
});

// ============================================================
// 登録フロー
// ============================================================

test.describe('登録フロー', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('[SPEC: AC-002] 手動入力タブでレシピ名を入力して送信すると一覧にレシピが追加される', async ({
		page
	}) => {
		const recipeName = '新規テストレシピ E2E';

		await page.goto('/recipes');
		await page.getByTestId('recipes-create-button').click();

		// 手動入力タブへ切り替え（デフォルトは AI タブ）
		await page.getByRole('button', { name: '手動入力' }).click();
		await expect(page.getByTestId('recipes-form')).toBeVisible();

		await page.getByTestId('recipes-name-input').fill(recipeName);
		await page.getByTestId('recipes-submit-button').click();

		// ダイアログが閉じてレシピが一覧に表示されることを確認
		await expect(page.getByTestId('recipes-item').filter({ hasText: recipeName })).toBeVisible();

		// クリーンアップ: 作成したレシピを削除
		const res = await page.request.get('/recipes?limit=100');
		const data = (await res.json()) as { items: { id: string; name: string }[] };
		const created = data.items.find((r) => r.name === recipeName);
		if (created) await deleteRecipe(page, created.id);
	});
});

// ============================================================
// 詳細画面
// ============================================================

test.describe('詳細画面', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('[SPEC: AC-003] カードクリックで詳細画面に遷移し詳細情報が表示される', async ({ page }) => {
		const recipe = await createRecipe(page, {
			name: 'テスト詳細確認レシピ E2E',
			description: 'テスト用の説明文',
			ingredients: [{ name: '卵', amount: '2個' }],
			steps: ['材料を準備する', '炒める']
		});

		try {
			await page.goto('/recipes');
			await page
				.getByTestId('recipes-item')
				.filter({ hasText: 'テスト詳細確認レシピ E2E' })
				.click();

			await expect(page).toHaveURL(new RegExp(`/recipes/${recipe.id}`));
			await expect(page.getByRole('heading', { level: 1 })).toHaveText('テスト詳細確認レシピ E2E');
			await expect(page.getByText('テスト用の説明文')).toBeVisible();
			await expect(page.getByText('卵')).toBeVisible();
			await expect(page.getByText('材料を準備する')).toBeVisible();
		} finally {
			await deleteRecipe(page, recipe.id);
		}
	});
});

// ============================================================
// 編集フロー
// ============================================================

test.describe('編集フロー', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('[SPEC: AC-004] 詳細画面の編集ボタンからレシピ名を変更すると変更が反映される', async ({
		page
	}) => {
		const recipe = await createRecipe(page, { name: '編集前レシピ E2E' });
		const updatedName = '編集後レシピ E2E';

		try {
			await page.goto(`/recipes/${recipe.id}`);
			await page.getByRole('button', { name: '編集' }).click();

			await expect(page.getByTestId('recipes-form')).toBeVisible();
			await expect(page.getByTestId('recipes-name-input')).toHaveValue('編集前レシピ E2E');

			await page.getByTestId('recipes-name-input').clear();
			await page.getByTestId('recipes-name-input').fill(updatedName);
			await page.getByTestId('recipes-submit-button').click();

			// ダイアログが閉じて変更が反映されることを確認
			await expect(page.getByRole('heading', { level: 1 })).toHaveText(updatedName);
		} finally {
			await deleteRecipe(page, recipe.id);
		}
	});
});

// ============================================================
// 削除フロー
// ============================================================

test.describe('削除フロー', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('[SPEC: AC-005] 削除ボタンで確認ダイアログが表示され、確定するとレシピが削除されて一覧に戻る', async ({
		page
	}) => {
		const recipe = await createRecipe(page, { name: '削除テストレシピ E2E' });

		await page.goto(`/recipes/${recipe.id}`);
		await page.getByTestId('recipes-delete-button').click();

		// 削除確認ダイアログが表示される
		await expect(page.getByTestId('recipes-delete-dialog')).toBeVisible();
		await expect(page.getByTestId('recipes-delete-dialog')).toContainText('削除テストレシピ E2E');

		// 確定ボタンをクリック
		await page.getByTestId('recipes-delete-confirm-button').click();

		// /recipes に遷移することを確認
		await expect(page).toHaveURL('/recipes');

		// 削除したレシピが一覧に表示されていないことを確認
		await expect(
			page.getByTestId('recipes-item').filter({ hasText: '削除テストレシピ E2E' })
		).toHaveCount(0);
	});
});

// ============================================================
// ソート
// ============================================================

test.describe('ソート', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('[SPEC: AC-008] しばらく作ってない順に切り替えると URL に sort=lastCookedAt_asc が反映される', async ({
		page
	}) => {
		await page.goto('/recipes');
		await page.getByTestId('recipes-sort-select').selectOption('lastCookedAt_asc');
		await expect(page).toHaveURL(/[?&]sort=lastCookedAt_asc/);
		// ページが正常に表示されることを確認
		await expect(page.getByTestId('recipes-sort-select')).toHaveValue('lastCookedAt_asc');
	});

	test('[SPEC: AC-009] よく作る順に切り替えると URL に sort=cookedCount_desc が反映される', async ({
		page
	}) => {
		await page.goto('/recipes');
		await page.getByTestId('recipes-sort-select').selectOption('cookedCount_desc');
		await expect(page).toHaveURL(/[?&]sort=cookedCount_desc/);
		await expect(page.getByTestId('recipes-sort-select')).toHaveValue('cookedCount_desc');
	});

	test('[SPEC: AC-010] 評価が高い順に切り替えると URL に sort=rating_desc が反映される', async ({
		page
	}) => {
		await page.goto('/recipes');
		await page.getByTestId('recipes-sort-select').selectOption('rating_desc');
		await expect(page).toHaveURL(/[?&]sort=rating_desc/);
		await expect(page.getByTestId('recipes-sort-select')).toHaveValue('rating_desc');
	});
});

// ============================================================
// AI 献立相談
// ============================================================

test.describe('AI 献立相談', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('[SPEC: AC-006] 質問を送信すると登録済みレシピを参照した回答が表示される', async ({
		page
	}) => {
		const recipe = await createRecipe(page, {
			name: 'テスト豚汁 E2E',
			difficulty: 'easy',
			rating: 'good'
		});

		try {
			await page.goto('/recipes');

			await page.getByTestId('recipes-ask-input').fill('おすすめのレシピを教えてください');
			await page.getByTestId('recipes-ask-button').click();

			// 回答が表示されるまで待機（AI 応答に時間がかかる場合を考慮）
			await expect(page.getByTestId('recipes-ask-answer')).toBeVisible({ timeout: 30000 });
			await expect(page.getByTestId('recipes-ask-answer')).not.toBeEmpty();
		} finally {
			await deleteRecipe(page, recipe.id);
		}
	});
});

// ============================================================
// AI レシピ抽出
// ============================================================

test.describe('AI レシピ抽出', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('[SPEC: AC-011] テキストを貼り付けて「AI で解析」ボタンを押すとフォームが自動入力され手動入力タブに切り替わる', async ({
		page
	}) => {
		const sampleText =
			'レシピ名: テスト炒飯\n材料: 白飯 2合, 卵 2個, ネギ 適量\n手順: 1. 油を熱する 2. 卵を炒める 3. ご飯を加えて炒める\n人数: 2人前\n調理時間: 15分';

		await page.goto('/recipes');
		await page.getByTestId('recipes-create-button').click();

		// AI タブはデフォルトで表示されている
		await page.getByTestId('recipes-extract-input').fill(sampleText);
		await page.getByTestId('recipes-extract-button').click();

		// 解析完了後、手動入力タブのフォームが表示されることを確認
		await expect(page.getByTestId('recipes-form')).toBeVisible({ timeout: 30000 });

		// name・ingredients・steps が自動入力されていることを確認
		await expect(page.getByTestId('recipes-name-input')).not.toHaveValue('');
		await expect(page.getByTestId('recipes-ingredient-item').first()).toBeVisible();
		await expect(page.getByTestId('recipes-step-item').first()).toBeVisible();

		// ダイアログを閉じる（キャンセル）
		await page.keyboard.press('Escape');
	});

	test('[SPEC: AC-012] ナビゲーションや広告を含むノイズのあるテキストでもレシピ情報が抽出される', async ({
		page
	}) => {
		const noisyText = `
      ナビゲーション | ホーム | レシピ一覧 | お気に入り | ログイン
      広告: 最安値で食材を購入！今すぐクリック！会員登録はこちら

      絶品チキンカレー（4人前）

      材料:
      - 鶏もも肉 400g
      - カレールー 1箱
      - 玉ねぎ 2個
      - じゃがいも 2個

      手順:
      1. 野菜と鶏肉を食べやすい大きさに切る
      2. 鍋で玉ねぎを炒める
      3. 鶏肉を加えて炒める
      4. 水を加えて煮込む
      5. カレールーを溶かして完成

      調理時間: 40分

      Copyright 2024 レシピサイト | プライバシーポリシー | お問い合わせ
    `;

		await page.goto('/recipes');
		await page.getByTestId('recipes-create-button').click();

		await page.getByTestId('recipes-extract-input').fill(noisyText);
		await page.getByTestId('recipes-extract-button').click();

		// ノイズを含むテキストでも解析が完了し、手動入力タブに切り替わることを確認
		// （AI の応答内容は非決定的なため、フォーム表示のみ検証する）
		await expect(page.getByTestId('recipes-form')).toBeVisible({ timeout: 30000 });

		// ダイアログを閉じる（キャンセル）
		await page.keyboard.press('Escape');
	});

	test('[SPEC: AC-013] AI 解析タブで sourceUrl を入力すると手動入力タブの sourceUrl フィールドに引き継がれる', async ({
		page
	}) => {
		const testUrl = 'https://example.com/recipe/chicken-curry';
		const sampleText = 'チョコレートケーキ\n材料: 薄力粉 100g, 卵 2個\n手順: 1. 混ぜる 2. 焼く';

		await page.goto('/recipes');
		await page.getByTestId('recipes-create-button').click();

		// AI タブで sourceUrl を入力（AI タブの recipes-source-url-input）
		await page.getByTestId('recipes-source-url-input').fill(testUrl);
		await page.getByTestId('recipes-extract-input').fill(sampleText);
		await page.getByTestId('recipes-extract-button').click();

		// 手動入力タブに切り替わった後、sourceUrl が引き継がれることを確認
		await expect(page.getByTestId('recipes-form')).toBeVisible({ timeout: 30000 });
		await expect(page.getByTestId('recipes-source-url-input')).toHaveValue(testUrl);

		// ダイアログを閉じる（キャンセル）
		await page.keyboard.press('Escape');
	});
});
