/**
 * @file テスト: RecordForm
 * @module src/lib/features/workout/components/RecordForm.svelte.test.ts
 * @testType unit
 *
 * @target ./RecordForm.svelte
 */
import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { flushSync } from 'svelte';
import RecordFormWrapper from './RecordForm.test-wrapper.svelte';
import type { Exercise } from '../types';

const exercises: { items: Exercise[] } = {
	items: [
		{ id: 'ex-1', name: 'ベンチプレス', category: { id: 'wc-1', name: '胸' } },
		{ id: 'ex-2', name: '懸垂', category: null }
	]
};

function click(locator: ReturnType<typeof page.getByRole>): void {
	(locator.element() as HTMLElement).click();
}

function changeValue(testId: string, value: string, eventType: 'input' | 'change'): void {
	const el = page.getByTestId(testId).element() as HTMLInputElement | HTMLSelectElement;
	el.value = value;
	el.dispatchEvent(new Event(eventType, { bubbles: true }));
	flushSync();
}

describe('RecordForm', () => {
	test('種目が未登録の場合、種目管理への案内が表示されフォームは表示されない', async () => {
		await render(RecordFormWrapper, { exercises: { items: [] } });

		await expect.element(page.getByRole('link', { name: '種目管理' })).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: '種目管理' }))
			.toHaveAttribute('href', '/workout/exercises');
		await expect.element(page.getByRole('button', { name: '追加' })).not.toBeInTheDocument();
	});

	test('種目・重量・回数を入力すると親の状態に反映される', async () => {
		await render(RecordFormWrapper, { exercises });

		changeValue('workout-form-exercise-select', 'ex-2', 'change');
		changeValue('workout-form-weight-input', '62.5', 'input');
		changeValue('workout-form-reps-select', '10', 'change');

		await expect.element(page.getByTestId('parent-exercise-id')).toHaveTextContent('ex-2');
		await expect.element(page.getByTestId('parent-weight')).toHaveTextContent('62.5');
		await expect.element(page.getByTestId('parent-reps')).toHaveTextContent('10');
	});

	test('回数は1〜10回から選択できる', async () => {
		await render(RecordFormWrapper, { exercises });

		const select = page.getByTestId('workout-form-reps-select').element() as HTMLSelectElement;
		expect(Array.from(select.options).map((o) => o.value)).toEqual(
			Array.from({ length: 10 }, (_, i) => String(i + 1))
		);
		await expect.element(page.getByTestId('workout-form-reps-select')).toHaveValue('8');
	});

	test('自重にチェックした場合、重量入力が「自重」表示に替わり入力済みの重量がクリアされる', async () => {
		await render(RecordFormWrapper, { exercises, initialWeight: 60 });

		click(page.getByRole('checkbox', { name: '自重' }));
		flushSync();

		await expect.element(page.getByTestId('workout-form-weight-input')).not.toBeInTheDocument();
		await expect.element(page.getByRole('checkbox', { name: '自重' })).toBeChecked();
		await expect.element(page.getByTestId('parent-is-body-weight')).toHaveTextContent('true');
		await expect.element(page.getByTestId('parent-weight')).toHaveTextContent(/^$/);
	});

	test('自重のチェックを外した場合、重量入力が再表示される', async () => {
		await render(RecordFormWrapper, { exercises, initialIsBodyWeight: true });
		await expect.element(page.getByTestId('workout-form-weight-input')).not.toBeInTheDocument();

		click(page.getByRole('checkbox', { name: '自重' }));
		flushSync();

		await expect.element(page.getByTestId('workout-form-weight-input')).toBeVisible();
		await expect.element(page.getByTestId('parent-is-body-weight')).toHaveTextContent('false');
	});

	test('過去のMAXがある場合、重量と回数のヒントが表示される', async () => {
		await render(RecordFormWrapper, { exercises, bestRecord: { weight: 80, reps: 5 } });

		await expect
			.element(page.getByTestId('workout-form-prev-record-hint'))
			.toHaveTextContent('過去のMAX: 80kg × 5回');
	});

	test('過去のMAXがない場合、ヒントは表示されない', async () => {
		await render(RecordFormWrapper, { exercises, bestRecord: null });

		await expect.element(page.getByTestId('workout-form-add-button')).toBeVisible();
		await expect.element(page.getByTestId('workout-form-prev-record-hint')).not.toBeInTheDocument();
	});

	test('追加ボタンを押すと onSubmit が呼ばれる', async () => {
		const onSubmit = vi.fn();
		await render(RecordFormWrapper, { exercises, onSubmit });

		click(page.getByRole('button', { name: '追加' }));
		flushSync();

		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	test('送信中の場合、追加ボタンが「追加中...」で無効化される', async () => {
		await render(RecordFormWrapper, { exercises, loading: true });

		await expect.element(page.getByRole('button', { name: '追加中...' })).toBeDisabled();
	});

	test('エラーがある場合、エラーメッセージが表示される', async () => {
		await render(RecordFormWrapper, { exercises, error: '種目を選択してください' });

		await expect.element(page.getByRole('alert')).toHaveTextContent('種目を選択してください');
	});

	test('入力欄とセレクトはアクセシブルな名前で特定できる', async () => {
		await render(RecordFormWrapper, { exercises });

		await expect.element(page.getByLabelText('記録日')).toBeVisible();
		await expect.element(page.getByRole('combobox', { name: '種目' })).toBeVisible();
		await expect.element(page.getByRole('spinbutton', { name: '重量 (kg)' })).toBeVisible();
		await expect.element(page.getByRole('combobox', { name: '回数' })).toBeVisible();
	});
});
