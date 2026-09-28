/**
 * @file テスト: CategoryManagementCard
 * @module src/lib/features/workout/exercises/components/CategoryManagementCard.svelte.test.ts
 * @testType unit
 *
 * @target ./CategoryManagementCard.svelte
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, type Locator } from 'vitest/browser';
import { flushSync } from 'svelte';
import { invalidateAll } from '$app/navigation';
import CategoryManagementCard from './CategoryManagementCard.svelte';
import type { ExerciseCategory } from '../types';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

const createdAt = new Date('2026-09-01T00:00:00Z');

const categories: ExerciseCategory[] = [
	{ id: 'wc-1', userId: 'user-1', name: '胸', createdAt },
	{ id: 'wc-2', userId: 'user-1', name: '脚', createdAt }
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

async function renderCard(cats: ExerciseCategory[] = categories) {
	await render(CategoryManagementCard, { categories: cats });
}

function fill(locator: Locator, value: string) {
	const el = locator.element() as HTMLInputElement;
	el.value = value;
	el.dispatchEvent(new Event('input', { bubbles: true }));
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

const nameInput = () => page.getByTestId('workout-category-name-input');
const addButton = () => page.getByRole('button', { name: '追加' });
const editInput = () => page.getByTestId('workout-category-edit-input');
const item = (i: number) => page.getByTestId('workout-category-item').nth(i);

describe('CategoryManagementCard', () => {
	describe('一覧表示', () => {
		test('登録済みカテゴリ名を一覧表示できる', async () => {
			await renderCard();
			await expect.element(page.getByRole('heading', { name: 'カテゴリ管理' })).toBeVisible();
			expect(page.getByTestId('workout-category-item').elements()).toHaveLength(2);
			await expect.element(item(0)).toHaveTextContent('胸');
			await expect.element(item(1)).toHaveTextContent('脚');
		});

		test('カテゴリが 0 件の場合、一覧は表示されず追加フォームのみ表示される', async () => {
			await renderCard([]);
			await expect.element(nameInput()).toBeVisible();
			await expect.element(page.getByTestId('workout-category-list')).not.toBeInTheDocument();
		});
	});

	describe('追加', () => {
		test('カテゴリ名が空（空白のみ）の場合、「カテゴリ名は必須です」が表示され送信されない', async () => {
			await renderCard();
			fill(nameInput(), '   ');
			click(addButton());
			await expect.element(page.getByRole('alert')).toHaveTextContent('カテゴリ名は必須です');
			expect(fetchMock).not.toHaveBeenCalled();
		});

		test('カテゴリ名が31文字の場合、「30文字以内で入力してください」が表示され送信されない', async () => {
			await renderCard();
			fill(nameInput(), 'あ'.repeat(31));
			click(addButton());
			await expect
				.element(page.getByRole('alert'))
				.toHaveTextContent('30文字以内で入力してください');
			expect(fetchMock).not.toHaveBeenCalled();
		});

		test('カテゴリ名が30文字の場合、登録できる', async () => {
			fetchMock.mockResolvedValue(jsonResponse({}, 201));
			await renderCard();
			fill(nameInput(), 'あ'.repeat(30));
			click(addButton());
			await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
			expect(lastBody()).toEqual({ name: 'あ'.repeat(30) });
		});

		test('正しいカテゴリ名で追加した場合、前後の空白を除いて POST し、成功後に入力をクリアして再取得できる', async () => {
			fetchMock.mockResolvedValue(jsonResponse({}, 201));
			await renderCard();
			fill(nameInput(), '  背中  ');
			click(addButton());
			await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
			const { url, init } = lastRequest();
			expect(url).toBe('/workout/exercises/categories');
			expect(init.method).toBe('POST');
			expect(lastBody()).toEqual({ name: '背中' });
			await expect.element(nameInput()).toHaveValue('');
		});

		test('カテゴリ名入力中に Enter キーを押した場合、追加できる', async () => {
			fetchMock.mockResolvedValue(jsonResponse({}, 201));
			await renderCard();
			fill(nameInput(), '肩');
			pressKey(nameInput(), 'Enter');
			await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
			expect(lastBody()).toEqual({ name: '肩' });
		});

		test('送信中の場合、追加ボタンが無効になり Enter を連打しても二重送信されない', async () => {
			let resolve!: (res: Response) => void;
			fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
			await renderCard();
			fill(nameInput(), '肩');
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
				jsonResponse({ code: 'CONFLICT', message: '同じ名前のカテゴリが既に存在します' }, 409)
			);
			await renderCard();
			fill(nameInput(), '胸');
			click(addButton());
			await expect
				.element(page.getByRole('alert'))
				.toHaveTextContent('同じ名前のカテゴリが既に存在します');
			await expect.element(nameInput()).toHaveValue('胸');
			expect(invalidateAll).not.toHaveBeenCalled();
		});

		test('JSON 以外のエラーレスポンスの場合、「操作に失敗しました」が表示される', async () => {
			fetchMock.mockResolvedValue(new Response('<html>502</html>', { status: 502 }));
			await renderCard();
			fill(nameInput(), '肩');
			click(addButton());
			await expect.element(page.getByRole('alert')).toHaveTextContent('操作に失敗しました');
		});

		test('通信エラーの場合、「通信エラーが発生しました」が表示される', async () => {
			fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
			await renderCard();
			fill(nameInput(), '肩');
			click(addButton());
			await expect.element(page.getByRole('alert')).toHaveTextContent('通信エラーが発生しました');
			await expect.element(addButton()).toBeEnabled();
		});
	});

	describe('編集', () => {
		test('編集ボタンを押した場合、現在のカテゴリ名が入った編集フォームに切り替わる', async () => {
			await renderCard();
			click(item(1).getByRole('button', { name: '編集' }));
			await expect.element(editInput()).toHaveValue('脚');
			await expect.element(item(0).getByRole('button', { name: '編集' })).toBeVisible();
		});

		test('名前を変更して保存した場合、name の完全置換で PUT し編集を終了して再取得できる', async () => {
			fetchMock.mockResolvedValue(jsonResponse({}, 200));
			await renderCard();
			click(item(0).getByRole('button', { name: '編集' }));
			fill(editInput(), ' 大胸筋 ');
			click(page.getByRole('button', { name: '保存' }));
			await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
			const { url, init } = lastRequest();
			expect(url).toBe('/workout/exercises/categories/wc-1');
			expect(init.method).toBe('PUT');
			expect(lastBody()).toEqual({ name: '大胸筋' });
			await expect.element(editInput()).not.toBeInTheDocument();
		});

		test('編集中に Enter キーを押した場合、保存できる', async () => {
			fetchMock.mockResolvedValue(jsonResponse({}, 200));
			await renderCard();
			click(item(1).getByRole('button', { name: '編集' }));
			fill(editInput(), '下半身');
			pressKey(editInput(), 'Enter');
			await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
			expect(lastRequest().url).toBe('/workout/exercises/categories/wc-2');
			expect(lastBody()).toEqual({ name: '下半身' });
		});

		test('保存中の場合、保存ボタンが無効になり Enter を連打しても二重送信されない', async () => {
			let resolve!: (res: Response) => void;
			fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
			await renderCard();
			click(item(0).getByRole('button', { name: '編集' }));
			pressKey(editInput(), 'Enter');
			await expect.element(page.getByRole('button', { name: '保存' })).toBeDisabled();
			pressKey(editInput(), 'Enter');
			pressKey(editInput(), 'Enter');
			expect(fetchMock).toHaveBeenCalledTimes(1);
			resolve(jsonResponse({}, 200));
			await expect.element(editInput()).not.toBeInTheDocument();
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});

		test('編集中のカテゴリ名が空の場合、「カテゴリ名は必須です」が表示され送信されない', async () => {
			await renderCard();
			click(item(0).getByRole('button', { name: '編集' }));
			fill(editInput(), '');
			click(page.getByRole('button', { name: '保存' }));
			await expect.element(item(0).getByRole('alert')).toHaveTextContent('カテゴリ名は必須です');
			expect(fetchMock).not.toHaveBeenCalled();
		});

		test('編集中のカテゴリ名が31文字の場合、「30文字以内で入力してください」が表示され送信されない', async () => {
			await renderCard();
			click(item(0).getByRole('button', { name: '編集' }));
			fill(editInput(), 'あ'.repeat(31));
			click(page.getByRole('button', { name: '保存' }));
			await expect
				.element(item(0).getByRole('alert'))
				.toHaveTextContent('30文字以内で入力してください');
			expect(fetchMock).not.toHaveBeenCalled();
		});

		test('保存に失敗した場合、エラーメッセージが表示され編集状態が維持される', async () => {
			fetchMock.mockResolvedValue(
				jsonResponse({ code: 'CONFLICT', message: '同じ名前のカテゴリが既に存在します' }, 409)
			);
			await renderCard();
			click(item(0).getByRole('button', { name: '編集' }));
			fill(editInput(), '脚');
			click(page.getByRole('button', { name: '保存' }));
			await expect
				.element(item(0).getByRole('alert'))
				.toHaveTextContent('同じ名前のカテゴリが既に存在します');
			await expect.element(editInput()).toBeVisible();
			expect(invalidateAll).not.toHaveBeenCalled();
		});

		test('キャンセルボタンまたは Escape キーで、送信せずに編集を取り消せる', async () => {
			await renderCard();
			click(item(0).getByRole('button', { name: '編集' }));
			fill(editInput(), '変更途中');
			click(page.getByRole('button', { name: 'キャンセル' }));
			await expect.element(editInput()).not.toBeInTheDocument();
			await expect.element(item(0)).toHaveTextContent('胸');

			click(item(1).getByRole('button', { name: '編集' }));
			pressKey(editInput(), 'Escape');
			await expect.element(editInput()).not.toBeInTheDocument();
			expect(fetchMock).not.toHaveBeenCalled();
		});
	});

	describe('削除', () => {
		test('削除ボタンを押した場合、対象カテゴリ名と種目への影響を示す確認ダイアログが表示される', async () => {
			await renderCard();
			click(item(0).getByRole('button', { name: '削除' }));
			const dialog = page.getByRole('alertdialog', { name: 'カテゴリを削除しますか？' });
			await expect.element(dialog).toBeVisible();
			await expect
				.element(dialog.getByText('「胸」を削除します。紐付く種目のカテゴリは未設定になります。'))
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
			expect(url).toBe('/workout/exercises/categories/wc-2');
			expect(init.method).toBe('DELETE');
			await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
		});

		test('削除に失敗した場合、ダイアログ内にエラーメッセージが表示されダイアログは閉じない', async () => {
			fetchMock.mockResolvedValue(
				jsonResponse({ code: 'NOT_FOUND', message: '該当データが見つかりません' }, 404)
			);
			await renderCard();
			click(item(0).getByRole('button', { name: '削除' }));
			click(page.getByRole('button', { name: '削除する' }));
			const dialog = page.getByRole('alertdialog');
			await expect
				.element(dialog.getByRole('alert'))
				.toHaveTextContent('該当データが見つかりません');
			await expect.element(dialog).toBeVisible();
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
				.element(dialog.getByText('「脚」を削除します。紐付く種目のカテゴリは未設定になります。'))
				.toBeVisible();
			await expect.element(dialog.getByRole('alert')).not.toBeInTheDocument();
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});
	});
});
