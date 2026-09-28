/**
 * @file テスト: 名前付きエンティティ CRUD フォームの共通処理
 * @module src/lib/utils/form-helpers.test.ts
 * @testType unit
 *
 * @target ./form-helpers.ts
 */
import { describe, test, expect, vi } from 'vitest';
import { submitNamedForm, submitDelete } from './form-helpers';

function setup(request: () => Promise<Response>) {
	const errors: string[] = [];
	const loadings: boolean[] = [];
	const onSuccess = vi.fn();
	const req = vi.fn(request);
	return {
		errors,
		loadings,
		onSuccess,
		request: req,
		options: {
			setError: (m: string) => errors.push(m),
			setLoading: (l: boolean) => loadings.push(l),
			request: req,
			onSuccess
		}
	};
}

const named = { maxLength: 5, requiredMessage: '名前は必須です', maxLengthMessage: '5文字以内' };

describe('submitNamedForm', () => {
	test('正しい名前で送信でき、成功時に onSuccess の完了を待ってから loading を解除できる', async () => {
		const order: string[] = [];
		const ctx = setup(async () => new Response(null, { status: 201 }));
		ctx.onSuccess.mockImplementation(async () => {
			await Promise.resolve();
			order.push('onSuccess');
		});
		await submitNamedForm({
			...ctx.options,
			...named,
			name: 'abc',
			setLoading: (l) => order.push(`loading:${l}`)
		});
		expect(ctx.request).toHaveBeenCalledTimes(1);
		expect(order).toEqual(['loading:true', 'onSuccess', 'loading:false']);
	});

	test('前後の空白を除くと上限以内の場合、送信できる', async () => {
		const ctx = setup(async () => new Response(null, { status: 201 }));
		await submitNamedForm({ ...ctx.options, ...named, name: '  abcde  ' });
		expect(ctx.request).toHaveBeenCalledTimes(1);
		expect(ctx.errors).toEqual(['']);
	});

	test('前後の空白を除いても上限を超える場合、文字数エラーが表示され送信されない', async () => {
		const ctx = setup(async () => new Response(null, { status: 201 }));
		await submitNamedForm({ ...ctx.options, ...named, name: ' abcdef ' });
		expect(ctx.request).not.toHaveBeenCalled();
		expect(ctx.errors.at(-1)).toBe('5文字以内');
	});

	test('空白のみの場合、必須エラーが表示され送信されない', async () => {
		const ctx = setup(async () => new Response(null, { status: 201 }));
		await submitNamedForm({ ...ctx.options, ...named, name: '   ' });
		expect(ctx.request).not.toHaveBeenCalled();
		expect(ctx.errors.at(-1)).toBe('名前は必須です');
	});

	test('API がエラーを返した場合、API のメッセージが表示され onSuccess は呼ばれない', async () => {
		const ctx = setup(async () =>
			Response.json({ code: 'CONFLICT', message: '同じ名前が存在します' }, { status: 409 })
		);
		await submitNamedForm({ ...ctx.options, ...named, name: 'abc' });
		expect(ctx.errors.at(-1)).toBe('同じ名前が存在します');
		expect(ctx.onSuccess).not.toHaveBeenCalled();
		expect(ctx.loadings).toEqual([true, false]);
	});
});

describe('submitDelete', () => {
	test('JSON 以外のエラーが返った場合、汎用メッセージが表示される', async () => {
		const ctx = setup(async () => new Response('<html>502</html>', { status: 502 }));
		await submitDelete(ctx.options);
		expect(ctx.errors.at(-1)).toBe('操作に失敗しました');
		expect(ctx.loadings).toEqual([true, false]);
	});

	test('通信エラーの場合、通信エラーのメッセージが表示され loading が解除される', async () => {
		const ctx = setup(async () => {
			throw new TypeError('Failed to fetch');
		});
		await submitDelete(ctx.options);
		expect(ctx.errors.at(-1)).toBe('通信エラーが発生しました');
		expect(ctx.loadings).toEqual([true, false]);
	});
});
