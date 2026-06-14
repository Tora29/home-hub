/**
 * @file E2Eテスト: 筋トレ記録
 * @module e2e/workout.e2e.ts
 * @testType e2e
 *
 * @scenarios
 * - 初期表示: 筋トレ記録ページが表示される
 * - 種目管理: 種目を追加・編集・削除できる
 * - 種目カテゴリ管理: カテゴリを追加・種目に設定・削除できる
 * - 記録登録: 記録フォームから登録でき、前回ヒントが表示される
 * - 記録削除: 確認ダイアログから記録を削除できる
 * - 体重登録: 体重フォームから登録できる
 * - グラフ: 記録後にグラフ種目セレクトが表示される
 *
 * @pages
 * - /workout - 記録一覧・登録
 * - /workout/exercises - 種目管理
 */
import { test, expect, type Page } from '@playwright/test';

async function createExercise(page: Page, name: string): Promise<{ id: string }> {
	const res = await page.request.post('/workout/exercises', {
		data: { name },
		headers: { 'Content-Type': 'application/json' }
	});
	expect(res.ok()).toBeTruthy();
	return res.json();
}

async function deleteExercise(page: Page, id: string): Promise<void> {
	await page.request.delete(`/workout/exercises/${id}`);
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
		await expect(page.getByRole('heading', { name: '筋トレ記録' })).toBeVisible();
		await expect(page.getByTestId('workout-form-date')).toBeVisible();
		await expect(page.getByTestId('workout-form-exercise-select')).toBeVisible();
		await expect(page.getByTestId('workout-form-weight-input')).toBeVisible();
		await expect(page.getByTestId('workout-form-reps-select')).toBeVisible();
		await expect(page.getByTestId('workout-form-add-button')).toBeVisible();
	});

	test('種目管理リンクが表示される', async ({ page }) => {
		await expect(page.getByRole('link', { name: '種目管理' })).toBeVisible();
	});

	test('記録リストが表示される', async ({ page }) => {
		await expect(page.getByTestId('workout-record-list')).toBeVisible();
	});
});

test.describe('筋トレ記録 - 種目管理', () => {
	test('種目を追加できる', async ({ page }) => {
		await page.goto('/workout/exercises');

		await page.getByTestId('workout-exercise-name-input').fill('ベンチプレス');
		await page.getByTestId('workout-exercise-add-button').click();

		await expect(page.getByTestId('workout-exercise-list')).toBeVisible();
		await expect(
			page.getByTestId('workout-exercise-item').filter({ hasText: 'ベンチプレス' })
		).toBeVisible();

		// クリーンアップ
		const exercise = await page.request.get('/workout/exercises');
		const exercisesData = await exercise.json();
		for (const ex of exercisesData.items as { id: string; name: string }[]) {
			if (ex.name === 'ベンチプレス') {
				await deleteExercise(page, ex.id);
			}
		}
	});

	test('種目名が空のとき追加ボタンを押してもエラーが表示される', async ({ page }) => {
		await page.goto('/workout/exercises');

		await page.getByTestId('workout-exercise-add-button').click();
		await expect(page.getByText('種目名は必須です')).toBeVisible();
	});

	test('種目を編集できる', async ({ page }) => {
		const exercise = await createExercise(page, 'E2E編集テスト種目');
		await page.goto('/workout/exercises');

		const item = page.getByTestId('workout-exercise-item').filter({ hasText: 'E2E編集テスト種目' });
		await item.getByTestId('workout-exercise-edit-button').click();

		const editInput = page.getByTestId('workout-exercise-edit-input');
		await editInput.fill('E2E編集済み種目');
		await page.getByRole('button', { name: '保存' }).click();

		await expect(
			page.getByTestId('workout-exercise-item').filter({ hasText: 'E2E編集済み種目' })
		).toBeVisible();

		// クリーンアップ
		await deleteExercise(page, exercise.id);
	});

	test('種目を削除できる', async ({ page }) => {
		await createExercise(page, 'E2E削除テスト種目');
		await page.goto('/workout/exercises');

		const item = page.getByTestId('workout-exercise-item').filter({ hasText: 'E2E削除テスト種目' });
		await item.getByTestId('workout-exercise-delete-button').click();

		await expect(page.getByTestId('workout-exercise-delete-dialog')).toBeVisible();
		await page.getByTestId('workout-exercise-delete-confirm-button').click();

		await expect(
			page.getByTestId('workout-exercise-item').filter({ hasText: 'E2E削除テスト種目' })
		).not.toBeVisible();
	});
});

test.describe('筋トレ記録 - 記録登録・前回ヒント', () => {
	let exerciseId = '';

	test.beforeEach(async ({ page }) => {
		const exercise = await createExercise(page, 'E2Eスクワット');
		exerciseId = exercise.id;
	});

	test.afterEach(async ({ page }) => {
		if (exerciseId) {
			const res = await page.request.get(`/workout?exerciseId=${exerciseId}`);
			if (res.ok()) {
				// API で直接記録を取得してクリーンアップ
				await page.request.get('/workout/exercises');
				// サービス経由でexerciseを削除（workoutRecord が残っていると CONFLICT）
				// 先に記録を削除するため workout API で取得
			}
			// exercise ごと削除は CONFLICT になるため記録を先に削除
			// Integration では seed がないため直接 API で record を削除
			await deleteExercise(page, exerciseId).catch(() => {
				/* 記録が残っている場合はスキップ */
			});
			exerciseId = '';
		}
	});

	test('種目を選択して記録を登録できる', async ({ page }) => {
		await page.goto('/workout');

		await page.getByTestId('workout-form-exercise-select').selectOption(exerciseId);
		await page.getByTestId('workout-form-weight-input').fill('80');
		await page.getByTestId('workout-form-reps-select').selectOption('5');
		await page.getByTestId('workout-form-add-button').click();

		await expect(page.getByTestId('workout-record-list')).toBeVisible();
		await expect(page.getByTestId('workout-record-item').first()).toBeVisible();
	});

	test('記録後に同じ種目を選択すると前回ヒントが表示される', async ({ page }) => {
		const today = new Date();
		const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
		const record = await createRecord(page, {
			exerciseId,
			date: dateStr,
			weight: 75,
			reps: 8
		});

		await page.goto('/workout');
		await page.getByTestId('workout-form-exercise-select').selectOption(exerciseId);

		await expect(page.getByTestId('workout-form-prev-record-hint')).toBeVisible();
		await expect(page.getByTestId('workout-form-prev-record-hint')).toContainText('75');

		// クリーンアップ
		await deleteRecord(page, record.id);
	});

	test('推定1RMが記録一覧に表示される', async ({ page }) => {
		const today = new Date();
		const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
		const record = await createRecord(page, {
			exerciseId,
			date: dateStr,
			weight: 100,
			reps: 5
		});

		await page.goto('/workout');
		await expect(page.getByTestId('workout-record-estimated-1rm').first()).toBeVisible();

		// クリーンアップ
		await deleteRecord(page, record.id);
	});
});

test.describe('筋トレ記録 - 記録削除', () => {
	let exerciseId = '';
	let recordId = '';

	test.beforeEach(async ({ page }) => {
		const exercise = await createExercise(page, 'E2E削除用種目');
		exerciseId = exercise.id;
		const today = new Date();
		const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
		const record = await createRecord(page, {
			exerciseId,
			date: dateStr,
			weight: 60,
			reps: 10
		});
		recordId = record.id;
	});

	test.afterEach(async ({ page }) => {
		if (recordId) await deleteRecord(page, recordId).catch(() => {});
		if (exerciseId) await deleteExercise(page, exerciseId).catch(() => {});
		recordId = '';
		exerciseId = '';
	});

	test('確認ダイアログから記録を削除できる', async ({ page }) => {
		await page.goto('/workout');

		await expect(page.getByTestId('workout-record-list')).toBeVisible();
		await page.getByTestId('workout-record-delete-button').first().click();

		await expect(page.getByRole('alertdialog')).toBeVisible();
		const countBefore = await page.getByTestId('workout-record-item').count();
		await page.getByRole('button', { name: '削除する' }).click();

		await expect(page.getByTestId('workout-record-item')).toHaveCount(countBefore - 1);
		recordId = '';
	});
});

test.describe('筋トレ記録 - 体重登録', () => {
	test('体重を登録できる', async ({ page }) => {
		await page.goto('/workout');

		await page.getByTestId('workout-body-weight-input').fill('70.5');
		await page.getByTestId('workout-body-weight-submit-button').click();

		// 成功後に入力欄がクリアされる
		await expect(page.getByTestId('workout-body-weight-input')).toHaveValue('');
	});

	test('体重が空のとき登録するとエラーが表示される', async ({ page }) => {
		await page.goto('/workout');

		await page.getByTestId('workout-body-weight-submit-button').click();
		await expect(page.getByText('体重を入力してください')).toBeVisible();
	});
});

test.describe('筋トレ記録 - グラフ', () => {
	let exerciseId = '';
	let recordId = '';

	test.beforeEach(async ({ page }) => {
		const exercise = await createExercise(page, 'E2Eグラフ用種目');
		exerciseId = exercise.id;
		const today = new Date();
		const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
		const record = await createRecord(page, {
			exerciseId,
			date: dateStr,
			weight: 90,
			reps: 3
		});
		recordId = record.id;
	});

	test.afterEach(async ({ page }) => {
		if (recordId) await deleteRecord(page, recordId).catch(() => {});
		if (exerciseId) await deleteExercise(page, exerciseId).catch(() => {});
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
		expect(options).toContain('E2Eグラフ用種目');
	});

	test('グラフ種目を選択すると期間フィルタが表示される', async ({ page }) => {
		await page.goto('/workout');

		await page.getByTestId('workout-chart-exercise-select').selectOption(exerciseId);

		await expect(page.getByTestId('workout-chart-year-select')).toBeVisible();
		await expect(page.getByTestId('workout-chart-month-select')).toBeVisible();
		await expect(page.getByTestId('workout-chart-year-mode')).toBeVisible();
		await expect(page.getByTestId('workout-chart-all-mode')).toBeVisible();
	});
});

test.describe('筋トレ記録 - フィルタ', () => {
	let exerciseId = '';
	let recordId = '';

	test.beforeEach(async ({ page }) => {
		const exercise = await createExercise(page, 'E2Eフィルタ用種目');
		exerciseId = exercise.id;
		const today = new Date();
		const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
		const record = await createRecord(page, {
			exerciseId,
			date: dateStr,
			weight: 50,
			reps: 10
		});
		recordId = record.id;
	});

	test.afterEach(async ({ page }) => {
		if (recordId) await deleteRecord(page, recordId).catch(() => {});
		if (exerciseId) await deleteExercise(page, exerciseId).catch(() => {});
		recordId = '';
		exerciseId = '';
	});

	test('種目フィルタで記録を絞り込める', async ({ page }) => {
		await page.goto('/workout');

		await expect(page.getByTestId('workout-record-list')).toBeVisible();
		await page.getByTestId('workout-filter-exercise-select').selectOption(exerciseId);
		await expect(page).toHaveURL(new RegExp(`exerciseId=${exerciseId}`));
		await expect(page.getByTestId('workout-record-item').first()).toBeVisible();
	});
});

test.describe('筋トレ記録 - 種目カテゴリ管理', () => {
	async function deleteCategory(page: Page, id: string): Promise<void> {
		await page.request.delete(`/workout/exercises/categories/${id}`);
	}

	test('カテゴリを追加できる', async ({ page }) => {
		await page.goto('/workout/exercises');

		await page.getByTestId('workout-category-name-input').fill('胸');
		await page.getByTestId('workout-category-add-button').click();

		await expect(page.getByTestId('workout-category-list')).toBeVisible();
		await expect(page.getByTestId('workout-category-item').filter({ hasText: '胸' })).toBeVisible();

		// クリーンアップ
		const res = await page.request.get('/workout/exercises/categories');
		const categories = await res.json();
		for (const cat of categories as { id: string; name: string }[]) {
			if (cat.name === '胸') await deleteCategory(page, cat.id);
		}
	});

	test('種目追加時にカテゴリを選択でき、種目一覧にカテゴリ名が表示される', async ({ page }) => {
		// カテゴリを API で作成
		const catRes = await page.request.post('/workout/exercises/categories', {
			data: { name: '背中' },
			headers: { 'Content-Type': 'application/json' }
		});
		const category = await catRes.json();

		await page.goto('/workout/exercises');

		// 種目名とカテゴリ選択
		await page.getByTestId('workout-exercise-name-input').fill('懸垂');
		await page.getByTestId('workout-exercise-category-select').selectOption(category.id);
		await page.getByTestId('workout-exercise-add-button').click();

		// 種目一覧にカテゴリ名が表示される
		await expect(
			page.getByTestId('workout-exercise-item').filter({ hasText: '懸垂' })
		).toBeVisible();
		await expect(
			page.getByTestId('workout-exercise-item').filter({ hasText: '背中' })
		).toBeVisible();

		// クリーンアップ
		const exercisesRes = await page.request.get('/workout/exercises');
		const exercises = await exercisesRes.json();
		for (const ex of exercises.items as { id: string; name: string }[]) {
			if (ex.name === '懸垂') await deleteExercise(page, ex.id);
		}
		await deleteCategory(page, category.id);
	});

	test('カテゴリを削除すると種目のカテゴリ名が消える', async ({ page }) => {
		// カテゴリと種目を API で作成
		const catRes = await page.request.post('/workout/exercises/categories', {
			data: { name: '肩' },
			headers: { 'Content-Type': 'application/json' }
		});
		const category = await catRes.json();
		const exRes = await page.request.post('/workout/exercises', {
			data: { name: 'ショルダープレス', categoryId: category.id },
			headers: { 'Content-Type': 'application/json' }
		});
		const exercise = await exRes.json();

		await page.goto('/workout/exercises');

		// カテゴリ削除
		const catItem = page.getByTestId('workout-category-item').filter({ hasText: '肩' });
		await catItem.getByTestId('workout-category-delete-button').click();
		await expect(page.getByTestId('workout-category-delete-dialog')).toBeVisible();
		await page.getByTestId('workout-category-delete-confirm-button').click();

		// カテゴリが消える
		await expect(
			page.getByTestId('workout-category-item').filter({ hasText: '肩' })
		).not.toBeVisible();

		// 種目のカテゴリ名も消える
		const exItem = page
			.getByTestId('workout-exercise-item')
			.filter({ hasText: 'ショルダープレス' })
			.first();
		await expect(exItem).toBeVisible();
		await expect(exItem.getByText('肩')).not.toBeVisible();

		// クリーンアップ
		await deleteExercise(page, exercise.id).catch(() => {});
	});
});
