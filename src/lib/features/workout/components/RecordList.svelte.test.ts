/**
 * @file テスト: RecordList
 * @module src/lib/features/workout/components/RecordList.svelte.test.ts
 * @testType unit
 *
 * @target ./RecordList.svelte
 */
import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { createRawSnippet, flushSync } from 'svelte';
import RecordList from './RecordList.svelte';
import type { WorkoutRecord } from '../types';

const exerciseOptions = createRawSnippet(() => ({
	render: () => '<option value="ex-1">ベンチプレス</option>'
}));

function makeRecord(overrides: Partial<WorkoutRecord> = {}): WorkoutRecord {
	return {
		id: 'rec-1',
		userId: 'user-1',
		exerciseId: 'ex-1',
		exerciseName: 'ベンチプレス',
		date: '2026-09-27',
		weight: 60,
		reps: 8,
		isBodyWeight: false,
		createdAt: new Date('2026-09-27T00:00:00Z'),
		...overrides
	};
}

function renderList(
	records: WorkoutRecord[],
	overrides: Partial<{
		filterExerciseId: string | null;
		onFilterChange: (e: Event) => void;
		onDeleteRequest: (record: WorkoutRecord) => void;
	}> = {}
) {
	return render(RecordList, {
		records,
		filterExerciseId: null,
		exerciseOptions,
		onFilterChange: () => {},
		onDeleteRequest: () => {},
		...overrides
	});
}

function click(locator: ReturnType<typeof page.getByRole>): void {
	(locator.element() as HTMLElement).click();
}

describe('RecordList', () => {
	test('記録がない場合、空状態メッセージが表示される', async () => {
		await renderList([]);

		await expect.element(page.getByText('記録がありません')).toBeVisible();
		await expect.element(page.getByTestId('workout-record-list')).not.toBeInTheDocument();
	});

	test('記録がある場合、種目名・重量・回数・推定1RMが表示される', async () => {
		await renderList([makeRecord({ weight: 60, reps: 8 })]);

		const item = page.getByTestId('workout-record-item');
		await expect.element(item).toHaveTextContent('ベンチプレス');
		await expect.element(item).toHaveTextContent('60kg');
		await expect.element(item).toHaveTextContent('×8回');
		// Epley 系の式: floor(60 / (1.0278 - 0.0278 * 8)) = 74
		await expect
			.element(page.getByTestId('workout-record-estimated-1rm'))
			.toHaveTextContent('1RM≈74kg');
	});

	test('1回の記録の場合、推定1RMは重量そのものになる', async () => {
		await renderList([makeRecord({ weight: 100, reps: 1 })]);

		await expect
			.element(page.getByTestId('workout-record-estimated-1rm'))
			.toHaveTextContent('1RM≈100kg');
	});

	test('自重の記録の場合、自重バッジが表示される', async () => {
		await renderList([makeRecord({ isBodyWeight: true, weight: 0, exerciseName: '懸垂' })]);

		await expect.element(page.getByTestId('workout-record-item')).toHaveTextContent('自重');
	});

	test('種目フィルタ中の場合、行に種目名が表示されない', async () => {
		await renderList([makeRecord()], { filterExerciseId: 'ex-1' });

		await expect.element(page.getByTestId('workout-filter-exercise-select')).toHaveValue('ex-1');
		await expect
			.element(page.getByTestId('workout-record-item'))
			.not.toHaveTextContent('ベンチプレス');
	});

	test('種目フィルタを変更すると onFilterChange が呼ばれる', async () => {
		const onFilterChange = vi.fn();
		await renderList([makeRecord()], { onFilterChange });

		const select = page
			.getByTestId('workout-filter-exercise-select')
			.element() as HTMLSelectElement;
		select.value = 'ex-1';
		select.dispatchEvent(new Event('change', { bubbles: true }));
		flushSync();

		expect(onFilterChange).toHaveBeenCalledTimes(1);
		expect((onFilterChange.mock.calls[0][0] as Event).target).toBe(select);
	});

	test('削除ボタンを押すと対象の記録で onDeleteRequest が呼ばれる', async () => {
		const onDeleteRequest = vi.fn();
		const target = makeRecord({ id: 'rec-2', weight: 70 });
		await renderList([makeRecord(), target], { onDeleteRequest });

		const buttons = page.getByRole('button', { name: '削除' });
		(buttons.nth(1).element() as HTMLElement).click();
		flushSync();

		expect(onDeleteRequest).toHaveBeenCalledWith(target);
	});

	test('複数日の記録がある場合、最新1日分のみ表示し「もっと見る」で全日分を展開・折りたたみできる', async () => {
		await renderList([
			makeRecord({ id: 'r1', date: '2026-09-27' }),
			makeRecord({ id: 'r2', date: '2026-09-26' }),
			makeRecord({ id: 'r3', date: '2026-09-25' })
		]);

		await expect.element(page.getByText('2026-09-27', { exact: true })).toBeVisible();
		await expect.element(page.getByText('2026-09-26', { exact: true })).not.toBeInTheDocument();

		click(page.getByRole('button', { name: 'もっと見る（残り 2 日分）▼' }));
		flushSync();
		await expect.element(page.getByText('2026-09-25', { exact: true })).toBeVisible();
		expect(page.getByTestId('workout-record-item').elements()).toHaveLength(3);

		click(page.getByRole('button', { name: '折りたたむ ▲' }));
		flushSync();
		await expect.element(page.getByText('2026-09-26', { exact: true })).not.toBeInTheDocument();
	});

	test('同じ日の記録が4件以上ある場合、3件のみ表示し「残り件数」で展開・折りたたみできる', async () => {
		await renderList(
			Array.from({ length: 5 }, (_, i) => makeRecord({ id: `r${i}`, weight: 50 + i }))
		);

		expect(page.getByTestId('workout-record-item').elements()).toHaveLength(3);

		click(page.getByRole('button', { name: '残り 2 件 ▼' }));
		flushSync();
		expect(page.getByTestId('workout-record-item').elements()).toHaveLength(5);

		click(page.getByRole('button', { name: '折りたたむ ▲' }));
		flushSync();
		expect(page.getByTestId('workout-record-item').elements()).toHaveLength(3);
	});

	test('同じ日の記録が3件以下の場合、展開ボタンは表示されない', async () => {
		await renderList(Array.from({ length: 3 }, (_, i) => makeRecord({ id: `r${i}` })));

		expect(page.getByTestId('workout-record-item').elements()).toHaveLength(3);
		await expect.element(page.getByRole('button', { name: /残り/ })).not.toBeInTheDocument();
	});
});
