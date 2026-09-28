/**
 * @file テスト: WorkoutExercisesPage
 * @module src/lib/features/workout/exercises/components/WorkoutExercisesPage.svelte.test.ts
 * @testType unit
 *
 * @target ./WorkoutExercisesPage.svelte
 */
import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import WorkoutExercisesPage from './WorkoutExercisesPage.svelte';
import type { ExerciseCategory, ExerciseWithCategory } from '../types';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

const createdAt = new Date('2026-09-01T00:00:00Z');

const categories: ExerciseCategory[] = [
	{ id: 'wc-1', userId: 'user-1', name: '胸', createdAt },
	{ id: 'wc-2', userId: 'user-1', name: '脚', createdAt }
];

const items: ExerciseWithCategory[] = [
	{
		id: 'ex-1',
		userId: 'user-1',
		name: 'ベンチプレス',
		categoryId: 'wc-1',
		category: { id: 'wc-1', name: '胸' },
		createdAt
	}
];

describe('WorkoutExercisesPage', () => {
	test('見出し「種目管理」と筋トレ記録画面（/workout）へ戻るリンクを表示できる', async () => {
		await render(WorkoutExercisesPage, { exercises: { items }, categories });
		await expect.element(page.getByRole('heading', { name: '種目管理', level: 1 })).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: '筋トレ記録に戻る' }))
			.toHaveAttribute('href', '/workout');
	});

	test('カテゴリ管理カードと種目カードに、受け取ったカテゴリ・種目を表示できる', async () => {
		await render(WorkoutExercisesPage, { exercises: { items }, categories });
		await expect.element(page.getByRole('heading', { name: 'カテゴリ管理' })).toBeVisible();
		await expect.element(page.getByRole('heading', { name: '新しい種目を追加' })).toBeVisible();
		expect(page.getByTestId('workout-category-item').elements()).toHaveLength(2);
		await expect
			.element(page.getByTestId('workout-exercise-item'))
			.toHaveTextContent('ベンチプレス');
		// カテゴリ一覧が種目追加フォームのカテゴリ選択肢にも渡る
		const options = Array.from(
			(page.getByTestId('workout-exercise-category-select').element() as HTMLSelectElement).options
		).map((o) => o.textContent?.trim());
		expect(options).toEqual(['カテゴリなし', '胸', '脚']);
	});

	test('種目・カテゴリが未登録の場合、種目の空状態メッセージが表示される', async () => {
		await render(WorkoutExercisesPage, { exercises: { items: [] }, categories: [] });
		await expect
			.element(page.getByText('種目がありません。上のフォームから追加してください。'))
			.toBeVisible();
		await expect.element(page.getByTestId('workout-category-list')).not.toBeInTheDocument();
		await expect.element(page.getByTestId('workout-category-name-input')).toBeVisible();
		await expect.element(page.getByTestId('workout-exercise-name-input')).toBeVisible();
	});
});
