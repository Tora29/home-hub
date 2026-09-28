/**
 * @file テスト: 支出登録・編集フォーム
 * @module src/lib/features/expenses/components/ExpenseForm.svelte.test.ts
 * @testType unit
 *
 * @target ./ExpenseForm.svelte
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { flushSync } from 'svelte';
import ExpenseForm from './ExpenseForm.svelte';
import type { Category, ExpenseWithRelations, User } from '../types';

const categories: Category[] = [
	{ id: 'cat-1', name: '食費', createdAt: '2024-06-01T00:00:00.000Z' },
	{ id: 'cat-2', name: '日用品', createdAt: '2024-06-01T00:00:00.000Z' }
];

const users: User[] = [
	{ id: 'user-1', name: '夫', email: 'a@example.com' },
	{ id: 'user-2', name: '妻', email: 'b@example.com' }
];

const expense: ExpenseWithRelations = {
	id: 'exp-1',
	userId: 'user-1',
	amount: 12345,
	categoryId: 'cat-2',
	payerUserId: 'user-2',
	status: 'unapproved',
	createdAt: '2024-06-10T00:00:00.000Z',
	category: categories[1],
	payer: users[1]
};

const fetchMock = vi.fn();

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

function makeProps(overrides: Record<string, unknown> = {}) {
	return {
		mode: 'create' as const,
		categories,
		users,
		onSuccess: vi.fn(),
		onCancel: vi.fn(),
		...overrides
	};
}

const amountInput = () => page.getByRole('textbox', { name: /金額/ });
const categorySelect = () => page.getByRole('combobox', { name: /カテゴリ/ });
const payerSelect = () => page.getByRole('combobox', { name: /支払者/ });
const submitButton = () => page.getByRole('button', { name: '確定' });

function typeAmount(value: string) {
	const el = amountInput().element() as HTMLInputElement;
	el.value = value;
	el.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

function selectValue(el: HTMLSelectElement, value: string) {
	el.value = value;
	el.dispatchEvent(new Event('change', { bubbles: true }));
	flushSync();
}

function fillValidForm() {
	typeAmount('3000');
	selectValue(categorySelect().element() as HTMLSelectElement, 'cat-1');
	selectValue(payerSelect().element() as HTMLSelectElement, 'user-1');
}

function submit() {
	(submitButton().element() as HTMLElement).click();
	flushSync();
}

function jsonResponse(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

describe('ExpenseForm', () => {
	test('新規モードで空の入力欄と登録タイトルを表示できる', async () => {
		await render(ExpenseForm, makeProps());
		await expect.element(page.getByRole('heading', { name: '支出を登録' })).toBeVisible();
		await expect.element(amountInput()).toHaveValue('');
		await expect.element(categorySelect()).toHaveValue('');
		await expect.element(payerSelect()).toHaveValue('');
	});

	test('編集モードで既存の支出を初期値として表示できる', async () => {
		await render(ExpenseForm, makeProps({ mode: 'edit', expense }));
		await expect.element(page.getByRole('heading', { name: '支出を編集' })).toBeVisible();
		await expect.element(amountInput()).toHaveValue('12,345');
		await expect.element(categorySelect()).toHaveValue('cat-2');
		await expect.element(payerSelect()).toHaveValue('user-2');
	});

	test('全角数字・カンマ入りの金額を半角のカンマ区切りに整形して入力できる', async () => {
		await render(ExpenseForm, makeProps());
		typeAmount('１２，３４５円');
		await expect.element(amountInput()).toHaveValue('12,345');
	});

	test('未入力で送信した場合、各フィールドに必須エラーが表示され fetch されない', async () => {
		await render(ExpenseForm, makeProps());
		submit();
		await expect
			.element(page.getByTestId('expense-amount-error'))
			.toHaveTextContent('金額は必須です');
		await expect
			.element(page.getByTestId('expense-category-error'))
			.toHaveTextContent('カテゴリは必須です');
		await expect
			.element(page.getByTestId('expense-payer-error'))
			.toHaveTextContent('支払者は必須です');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('金額が0円の場合、「1円以上の金額を入力してください」が表示される', async () => {
		await render(ExpenseForm, makeProps());
		fillValidForm();
		typeAmount('0');
		submit();
		await expect
			.element(page.getByTestId('expense-amount-error'))
			.toHaveTextContent('1円以上の金額を入力してください');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('金額が10,000,000円の場合、「9,999,999円以下の金額を入力してください」が表示される', async () => {
		await render(ExpenseForm, makeProps());
		fillValidForm();
		typeAmount('10000000');
		submit();
		await expect
			.element(page.getByTestId('expense-amount-error'))
			.toHaveTextContent('9,999,999円以下の金額を入力してください');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('金額を入力し直すと金額エラーが消える', async () => {
		await render(ExpenseForm, makeProps());
		submit();
		await expect.element(page.getByTestId('expense-amount-error')).toBeVisible();
		typeAmount('500');
		await expect.element(page.getByTestId('expense-amount-error')).not.toBeInTheDocument();
	});

	test('新規モードで POST /expenses に入力値を送信し onSuccess を呼び出せる', async () => {
		fetchMock.mockResolvedValue(jsonResponse({ id: 'new' }, 201));
		const props = makeProps();
		await render(ExpenseForm, props);
		fillValidForm();
		submit();
		await vi.waitFor(() => expect(props.onSuccess).toHaveBeenCalledTimes(1));
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('/expenses');
		expect(init.method).toBe('POST');
		expect(JSON.parse(init.body as string)).toEqual({
			amount: 3000,
			categoryId: 'cat-1',
			payerUserId: 'user-1'
		});
	});

	test('編集モードで PUT /expenses/{id} に変更後の値を送信できる', async () => {
		fetchMock.mockResolvedValue(jsonResponse({ id: 'exp-1' }, 200));
		const props = makeProps({ mode: 'edit', expense });
		await render(ExpenseForm, props);
		typeAmount('800');
		submit();
		await vi.waitFor(() => expect(props.onSuccess).toHaveBeenCalledTimes(1));
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('/expenses/exp-1');
		expect(init.method).toBe('PUT');
		expect(JSON.parse(init.body as string)).toEqual({
			amount: 800,
			categoryId: 'cat-2',
			payerUserId: 'user-2'
		});
	});

	test('API がエラーを返した場合、API のメッセージが表示され onSuccess は呼ばれない', async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({ code: 'NOT_FOUND', message: '該当データが見つかりません' }, 404)
		);
		const props = makeProps();
		await render(ExpenseForm, props);
		fillValidForm();
		submit();
		await expect.element(page.getByRole('alert')).toHaveTextContent('該当データが見つかりません');
		expect(props.onSuccess).not.toHaveBeenCalled();
	});

	test('API が VALIDATION_ERROR を返した場合、fields のメッセージが各フィールドに表示される', async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(
				{
					code: 'VALIDATION_ERROR',
					message: '入力値が正しくありません',
					fields: [
						{ field: 'amount', message: '金額は整数で入力してください' },
						{ field: 'categoryId', message: 'カテゴリが存在しません' },
						{ field: 'payerUserId', message: '支払者が存在しません' }
					]
				},
				400
			)
		);
		await render(ExpenseForm, makeProps());
		fillValidForm();
		submit();
		await expect
			.element(page.getByTestId('expense-amount-error'))
			.toHaveTextContent('金額は整数で入力してください');
		await expect
			.element(page.getByTestId('expense-category-error'))
			.toHaveTextContent('カテゴリが存在しません');
		await expect
			.element(page.getByTestId('expense-payer-error'))
			.toHaveTextContent('支払者が存在しません');
		await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
	});

	test('JSON 以外のエラーレスポンスの場合、「エラーが発生しました」が表示される', async () => {
		fetchMock.mockResolvedValue(new Response('<html>502 Bad Gateway</html>', { status: 502 }));
		await render(ExpenseForm, makeProps());
		fillValidForm();
		submit();
		await expect.element(page.getByRole('alert')).toHaveTextContent('エラーが発生しました');
	});

	test('通信エラーの場合、「通信エラーが発生しました」が表示される', async () => {
		fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
		const props = makeProps();
		await render(ExpenseForm, props);
		fillValidForm();
		submit();
		await expect.element(page.getByRole('alert')).toHaveTextContent('通信エラーが発生しました');
		await expect.element(submitButton()).toBeEnabled();
		expect(props.onSuccess).not.toHaveBeenCalled();
	});

	test('送信中の場合、確定ボタンが無効になり完了後に有効へ戻る', async () => {
		let resolveFetch!: (res: Response) => void;
		fetchMock.mockReturnValue(new Promise<Response>((r) => (resolveFetch = r)));
		const props = makeProps();
		await render(ExpenseForm, props);
		fillValidForm();
		submit();
		await expect.element(submitButton()).toBeDisabled();
		resolveFetch(jsonResponse({ id: 'new' }, 201));
		await vi.waitFor(() => expect(props.onSuccess).toHaveBeenCalledTimes(1));
		await expect.element(submitButton()).toBeEnabled();
	});

	test('キャンセルボタンで onCancel を呼び出せる', async () => {
		const props = makeProps();
		await render(ExpenseForm, props);
		(page.getByRole('button', { name: 'キャンセル' }).element() as HTMLElement).click();
		flushSync();
		expect(props.onCancel).toHaveBeenCalledTimes(1);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
