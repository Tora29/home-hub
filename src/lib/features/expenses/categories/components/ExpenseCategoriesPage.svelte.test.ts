/**
 * @file テスト: 支出カテゴリ管理画面
 * @module src/lib/features/expenses/categories/components/ExpenseCategoriesPage.svelte.test.ts
 * @testType unit
 *
 * @target ./ExpenseCategoriesPage.svelte
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { flushSync } from 'svelte';
import { invalidateAll } from '$app/navigation';
import ExpenseCategoriesPage from './ExpenseCategoriesPage.svelte';
import type { Category } from '../../types';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

const items: Category[] = [
	{ id: 'cat-1', name: '食費', createdAt: '2024-06-01T00:00:00.000Z' },
	{ id: 'cat-2', name: '日用品', createdAt: '2024-06-02T00:00:00.000Z' }
];

const fetchMock = vi.fn();

beforeEach(() => {
	fetchMock.mockReset();
	vi.mocked(invalidateAll).mockReset();
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

function setInputValue(el: HTMLInputElement, value: string) {
	el.value = value;
	el.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

function click(el: Element) {
	(el as HTMLElement).click();
	flushSync();
}

function pressKey(el: Element, key: string) {
	el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
	flushSync();
}

const newNameInput = () => page.getByTestId('expense-category-name-input');
const addButton = () => page.getByRole('button', { name: '追加' });
const categoryItems = () => page.getByTestId('expense-category-item');

async function renderPage(categories: Category[] = items) {
	await render(ExpenseCategoriesPage, { categories: { items: categories } });
}

function startEditFirst() {
	click(categoryItems().first().getByRole('button', { name: '編集' }).element());
	return categoryItems().first().getByRole('textbox');
}

describe('ExpenseCategoriesPage', () => {
	test('カテゴリ一覧を表示できる', async () => {
		await renderPage();
		expect(categoryItems().all()).toHaveLength(2);
		await expect.element(categoryItems().nth(0)).toHaveTextContent('食費');
		await expect.element(categoryItems().nth(1)).toHaveTextContent('日用品');
	});

	test('カテゴリがない場合、空状態メッセージが表示される', async () => {
		await renderPage([]);
		await expect.element(page.getByText(/カテゴリがありません/)).toBeVisible();
		await expect.element(page.getByTestId('expense-category-list')).not.toBeInTheDocument();
	});

	test('カテゴリ名が空の場合、「カテゴリ名は必須です」が表示され送信されない', async () => {
		await renderPage();
		setInputValue(newNameInput().element() as HTMLInputElement, '   ');
		click(addButton().element());
		await expect
			.element(page.getByTestId('expense-category-name-error'))
			.toHaveTextContent('カテゴリ名は必須です');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('カテゴリ名が51文字の場合、「50文字以内で入力してください」が表示され送信されない', async () => {
		await renderPage();
		// maxlength 属性はプログラムからの代入を制限しないため、FE バリデーションの検証に使える
		setInputValue(newNameInput().element() as HTMLInputElement, 'あ'.repeat(51));
		click(addButton().element());
		await expect
			.element(page.getByTestId('expense-category-name-error'))
			.toHaveTextContent('50文字以内で入力してください');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('正しい名前でカテゴリを追加でき、入力がクリアされ一覧が再取得される', async () => {
		fetchMock.mockResolvedValue(jsonResponse({ id: 'cat-3', name: '交通費' }, 201));
		await renderPage();
		setInputValue(newNameInput().element() as HTMLInputElement, '  交通費 ');
		click(addButton().element());
		await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('/expenses/categories');
		expect(init.method).toBe('POST');
		expect(JSON.parse(init.body as string)).toEqual({ name: '交通費' });
		await expect.element(newNameInput()).toHaveValue('');
	});

	test('Enter キーでカテゴリを追加できる', async () => {
		fetchMock.mockResolvedValue(jsonResponse({ id: 'cat-3', name: '交通費' }, 201));
		await renderPage();
		const input = newNameInput().element() as HTMLInputElement;
		setInputValue(input, '交通費');
		pressKey(input, 'Enter');
		await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	test('追加で重複エラーが返った場合、API のメッセージが表示され入力が保持される', async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({ code: 'CONFLICT', message: '同じ名前のカテゴリが既に存在します' }, 409)
		);
		await renderPage();
		setInputValue(newNameInput().element() as HTMLInputElement, '食費');
		click(addButton().element());
		await expect
			.element(page.getByTestId('expense-category-name-error'))
			.toHaveTextContent('同じ名前のカテゴリが既に存在します');
		await expect.element(newNameInput()).toHaveValue('食費');
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	test('追加で通信エラーの場合、「通信エラーが発生しました」が表示される', async () => {
		fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
		await renderPage();
		setInputValue(newNameInput().element() as HTMLInputElement, '交通費');
		click(addButton().element());
		await expect
			.element(page.getByTestId('expense-category-name-error'))
			.toHaveTextContent('通信エラーが発生しました');
		await expect.element(addButton()).toBeEnabled();
	});

	test('追加中の場合、追加ボタンが無効になる', async () => {
		let resolveFetch!: (res: Response) => void;
		fetchMock.mockReturnValue(new Promise<Response>((r) => (resolveFetch = r)));
		await renderPage();
		setInputValue(newNameInput().element() as HTMLInputElement, '交通費');
		click(addButton().element());
		await expect.element(addButton()).toBeDisabled();
		resolveFetch(jsonResponse({ id: 'cat-3' }, 201));
		await expect.element(addButton()).toBeEnabled();
	});

	test('編集ボタンで現在の名前が入った編集欄を表示でき、キャンセルで元に戻せる', async () => {
		await renderPage();
		const editInput = startEditFirst();
		await expect.element(editInput).toHaveValue('食費');
		click(categoryItems().first().getByRole('button', { name: 'キャンセル' }).element());
		await expect.element(editInput).not.toBeInTheDocument();
		await expect.element(categoryItems().first()).toHaveTextContent('食費');
	});

	test('編集中に Escape キーで編集をキャンセルできる', async () => {
		await renderPage();
		const editInput = startEditFirst();
		setInputValue(editInput.element() as HTMLInputElement, '変更途中');
		pressKey(editInput.element(), 'Escape');
		await expect.element(editInput).not.toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('編集中に Enter キーで PUT /expenses/categories/{id} に保存できる', async () => {
		fetchMock.mockResolvedValue(jsonResponse({ id: 'cat-1', name: '食料品' }, 200));
		await renderPage();
		const editInput = startEditFirst();
		setInputValue(editInput.element() as HTMLInputElement, ' 食料品 ');
		pressKey(editInput.element(), 'Enter');
		await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('/expenses/categories/cat-1');
		expect(init.method).toBe('PUT');
		expect(JSON.parse(init.body as string)).toEqual({ name: '食料品' });
		await expect.element(editInput).not.toBeInTheDocument();
	});

	test('保存中に Enter キーを連打した場合、リクエストは 1 回しか送信されない', async () => {
		let resolveFetch!: (res: Response) => void;
		fetchMock.mockReturnValue(new Promise<Response>((r) => (resolveFetch = r)));
		await renderPage();
		const editInput = startEditFirst();
		setInputValue(editInput.element() as HTMLInputElement, '食料品');
		pressKey(editInput.element(), 'Enter');
		await expect
			.element(categoryItems().first().getByRole('button', { name: '保存' }))
			.toBeDisabled();
		pressKey(editInput.element(), 'Enter');
		pressKey(editInput.element(), 'Enter');
		expect(fetchMock).toHaveBeenCalledTimes(1);
		resolveFetch(jsonResponse({ id: 'cat-1', name: '食料品' }, 200));
		await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
	});

	test('編集で名前を空にした場合、「カテゴリ名は必須です」が表示され送信されない', async () => {
		await renderPage();
		const editInput = startEditFirst();
		setInputValue(editInput.element() as HTMLInputElement, '');
		click(categoryItems().first().getByRole('button', { name: '保存' }).element());
		await expect.element(categoryItems().first()).toHaveTextContent('カテゴリ名は必須です');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('編集の保存でエラーが返った場合、API のメッセージが表示され編集欄が残る', async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({ code: 'CONFLICT', message: '同じ名前のカテゴリが既に存在します' }, 409)
		);
		await renderPage();
		const editInput = startEditFirst();
		setInputValue(editInput.element() as HTMLInputElement, '日用品');
		click(categoryItems().first().getByRole('button', { name: '保存' }).element());
		await expect
			.element(categoryItems().first())
			.toHaveTextContent('同じ名前のカテゴリが既に存在します');
		await expect.element(editInput).toHaveValue('日用品');
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	test('削除ボタンで対象カテゴリ名入りの確認ダイアログを表示できる', async () => {
		await renderPage();
		click(categoryItems().nth(1).getByRole('button', { name: '削除' }).element());
		await expect
			.element(page.getByRole('alertdialog', { name: 'カテゴリを削除しますか？' }))
			.toBeVisible();
		await expect
			.element(page.getByText('「日用品」を削除します。', { exact: false }))
			.toBeVisible();
	});

	test('削除確認で DELETE /expenses/categories/{id} を送信しダイアログが閉じる', async () => {
		fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
		await renderPage();
		click(categoryItems().nth(1).getByRole('button', { name: '削除' }).element());
		click(page.getByTestId('expense-category-delete-confirm-button').element());
		await vi.waitFor(() => expect(invalidateAll).toHaveBeenCalledTimes(1));
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('/expenses/categories/cat-2');
		expect(init.method).toBe('DELETE');
		await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
	});

	test('使用中のカテゴリを削除しようとした場合、CONFLICT のメッセージがダイアログ内に表示される', async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({ code: 'CONFLICT', message: 'このカテゴリは使用中のため削除できません' }, 409)
		);
		await renderPage();
		click(categoryItems().first().getByRole('button', { name: '削除' }).element());
		click(page.getByTestId('expense-category-delete-confirm-button').element());
		await expect
			.element(page.getByRole('alertdialog').getByRole('alert'))
			.toHaveTextContent('このカテゴリは使用中のため削除できません');
		expect(invalidateAll).not.toHaveBeenCalled();
	});

	test('削除エラー後にキャンセルして開き直した場合、前回のエラーが表示されない', async () => {
		fetchMock.mockResolvedValue(jsonResponse({ code: 'CONFLICT', message: '削除できません' }, 409));
		await renderPage();
		click(categoryItems().first().getByRole('button', { name: '削除' }).element());
		click(page.getByTestId('expense-category-delete-confirm-button').element());
		await expect.element(page.getByRole('alert')).toBeVisible();
		click(page.getByTestId('expense-category-delete-cancel-button').element());
		await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
		click(categoryItems().first().getByRole('button', { name: '削除' }).element());
		await expect.element(page.getByRole('alertdialog')).toBeVisible();
		await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
