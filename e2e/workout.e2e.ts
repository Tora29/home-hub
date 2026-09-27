/**
 * @file E2Eテスト: 筋トレ記録
 * @module e2e/workout.e2e.ts
 * @testType e2e
 *
 * @scenarios
 * - 初期表示: 筋トレ記録ページが表示される
 * - 種目管理: 種目を追加・編集・削除できる
 * - 種目カテゴリ管理: カテゴリを追加・種目に設定・削除できる
 * - 記録登録: 記録フォームから登録でき、過去MAXヒント・推定1RMが表示される
 * - 記録削除: 確認ダイアログから記録を削除できる
 * - 体重登録: 体重フォームから登録でき、当日分は記録済みとして無効化される
 * - グラフ: 記録後にグラフ種目セレクト・期間フィルタが表示される
 * - フィルタ: 種目フィルタで記録一覧を絞り込める
 *
 * @pages
 * - /workout - 記録一覧・登録
 * - /workout/exercises - 種目管理
 */
import { test, expect, type Page } from '@playwright/test';
import { getTodayDate } from '../src/lib/utils/date';

/** seed データ（ベンチプレス等）と衝突しない一意な名前を生成する。 */
function uniqueName(base: string): string {
	return `${base}-${Date.now()}`;
}

async function createExercise(
	page: Page,
	name: string,
	categoryId: string | null = null
): Promise<{ id: string }> {
	const res = await page.request.post('/workout/exercises', {
		data: { name, categoryId },
		headers: { 'Content-Type': 'application/json' }
	});
	expect(res.ok()).toBeTruthy();
	return res.json();
}

async function deleteExercise(page: Page, id: string): Promise<void> {
	await page.request.delete(`/workout/exercises/${id}`);
}

async function findExerciseIdsByName(page: Page, name: string): Promise<string[]> {
	const res = await page.request.get('/workout/exercises');
	const body = (await res.json()) as { items: { id: string; name: string }[] };
	return body.items.filter((ex) => ex.name === name).map((ex) => ex.id);
}

async function createCategory(page: Page, name: string): Promise<{ id: string }> {
	const res = await page.request.post('/workout/exercises/categories', {
		data: { name },
		headers: { 'Content-Type': 'application/json' }
	});
	expect(res.ok()).toBeTruthy();
	return res.json();
}

async function deleteCategory(page: Page, id: string): Promise<void> {
	await page.request.delete(`/workout/exercises/categories/${id}`);
}

async function findCategoryIdsByName(page: Page, name: string): Promise<string[]> {
	const res = await page.request.get('/workout/exercises/categories');
	const body = (await res.json()) as { items: { id: string; name: string }[] };
	return body.items.filter((cat) => cat.name === name).map((cat) => cat.id);
}

async function createRecord(
	page: Page,
	data: { exerciseId: string; date: string; weight: number; reps: number }
): Promise<{ id: string }> {
	const res = await page.request.post('/workout', {
		data,
		headers: { 'Content-Type': 'application/json' }
	});
	expect(res.ok()).toBeTruthy();
	return res.json();
}

async function deleteRecord(page: Page, id: string): Promise<void> {
	await page.request.delete(`/workout/${id}`);
}

test.describe('筋トレ記録 - 初期表示', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/workout');
	});

	test('主要要素が表示される', async ({ page }) => {
		await expect(page.getByTestId('workout-page-title')).toBeVisible();
		await expect(page.getByTestId('workout-form-date')).toBeVisible();
		await expect(page.getByTestId('workout-form-exercise-select')).toBeVisible();
		await expect(page.getByTestId('workout-form-weight-input')).toBeVisible();
		await expect(page.getByTestId('workout-form-reps-select')).toBeVisible();
		await expect(page.getByTestId('workout-form-add-button')).toBeVisible();
	});

	test('種目管理リンクが表示される', async ({ page }) => {
		await expect(page.getByTestId('workout-exercises-link')).toBeVisible();
	});

	test('記録リストが表示される', async ({ page }) => {
		await expect(page.getByTestId('workout-record-list')).toBeVisible();
	});
});

test.describe('筋トレ記録 - 種目管理', () => {
	test('種目を追加できる', async ({ page }) => {
		const name = uniqueName('E2E追加種目');
		await page.goto('/workout/exercises');

		await page.getByTestId('workout-exercise-name-input').fill(name);
		await page.getByTestId('workout-exercise-add-button').click();

		await expect(page.getByTestId('workout-exercise-list')).toBeVisible();
		await expect(page.getByTestId('workout-exercise-item').filter({ hasText: name })).toBeVisible();

		// クリーンアップ
		for (const id of await findExerciseIdsByName(page, name)) await deleteExercise(page, id);
	});

	test('種目名が空のとき追加ボタンを押すとエラーが表示される', async ({ page }) => {
		await page.goto('/workout/exercises');

		await page.getByTestId('workout-exercise-add-button').click();
		await expect(page.getByTestId('workout-exercise-name-error')).toHaveText('種目名は必須です');
	});

	test('種目を編集できる', async ({ page }) => {
		const name = uniqueName('E2E編集前種目');
		const editedName = uniqueName('E2E編集済み種目');
		const exercise = await createExercise(page, name);
		await page.goto('/workout/exercises');

		const item = page.getByTestId('workout-exercise-item').filter({ hasText: name });
		await item.getByTestId('workout-exercise-edit-button').click();

		await page.getByTestId('workout-exercise-edit-input').fill(editedName);
		await page.getByTestId('workout-exercise-edit-save-button').click();

		await expect(
			page.getByTestId('workout-exercise-item').filter({ hasText: editedName })
		).toBeVisible();

		// クリーンアップ
		await deleteExercise(page, exercise.id);
	});

	test('種目を削除できる', async ({ page }) => {
		const name = uniqueName('E2E削除種目');
		await createExercise(page, name);
		await page.goto('/workout/exercises');

		const item = page.getByTestId('workout-exercise-item').filter({ hasText: name });
		await item.getByTestId('workout-exercise-delete-button').click();

		await expect(page.getByTestId('workout-exercise-delete-dialog')).toBeVisible();
		await page.getByTestId('workout-exercise-delete-confirm-button').click();

		await expect(
			page.getByTestId('workout-exercise-item').filter({ hasText: name })
		).not.toBeVisible();
	});
});

test.describe('筋トレ記録 - 記録登録・MAXヒント', () => {
	let exerciseId = '';
	let exerciseName = '';
	let recordIds: string[] = [];

	test.beforeEach(async ({ page }) => {
		exerciseName = uniqueName('E2Eスクワット');
		const exercise = await createExercise(page, exerciseName);
		exerciseId = exercise.id;
		recordIds = [];
	});

	test.afterEach(async ({ page }) => {
		// 記録が残っていると種目削除が CONFLICT になるため、記録 → 種目の順に削除する
		for (const id of recordIds) await deleteRecord(page, id);
		if (exerciseId) await deleteExercise(page, exerciseId);
		exerciseId = '';
		recordIds = [];
	});

	test('種目を選択して記録を登録できる', async ({ page }) => {
		await page.goto('/workout');

		await page.getByTestId('workout-form-exercise-select').selectOption(exerciseId);
		await page.getByTestId('workout-form-weight-input').fill('80');
		await page.getByTestId('workout-form-reps-select').selectOption('5');

		const responsePromise = page.waitForResponse(
			(res) => new URL(res.url()).pathname === '/workout' && res.request().method() === 'POST'
		);
		await page.getByTestId('workout-form-add-button').click();
		const response = await responsePromise;
		expect(response.status()).toBe(201);
		recordIds.push(((await response.json()) as { id: string }).id);

		await expect(
			page.getByTestId('workout-record-item').filter({ hasText: exerciseName })
		).toContainText('80kg');
	});

	test('記録後に同じ種目を選択すると過去MAXヒントが表示される', async ({ page }) => {
		const record = await createRecord(page, {
			exerciseId,
			date: getTodayDate(),
			weight: 75,
			reps: 8
		});
		recordIds.push(record.id);

		await page.goto('/workout');
		await page.getByTestId('workout-form-exercise-select').selectOption(exerciseId);

		await expect(page.getByTestId('workout-form-prev-record-hint')).toContainText('75kg × 8回');
	});

	test('推定1RMが記録一覧に表示される', async ({ page }) => {
		const record = await createRecord(page, {
			exerciseId,
			date: getTodayDate(),
			weight: 100,
			reps: 5
		});
		recordIds.push(record.id);

		await page.goto('/workout');
		// 100 / (1.0278 - 0.0278 * 5) = 112.5 → 112
		await expect(
			page
				.getByTestId('workout-record-item')
				.filter({ hasText: exerciseName })
				.getByTestId('workout-record-estimated-1rm')
		).toContainText('1RM≈112kg');
	});
});

test.describe('筋トレ記録 - 記録削除', () => {
	let exerciseId = '';
	let exerciseName = '';
	let recordId = '';

	test.beforeEach(async ({ page }) => {
		exerciseName = uniqueName('E2E削除用種目');
		const exercise = await createExercise(page, exerciseName);
		exerciseId = exercise.id;
		const record = await createRecord(page, {
			exerciseId,
			date: getTodayDate(),
			weight: 60,
			reps: 10
		});
		recordId = record.id;
	});

	test.afterEach(async ({ page }) => {
		if (recordId) await deleteRecord(page, recordId);
		if (exerciseId) await deleteExercise(page, exerciseId);
		recordId = '';
		exerciseId = '';
	});

	test('確認ダイアログから記録を削除できる', async ({ page }) => {
		await page.goto('/workout');

		const item = page.getByTestId('workout-record-item').filter({ hasText: exerciseName });
		await expect(item).toBeVisible();
		await item.getByTestId('workout-record-delete-button').click();

		await expect(page.getByTestId('workout-record-delete-dialog')).toBeVisible();
		await page.getByTestId('workout-record-delete-confirm-button').click();

		await expect(item).toHaveCount(0);
		recordId = '';
	});
});

test.describe('筋トレ記録 - 体重登録', () => {
	// BodyWeightRecord には削除 API がないため、当日分の登録 → 無効化までを 1 テストで検証し
	// テスト間の実行順序に依存しないようにする（global-setup が実行ごとに DB を初期化する）
	test('体重を登録すると当日分は記録済みとしてフォームが無効化される', async ({ page }) => {
		await page.goto('/workout');

		await page.getByTestId('workout-body-weight-input').fill('70.5');
		await page.getByTestId('workout-body-weight-submit-button').click();

		// 成功後は当日分が記録済みとなり、登録値を表示したままフォームが無効化される
		await expect(page.getByTestId('workout-body-weight-submit-button')).toHaveText('記録済み');
		await expect(page.getByTestId('workout-body-weight-submit-button')).toBeDisabled();
		await expect(page.getByTestId('workout-body-weight-input')).toBeDisabled();
		await expect(page.getByTestId('workout-body-weight-input')).toHaveValue('70.5');

		// 再読み込み（SSR）後も記録済み状態が維持される
		await page.reload();
		await expect(page.getByTestId('workout-body-weight-submit-button')).toBeDisabled();
		await expect(page.getByTestId('workout-body-weight-input')).toHaveValue('70.5');
	});
});

test.describe('筋トレ記録 - グラフ', () => {
	let exerciseId = '';
	let exerciseName = '';
	let recordId = '';

	test.beforeEach(async ({ page }) => {
		exerciseName = uniqueName('E2Eグラフ用種目');
		const exercise = await createExercise(page, exerciseName);
		exerciseId = exercise.id;
		const record = await createRecord(page, {
			exerciseId,
			date: getTodayDate(),
			weight: 90,
			reps: 3
		});
		recordId = record.id;
	});

	test.afterEach(async ({ page }) => {
		if (recordId) await deleteRecord(page, recordId);
		if (exerciseId) await deleteExercise(page, exerciseId);
		recordId = '';
		exerciseId = '';
	});

	test('グラフ種目セレクトに登録した種目が表示される', async ({ page }) => {
		await page.goto('/workout');

		await expect(page.getByTestId('workout-chart-exercise-select')).toBeVisible();
		const options = await page
			.getByTestId('workout-chart-exercise-select')
			.locator('option')
			.allTextContents();
		expect(options).toContain(exerciseName);
	});

	test('グラフ種目を選択すると期間フィルタが表示される', async ({ page }) => {
		await page.goto('/workout');

		await page.getByTestId('workout-chart-exercise-select').selectOption(exerciseId);

		await expect(page.getByTestId('workout-chart-year-select')).toBeVisible();
		await expect(page.getByTestId('workout-chart-month-select')).toBeVisible();
		await expect(page.getByTestId('workout-chart-year-mode')).toBeVisible();
		await expect(page.getByTestId('workout-chart-svg')).toBeVisible();
	});
});

test.describe('筋トレ記録 - フィルタ', () => {
	let exerciseId = '';
	let recordId = '';

	test.beforeEach(async ({ page }) => {
		const exercise = await createExercise(page, uniqueName('E2Eフィルタ用種目'));
		exerciseId = exercise.id;
		const record = await createRecord(page, {
			exerciseId,
			date: getTodayDate(),
			weight: 50,
			reps: 10
		});
		recordId = record.id;
	});

	test.afterEach(async ({ page }) => {
		if (recordId) await deleteRecord(page, recordId);
		if (exerciseId) await deleteExercise(page, exerciseId);
		recordId = '';
		exerciseId = '';
	});

	test('種目フィルタで記録を絞り込める', async ({ page }) => {
		await page.goto('/workout');

		await expect(page.getByTestId('workout-record-list')).toBeVisible();
		await page.getByTestId('workout-filter-exercise-select').selectOption(exerciseId);
		await expect(page).toHaveURL(new RegExp(`exerciseId=${exerciseId}`));
		// フィルタ中は該当種目の記録（50kg × 10回）のみ表示される
		await expect(page.getByTestId('workout-record-item')).toHaveCount(1);
		await expect(page.getByTestId('workout-record-item')).toContainText('50kg');
	});
});

test.describe('筋トレ記録 - 種目カテゴリ管理', () => {
	test('カテゴリを追加できる', async ({ page }) => {
		const categoryName = uniqueName('E2E胸');
		await page.goto('/workout/exercises');

		await page.getByTestId('workout-category-name-input').fill(categoryName);
		await page.getByTestId('workout-category-add-button').click();

		await expect(page.getByTestId('workout-category-list')).toBeVisible();
		await expect(
			page.getByTestId('workout-category-item').filter({ hasText: categoryName })
		).toBeVisible();

		// クリーンアップ
		for (const id of await findCategoryIdsByName(page, categoryName)) {
			await deleteCategory(page, id);
		}
	});

	test('種目追加時にカテゴリを選択でき、種目一覧にカテゴリ名が表示される', async ({ page }) => {
		const categoryName = uniqueName('E2E背中');
		const exerciseName = uniqueName('E2E懸垂');
		const category = await createCategory(page, categoryName);

		await page.goto('/workout/exercises');

		// 種目名とカテゴリ選択
		await page.getByTestId('workout-exercise-name-input').fill(exerciseName);
		await page.getByTestId('workout-exercise-category-select').selectOption(category.id);
		await page.getByTestId('workout-exercise-add-button').click();

		// 追加した種目の行にカテゴリ名が表示される
		const item = page.getByTestId('workout-exercise-item').filter({ hasText: exerciseName });
		await expect(item).toBeVisible();
		await expect(item.getByTestId('workout-exercise-category-name')).toHaveText(categoryName);

		// クリーンアップ
		for (const id of await findExerciseIdsByName(page, exerciseName)) {
			await deleteExercise(page, id);
		}
		await deleteCategory(page, category.id);
	});

	test('カテゴリを削除すると種目のカテゴリ名が消える', async ({ page }) => {
		const categoryName = uniqueName('E2E肩');
		const exerciseName = uniqueName('E2Eショルダープレス');
		const category = await createCategory(page, categoryName);
		const exercise = await createExercise(page, exerciseName, category.id);

		await page.goto('/workout/exercises');

		const exItem = page.getByTestId('workout-exercise-item').filter({ hasText: exerciseName });
		await expect(exItem.getByTestId('workout-exercise-category-name')).toHaveText(categoryName);

		// カテゴリ削除
		const catItem = page.getByTestId('workout-category-item').filter({ hasText: categoryName });
		await catItem.getByTestId('workout-category-delete-button').click();
		await expect(page.getByTestId('workout-category-delete-dialog')).toBeVisible();
		await page.getByTestId('workout-category-delete-confirm-button').click();

		// カテゴリが消える
		await expect(catItem).not.toBeVisible();

		// 種目は残り、カテゴリ名だけが消える
		await expect(exItem).toBeVisible();
		await expect(exItem.getByTestId('workout-exercise-category-name')).not.toBeVisible();

		// クリーンアップ
		await deleteExercise(page, exercise.id);
	});
});
