/**
 * @file テスト: 種目管理画面
 * @module src/routes/workout/exercises/page.svelte.test.ts
 * @testType unit
 *
 * @target ./+page.svelte
 */
import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import WorkoutExercisesRoute from './+page.svelte';
import type { PageData } from './$types';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost/workout/exercises') }
}));

const createdAt = new Date('2026-09-01T00:00:00Z');

/** +page.server.ts の load 戻り値（+ layout の userRole）と同じ形のフィクスチャ */
function makeData(
	exercises: PageData['exercises']['items'] = [],
	categories: PageData['categories'] = []
): PageData {
	return {
		userRole: 'main',
		exercises: { items: exercises, total: exercises.length, page: 1, limit: exercises.length },
		categories
	};
}

describe('+page.svelte（種目管理）', () => {
	test('load の種目・カテゴリ一覧で、種目名とカテゴリ名を表示できる', async () => {
		await render(WorkoutExercisesRoute, {
			data: makeData(
				[
					{
						id: 'ex-1',
						userId: 'user-1',
						name: 'ベンチプレス',
						categoryId: 'wc-1',
						category: { id: 'wc-1', name: '胸' },
						createdAt
					}
				],
				[{ id: 'wc-1', userId: 'user-1', name: '胸', createdAt }]
			)
		});

		await expect.element(page.getByRole('heading', { name: '種目管理', level: 1 })).toBeVisible();
		await expect
			.element(page.getByTestId('workout-exercise-item'))
			.toHaveTextContent('ベンチプレス');
		await expect
			.element(page.getByTestId('workout-exercise-category-name'))
			.toHaveTextContent('胸');
		await expect.element(page.getByTestId('workout-category-item')).toHaveTextContent('胸');
	});

	test('種目・カテゴリが未登録の場合、種目の空状態メッセージが表示されカテゴリ一覧は表示されない', async () => {
		await render(WorkoutExercisesRoute, { data: makeData() });
		await expect
			.element(page.getByText('種目がありません。上のフォームから追加してください。'))
			.toBeVisible();
		await expect.element(page.getByTestId('workout-category-list')).not.toBeInTheDocument();
		await expect
			.element(page.getByTestId('workout-exercise-category-select'))
			.not.toBeInTheDocument();
	});
});
