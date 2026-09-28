/**
 * @file テスト: ExerciseListCard
 * @module src/lib/features/workout/exercises/components/ExerciseListCard.svelte.test.ts
 * @testType unit
 *
 * @target ./ExerciseListCard.svelte
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, type Locator } from 'vitest/browser';
import { flushSync } from 'svelte';
import { invalidateAll } from '$app/navigation';
import ExerciseListCard from './ExerciseListCard.svelte';
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

const exerciseItems: ExerciseWithCategory[] = [
	{
		id: 'ex-1',
		userId: 'user-1',
		name: 'ベンチプレス',
		categoryId: 'wc-1',
		category: { id: 'wc-1', name: '胸' },
		createdAt
	},
	{
		id: 'ex-2',
		userId: 'user-1',
		name: 'プランク',
		categoryId: null,
		category: null,
		createdAt
	}
];

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
	fetchMock.mockReset();
	vi.mocked(invalidateAll).mockReset();
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

async function renderCard(
	items: ExerciseWithCategory[] = exerciseItems,
	cats: ExerciseCategory[] = categories
) {
	await render(ExerciseListCard, { exercises: { items }, categories: cats });
}

function fill(locator: Locator, value: string) {
	const el = locator.element() as HTMLInputElement;
	el.value = value;
	el.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

function choose(locator: Locator, value: string) {
	const el = locator.element() as HTMLSelectElement;
	el.value = value;
	el.dispatchEvent(new Event('change', { bubbles: true }));
	flushSync();
}

function click(locator: Locator) {
	(locator.element() as HTMLElement).click();
	flushSync();
}

function pressKey(locator: Locator, key: string) {
	locator.element().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
	flushSync();
}

function lastRequest(): { url: string; init: RequestInit } {
	const [url, init] = fetchMock.mock.lastCall!;
	return { url: String(url), init: init! };
}

function lastBody(): unknown {
	return JSON.parse(String(lastRequest().init.body));
}

const nameInput = () => page.getByTestId('workout-exercise-name-input');
const addButton = () => page.getByRole('button', { name: '追加' });
const item = (i: number) => page.getByTestId('workout-exercise-item').nth(i);

describe('ExerciseListCard', () => {
	describe('一覧表示', () => {
		test('種目名と、カテゴリがある種目にはカテゴリ名を表示できる', async () => {
			await renderCard();
			await expect.element(item(0)).toHaveTextContent('ベンチプレス');
			await expect
				.element(item(0).getByTestId('workout-exercise-category-name'))
				.toHaveTextContent('胸');
			await expect.element(item(1)).toHaveTextContent('プランク');
			await expect
				.element(item(1).getByTestId('workout-exercise-category-name'))
				.not.toBeInTheDocument();
		});

		test('種目が 0 件の場合、空状態メッセージが表示され一覧は表示されない', async () => {
			await renderCard([]);
			await expect
				.element(page.getByText('種目がありません。上のフォームから追加してください。'))
				.toBeVisible();
			await expect.element(page.getByTestId('workout-exercise-list')).not.toBeInTheDocument();
		});

		test('カテゴリが 0 件の場合、カテゴリ選択は表示されない', async () => {
			await renderCard(exerciseItems, []);
			await expect.element(nameInput()).toBeVisible();
			await expect
				.element(page.getByTestId('workout-exercise-category-select'))
				.not.toBeInTheDocument();
		});
	});

	describe('追加', () => {
		test('種目名が空（空白のみ）の場合、「種目名は必須です」が表示され送信されない', async () => {
			await renderCard();
			fill(nameInput(), '   ');
			click(addButton());
			await expect
				.element(page.getByTestId('workout-exercise-name-error'))
				.toHaveTextContent('種目名は必須です');
			expect(fetchMock).not.toHaveBeenCalled();
		});

		test('種目名が51文字の場合、「50文字以内で入力してください」が表示され送信されない', async () => {
			await renderCard();
			fill(nameInput(), 'あ'.repeat(51));
			click(addButton());
			await expect
				.element(page.getByTestId('workout-exercise-name-error'))
				.toHaveTextContent('50文字以内で入力してください');
			expect(fetchMock).not.toHaveBeenCalled();
		});

		test('種目名が50文字の場合、登録できる', async () => {
			fetchMock.mockResolvedValue(jsonResponse({}, 201));
			await renderCard();
			fill(nameInput(), 'あ'.repeat(50));
			click(addButton());
			await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
			expect(lastBody()).toEqual({ name: 'あ'.repeat(50), categoryId: null });
		});

		test('カテゴリ未選択の場合、categoryId: null を含めて POST し、成功後に入力をクリアして再取得できる', async () => {
			fetchMock.mockResolvedValue(jsonResponse({}, 201));
			await renderCard();
			fill(nameInput(), '  スクワット  ');
			click(addButton());
			await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
			const { url, init } = lastRequest();
			expect(url).toBe('/workout/exercises');
			expect(init.method).toBe('POST');
			expect(lastBody()).toEqual({ name: 'スクワット', categoryId: null });
			await expect.element(nameInput()).toHaveValue('');
			await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
		});

		test('カテゴリを選択した場合、選択した categoryId を含めて POST し、成功後に選択をリセットできる', async () => {
			fetchMock.mockResolvedValue(jsonResponse({}, 201));
			await renderCard();
			fill(nameInput(), 'スクワット');
			choose(page.getByTestId('workout-exercise-category-select'), 'wc-2');
			click(addButton());
			await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
			expect(lastBody()).toEqual({ name: 'スクワット', categoryId: 'wc-2' });
			await expect.element(page.getByTestId('workout-exercise-category-select')).toHaveValue('');
		});

		test('種目名入力中に Enter キーを押した場合、追加できる', async () => {
			fetchMock.mockResolvedValue(jsonResponse({}, 201));
			await renderCard();
			fill(nameInput(), 'デッドリフト');
			pressKey(nameInput(), 'Enter');
			await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
			expect(lastBody()).toEqual({ name: 'デッドリフト', categoryId: null });
		});

		test('送信中の場合、追加ボタンが無効になり Enter を連打しても二重送信されない', async () => {
			let resolve!: (res: Response) => void;
			fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
			await renderCard();
			fill(nameInput(), 'デッドリフト');
			pressKey(nameInput(), 'Enter');
			await expect.element(addButton()).toBeDisabled();
			pressKey(nameInput(), 'Enter');
			click(addButton());
			expect(fetchMock).toHaveBeenCalledTimes(1);
			resolve(jsonResponse({}, 201));
			await expect.element(addButton()).toBeEnabled();
		});

		test('サーバーがエラーを返した場合、エラーメッセージが表示され入力は保持され再取得されない', async () => {
			fetchMock.mockResolvedValue(
				jsonResponse({ code: 'CONFLICT', message: '同じ名前の種目が既に存在します' }, 409)
			);
			await renderCard();
			fill(nameInput(), 'ベンチプレス');
			click(addButton());
			await expect
				.element(page.getByTestId('workout-exercise-name-error'))
				.toHaveTextContent('同じ名前の種目が既に存在します');
			await expect.element(nameInput()).toHaveValue('ベンチプレス');
			await expect.element(addButton()).toBeEnabled();
			expect(invalidateAll).not.toHaveBeenCalled();
		});

		test('JSON 以外のエラーレスポンスの場合、「操作に失敗しました」が表示される', async () => {
			fetchMock.mockResolvedValue(new Response('<html>502</html>', { status: 502 }));
			await renderCard();
			fill(nameInput(), 'スクワット');
			click(addButton());
			await expect
				.element(page.getByTestId('workout-exercise-name-error'))
				.toHaveTextContent('操作に失敗しました');
			expect(invalidateAll).not.toHaveBeenCalled();
		});

		test('通信エラーの場合、「通信エラーが発生しました」が表示される', async () => {
			fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
			await renderCard();
			fill(nameInput(), 'スクワット');
			click(addButton());
			await expect
				.element(page.getByTestId('workout-exercise-name-error'))
				.toHaveTextContent('通信エラーが発生しました');
			await expect.element(addButton()).toBeEnabled();
		});

		test('エラー表示後に再送信した場合、前回のエラーはクリアされる', async () => {
			fetchMock.mockResolvedValue(jsonResponse({}, 201));
			await renderCard();
			click(addButton());
			await expect.element(page.getByTestId('workout-exercise-name-error')).toBeVisible();
			fill(nameInput(), 'スクワット');
			click(addButton());
			await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
			await expect.element(page.getByTestId('workout-exercise-name-error')).not.toBeInTheDocument();
		});
	});

	describe('編集', () => {
		test('編集ボタンを押した場合、現在の種目名とカテゴリが入った編集フォームに切り替わる', async () => {
			await renderCard();
			click(item(0).getByRole('button', { name: '編集' }));
			await expect
				.element(page.getByTestId('workout-exercise-edit-input'))
				.toHaveValue('ベンチプレス');
			await expect
				.element(page.getByTestId('workout-exercise-edit-category-select'))
				.toHaveValue('wc-1');
			// 編集していない種目は通常表示のまま
			await expect.element(item(1).getByRole('button', { name: '編集' })).toBeVisible();
		});

		test('名前とカテゴリを変更して保存した場合、name + categoryId の完全置換で PUT し編集を終了できる', async () => {
			fetchMock.mockResolvedValue(jsonResponse({}, 200));
			await renderCard();
			click(item(0).getByRole('button', { name: '編集' }));
			fill(page.getByTestId('workout-exercise-edit-input'), ' インクラインベンチ ');
			choose(page.getByTestId('workout-exercise-edit-category-select'), 'wc-2');
			click(page.getByRole('button', { name: '保存' }));
			await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
			const { url, init } = lastRequest();
			expect(url).toBe('/workout/exercises/ex-1');
			expect(init.method).toBe('PUT');
			expect(lastBody()).toEqual({ name: 'インクラインベンチ', categoryId: 'wc-2' });
			await expect.element(page.getByTestId('workout-exercise-edit-input')).not.toBeInTheDocument();
		});

		test('名前だけ変更した場合も、現在のカテゴリを含めて PUT できる', async () => {
			fetchMock.mockResolvedValue(jsonResponse({}, 200));
			await renderCard();
			click(item(0).getByRole('button', { name: '編集' }));
			fill(page.getByTestId('workout-exercise-edit-input'), 'ベンチ');
			click(page.getByRole('button', { name: '保存' }));
			await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
			expect(lastBody()).toEqual({ name: 'ベンチ', categoryId: 'wc-1' });
		});

		test('カテゴリなしの種目、またはカテゴリを外した場合、categoryId: null で PUT できる', async () => {
			fetchMock.mockResolvedValue(jsonResponse({}, 200));
			await renderCard();
			click(item(1).getByRole('button', { name: '編集' }));
			await expect
				.element(page.getByTestId('workout-exercise-edit-category-select'))
				.toHaveValue('');
			pressKey(page.getByTestId('workout-exercise-edit-input'), 'Enter');
			await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
			expect(lastRequest().url).toBe('/workout/exercises/ex-2');
			expect(lastBody()).toEqual({ name: 'プランク', categoryId: null });

			click(item(0).getByRole('button', { name: '編集' }));
			choose(page.getByTestId('workout-exercise-edit-category-select'), '');
			pressKey(page.getByTestId('workout-exercise-edit-input'), 'Enter');
			await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(2));
			expect(lastBody()).toEqual({ name: 'ベンチプレス', categoryId: null });
		});

		test('保存中の場合、保存ボタンが無効になり Enter を連打しても二重送信されない', async () => {
			let resolve!: (res: Response) => void;
			fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
			await renderCard();
			click(item(0).getByRole('button', { name: '編集' }));
			const input = page.getByTestId('workout-exercise-edit-input');
			pressKey(input, 'Enter');
			await expect.element(page.getByRole('button', { name: '保存' })).toBeDisabled();
			pressKey(input, 'Enter');
			pressKey(input, 'Enter');
			expect(fetchMock).toHaveBeenCalledTimes(1);
			resolve(jsonResponse({}, 200));
			await expect.element(input).not.toBeInTheDocument();
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});

		test('編集中の種目名が空の場合、「種目名は必須です」が表示され送信されない', async () => {
			await renderCard();
			click(item(0).getByRole('button', { name: '編集' }));
			fill(page.getByTestId('workout-exercise-edit-input'), '');
			click(page.getByRole('button', { name: '保存' }));
			await expect.element(item(0).getByRole('alert')).toHaveTextContent('種目名は必須です');
			expect(fetchMock).not.toHaveBeenCalled();
		});

		test('編集中の種目名が51文字の場合、「50文字以内で入力してください」が表示され送信されない', async () => {
			await renderCard();
			click(item(0).getByRole('button', { name: '編集' }));
			fill(page.getByTestId('workout-exercise-edit-input'), 'あ'.repeat(51));
			click(page.getByRole('button', { name: '保存' }));
			await expect
				.element(item(0).getByRole('alert'))
				.toHaveTextContent('50文字以内で入力してください');
			expect(fetchMock).not.toHaveBeenCalled();
		});

		test('保存に失敗した場合、エラーメッセージが表示され編集状態が維持される', async () => {
			fetchMock.mockResolvedValue(
				jsonResponse({ code: 'NOT_FOUND', message: '該当データが見つかりません' }, 404)
			);
			await renderCard();
			click(item(0).getByRole('button', { name: '編集' }));
			click(page.getByRole('button', { name: '保存' }));
			await expect
				.element(item(0).getByRole('alert'))
				.toHaveTextContent('該当データが見つかりません');
			await expect.element(page.getByTestId('workout-exercise-edit-input')).toBeVisible();
			expect(invalidateAll).not.toHaveBeenCalled();
		});

		test('キャンセルボタンまたは Escape キーで、送信せずに編集を取り消せる', async () => {
			await renderCard();
			click(item(0).getByRole('button', { name: '編集' }));
			fill(page.getByTestId('workout-exercise-edit-input'), '変更途中');
			click(page.getByRole('button', { name: 'キャンセル' }));
			await expect.element(page.getByTestId('workout-exercise-edit-input')).not.toBeInTheDocument();
			await expect.element(item(0)).toHaveTextContent('ベンチプレス');

			click(item(1).getByRole('button', { name: '編集' }));
			pressKey(page.getByTestId('workout-exercise-edit-input'), 'Escape');
			await expect.element(page.getByTestId('workout-exercise-edit-input')).not.toBeInTheDocument();
			expect(fetchMock).not.toHaveBeenCalled();
		});
	});

	describe('削除', () => {
		test('削除ボタンを押した場合、対象の種目名を含む確認ダイアログが表示される', async () => {
			await renderCard();
			click(item(0).getByRole('button', { name: '削除' }));
			const dialog = page.getByRole('alertdialog', { name: '種目を削除しますか？' });
			await expect.element(dialog).toBeVisible();
			await expect
				.element(dialog.getByText('「ベンチプレス」を削除します。この操作は元に戻せません。'))
				.toBeVisible();
			expect(fetchMock).not.toHaveBeenCalled();
		});

		test('確認ダイアログで「削除する」を押した場合、DELETE を送信しダイアログを閉じて再取得できる', async () => {
			fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
			await renderCard();
			click(item(1).getByRole('button', { name: '削除' }));
			click(page.getByRole('button', { name: '削除する' }));
			await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
			const { url, init } = lastRequest();
			expect(url).toBe('/workout/exercises/ex-2');
			expect(init.method).toBe('DELETE');
			await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
		});

		test('削除に失敗した場合、ダイアログ内にエラーメッセージが表示されダイアログは閉じない', async () => {
			fetchMock.mockResolvedValue(
				jsonResponse(
					{ code: 'CONFLICT', message: 'この種目は記録で使用中のため削除できません' },
					409
				)
			);
			await renderCard();
			click(item(0).getByRole('button', { name: '削除' }));
			click(page.getByRole('button', { name: '削除する' }));
			const dialog = page.getByRole('alertdialog');
			await expect
				.element(dialog.getByRole('alert'))
				.toHaveTextContent('この種目は記録で使用中のため削除できません');
			await expect.element(dialog).toBeVisible();
			await expect.element(page.getByRole('button', { name: '削除する' })).toBeEnabled();
			expect(invalidateAll).not.toHaveBeenCalled();
		});

		test('削除で通信エラーの場合、「通信エラーが発生しました」が表示される', async () => {
			fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
			await renderCard();
			click(item(0).getByRole('button', { name: '削除' }));
			click(page.getByRole('button', { name: '削除する' }));
			await expect
				.element(page.getByRole('alertdialog').getByRole('alert'))
				.toHaveTextContent('通信エラーが発生しました');
		});

		test('削除処理中の場合、確認・キャンセルボタンが無効になる', async () => {
			let resolve!: (res: Response) => void;
			fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
			await renderCard();
			click(item(0).getByRole('button', { name: '削除' }));
			click(page.getByRole('button', { name: '削除する' }));
			await expect.element(page.getByRole('button', { name: '削除する' })).toBeDisabled();
			await expect.element(page.getByRole('button', { name: 'キャンセル' })).toBeDisabled();
			resolve(new Response(null, { status: 204 }));
			await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});

		test('キャンセルした場合、送信せずにダイアログを閉じ、再度開いたとき前回のエラーは残らない', async () => {
			fetchMock.mockResolvedValue(jsonResponse({ message: '削除できません' }, 409));
			await renderCard();
			click(item(0).getByRole('button', { name: '削除' }));
			click(page.getByRole('button', { name: '削除する' }));
			await expect.element(page.getByRole('alertdialog').getByRole('alert')).toBeVisible();
			click(page.getByRole('button', { name: 'キャンセル' }));
			await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();

			click(item(1).getByRole('button', { name: '削除' }));
			const dialog = page.getByRole('alertdialog');
			await expect
				.element(dialog.getByText('「プランク」を削除します。この操作は元に戻せません。'))
				.toBeVisible();
			await expect.element(dialog.getByRole('alert')).not.toBeInTheDocument();
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});
	});
});
