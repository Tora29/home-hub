/**
 * @file テスト: Expense [id] API ハンドラ
 * @module src/routes/expenses/[id]/+server.test.ts
 * @testType unit
 *
 * @target ./+server.ts
 * @spec specs/expenses/spec.md
 * @covers AC-106, AC-113, AC-114, AC-115, AC-116, AC-118, AC-119, AC-120
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { AppError } from '$lib/server/errors';

function makeLocals(userId: string) {
	return { user: { id: userId } };
}

function makePlatform() {
	return { env: { DB: {} } };
}

describe('PUT /expenses/[id]', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.mock('../service', () => ({ updateExpense: vi.fn() }));
		vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
	});

	test('[SPEC: AC-106] 存在しない支出 ID に対して PUT した場合は 404 NOT_FOUND を返す // spec:f7ea9b79', async () => {
		const { updateExpense } = await import('../service');
		vi.mocked(updateExpense).mockRejectedValueOnce(
			new AppError('NOT_FOUND', 404, '該当データが見つかりません')
		);
		const { PUT } = await import('./+server');
		const request = new Request('http://localhost/expenses/non-existent', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ amount: 1000, categoryId: 'cat-1', payerUserId: 'user-1' })
		});
		const params = { id: 'non-existent' };
		// @ts-expect-error - simplified event
		const res = await PUT({ request, params, locals: makeLocals('user-1'), platform: makePlatform() });
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe('NOT_FOUND');
		expect(body.message).toBe('該当データが見つかりません');
	});

	test('[SPEC: AC-113] pending の支出に対して PUT した場合は 409 CONFLICT を返す // spec:66a60862', async () => {
		const { updateExpense } = await import('../service');
		vi.mocked(updateExpense).mockRejectedValueOnce(
			new AppError('CONFLICT', 409, '申請中または承認済みの支出は変更できません')
		);
		const { PUT } = await import('./+server');
		const request = new Request('http://localhost/expenses/exp-1', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ amount: 1000, categoryId: 'cat-1', payerUserId: 'user-1' })
		});
		const params = { id: 'exp-1' };
		// @ts-expect-error - simplified event
		const res = await PUT({ request, params, locals: makeLocals('user-1'), platform: makePlatform() });
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.code).toBe('CONFLICT');
		expect(body.message).toBe('申請中または承認済みの支出は変更できません');
	});

	test('[SPEC: AC-113] approved の支出に対して PUT した場合は 409 CONFLICT を返す // spec:66a60862', async () => {
		const { updateExpense } = await import('../service');
		vi.mocked(updateExpense).mockRejectedValueOnce(
			new AppError('CONFLICT', 409, '申請中または承認済みの支出は変更できません')
		);
		const { PUT } = await import('./+server');
		const request = new Request('http://localhost/expenses/exp-1', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ amount: 1000, categoryId: 'cat-1', payerUserId: 'user-1' })
		});
		const params = { id: 'exp-1' };
		// @ts-expect-error - simplified event
		const res = await PUT({ request, params, locals: makeLocals('user-1'), platform: makePlatform() });
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.code).toBe('CONFLICT');
	});

	test('[SPEC: AC-114] 他ユーザーが登録した支出に対して PUT した場合は 403 FORBIDDEN を返す // spec:58e926ac', async () => {
		const { updateExpense } = await import('../service');
		vi.mocked(updateExpense).mockRejectedValueOnce(
			new AppError('FORBIDDEN', 403, '他のユーザーの支出は操作できません')
		);
		const { PUT } = await import('./+server');
		const request = new Request('http://localhost/expenses/exp-1', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ amount: 1000, categoryId: 'cat-1', payerUserId: 'user-2' })
		});
		const params = { id: 'exp-1' };
		// @ts-expect-error - simplified event
		const res = await PUT({ request, params, locals: makeLocals('user-2'), platform: makePlatform() });
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.code).toBe('FORBIDDEN');
		expect(body.message).toBe('他のユーザーの支出は操作できません');
	});

	test('[SPEC: AC-101] PUT で金額が未入力の場合は 400 VALIDATION_ERROR を返す // spec:8c47a574', async () => {
		const { PUT } = await import('./+server');
		const request = new Request('http://localhost/expenses/exp-1', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ categoryId: 'cat-1', payerUserId: 'user-1' })
		});
		const params = { id: 'exp-1' };
		// @ts-expect-error - simplified event
		const res = await PUT({ request, params, locals: makeLocals('user-1'), platform: makePlatform() });
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe('VALIDATION_ERROR');
	});
});

describe('DELETE /expenses/[id]', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.mock('../service', () => ({ deleteExpense: vi.fn() }));
		vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
	});

	test('[SPEC: AC-106] 存在しない支出 ID に対して DELETE した場合は 404 NOT_FOUND を返す // spec:f7ea9b79', async () => {
		const { deleteExpense } = await import('../service');
		vi.mocked(deleteExpense).mockRejectedValueOnce(
			new AppError('NOT_FOUND', 404, '該当データが見つかりません')
		);
		const { DELETE } = await import('./+server');
		const request = new Request('http://localhost/expenses/non-existent', { method: 'DELETE' });
		const params = { id: 'non-existent' };
		// @ts-expect-error - simplified event
		const res = await DELETE({ request, params, locals: makeLocals('user-1'), platform: makePlatform() });
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe('NOT_FOUND');
	});

	test('[SPEC: AC-113] pending の支出に対して DELETE した場合は 409 CONFLICT を返す // spec:66a60862', async () => {
		const { deleteExpense } = await import('../service');
		vi.mocked(deleteExpense).mockRejectedValueOnce(
			new AppError('CONFLICT', 409, '申請中または承認済みの支出は変更できません')
		);
		const { DELETE } = await import('./+server');
		const request = new Request('http://localhost/expenses/exp-1', { method: 'DELETE' });
		const params = { id: 'exp-1' };
		// @ts-expect-error - simplified event
		const res = await DELETE({ request, params, locals: makeLocals('user-1'), platform: makePlatform() });
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.code).toBe('CONFLICT');
		expect(body.message).toBe('申請中または承認済みの支出は変更できません');
	});

	test('[SPEC: AC-114] 他ユーザーが登録した支出に対して DELETE した場合は 403 FORBIDDEN を返す // spec:58e926ac', async () => {
		const { deleteExpense } = await import('../service');
		vi.mocked(deleteExpense).mockRejectedValueOnce(
			new AppError('FORBIDDEN', 403, '他のユーザーの支出は操作できません')
		);
		const { DELETE } = await import('./+server');
		const request = new Request('http://localhost/expenses/exp-1', { method: 'DELETE' });
		const params = { id: 'exp-1' };
		// @ts-expect-error - simplified event
		const res = await DELETE({ request, params, locals: makeLocals('user-2'), platform: makePlatform() });
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.code).toBe('FORBIDDEN');
	});
});

describe('POST /expenses/[id]/check', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.mock('../service', () => ({ checkExpense: vi.fn() }));
		vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
	});

	test('[SPEC: AC-114] 他ユーザーが登録した支出を check した場合は 403 FORBIDDEN を返す // spec:58e926ac', async () => {
		const { checkExpense } = await import('../service');
		vi.mocked(checkExpense).mockRejectedValueOnce(
			new AppError('FORBIDDEN', 403, '他のユーザーの支出は操作できません')
		);
		const { POST } = await import('./check/+server');
		const request = new Request('http://localhost/expenses/exp-1/check', { method: 'POST' });
		const params = { id: 'exp-1' };
		// @ts-expect-error - simplified event
		const res = await POST({ request, params, locals: makeLocals('user-2'), platform: makePlatform() });
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.code).toBe('FORBIDDEN');
	});

	test('[SPEC: BR-状態遷移] checked の支出を check すると 409 CONFLICT // spec:207ce956', async () => {
		const { checkExpense } = await import('../service');
		vi.mocked(checkExpense).mockRejectedValueOnce(
			new AppError('CONFLICT', 409, 'この操作はできません')
		);
		const { POST } = await import('./check/+server');
		const request = new Request('http://localhost/expenses/exp-1/check', { method: 'POST' });
		const params = { id: 'exp-1' };
		// @ts-expect-error - simplified event
		const res = await POST({ request, params, locals: makeLocals('user-1'), platform: makePlatform() });
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.code).toBe('CONFLICT');
	});

	test('[SPEC: BR-状態遷移] pending/approved の支出を check すると 409 CONFLICT // spec:ee07819d', async () => {
		const { checkExpense } = await import('../service');
		vi.mocked(checkExpense).mockRejectedValueOnce(
			new AppError('CONFLICT', 409, 'この操作はできません')
		);
		const { POST } = await import('./check/+server');
		const request = new Request('http://localhost/expenses/exp-1/check', { method: 'POST' });
		const params = { id: 'exp-1' };
		// @ts-expect-error - simplified event
		const res = await POST({ request, params, locals: makeLocals('user-1'), platform: makePlatform() });
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.code).toBe('CONFLICT');
	});
});

describe('POST /expenses/[id]/uncheck', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.mock('../service', () => ({ uncheckExpense: vi.fn() }));
		vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
	});

	test('[SPEC: AC-114] 他ユーザーが登録した支出を uncheck した場合は 403 FORBIDDEN を返す // spec:58e926ac', async () => {
		const { uncheckExpense } = await import('../service');
		vi.mocked(uncheckExpense).mockRejectedValueOnce(
			new AppError('FORBIDDEN', 403, '他のユーザーの支出は操作できません')
		);
		const { POST } = await import('./uncheck/+server');
		const request = new Request('http://localhost/expenses/exp-1/uncheck', { method: 'POST' });
		const params = { id: 'exp-1' };
		// @ts-expect-error - simplified event
		const res = await POST({ request, params, locals: makeLocals('user-2'), platform: makePlatform() });
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.code).toBe('FORBIDDEN');
	});

	test('[SPEC: BR-状態遷移] unapproved の支出を uncheck すると 409 CONFLICT // spec:9aa14e4f', async () => {
		const { uncheckExpense } = await import('../service');
		vi.mocked(uncheckExpense).mockRejectedValueOnce(
			new AppError('CONFLICT', 409, 'この操作はできません')
		);
		const { POST } = await import('./uncheck/+server');
		const request = new Request('http://localhost/expenses/exp-1/uncheck', { method: 'POST' });
		const params = { id: 'exp-1' };
		// @ts-expect-error - simplified event
		const res = await POST({ request, params, locals: makeLocals('user-1'), platform: makePlatform() });
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.code).toBe('CONFLICT');
	});

	test('[SPEC: BR-状態遷移] pending/approved の支出を uncheck すると 409 CONFLICT // spec:24e1765b', async () => {
		const { uncheckExpense } = await import('../service');
		vi.mocked(uncheckExpense).mockRejectedValueOnce(
			new AppError('CONFLICT', 409, 'この操作はできません')
		);
		const { POST } = await import('./uncheck/+server');
		const request = new Request('http://localhost/expenses/exp-1/uncheck', { method: 'POST' });
		const params = { id: 'exp-1' };
		// @ts-expect-error - simplified event
		const res = await POST({ request, params, locals: makeLocals('user-1'), platform: makePlatform() });
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.code).toBe('CONFLICT');
	});
});

describe('POST /expenses/request', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.mock('../service', () => ({ requestExpenses: vi.fn() }));
		vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
	});

	test('[SPEC: AC-115] checked 支出が 0 件の場合は 409 CONFLICT を返す // spec:b0e3fc0b', async () => {
		const { requestExpenses } = await import('../service');
		vi.mocked(requestExpenses).mockRejectedValueOnce(
			new AppError('CONFLICT', 409, '確認済みの支出がありません')
		);
		const { POST } = await import('./request/+server');
		const request = new Request('http://localhost/expenses/request', { method: 'POST' });
		// @ts-expect-error - simplified event
		const res = await POST({ request, locals: makeLocals('user-1'), platform: makePlatform() });
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.code).toBe('CONFLICT');
		expect(body.message).toBe('確認済みの支出がありません');
	});

	test('[SPEC: AC-120] LINE API が 4xx を返した場合は 502 BAD_GATEWAY を返す // spec:b0e3fc0b', async () => {
		const { requestExpenses } = await import('../service');
		vi.mocked(requestExpenses).mockRejectedValueOnce(
			new AppError(
				'BAD_GATEWAY',
				502,
				'LINE 通知の送信に失敗したため承認フローを完了できませんでした'
			)
		);
		const { POST } = await import('./request/+server');
		const request = new Request('http://localhost/expenses/request', { method: 'POST' });
		// @ts-expect-error - simplified event
		const res = await POST({ request, locals: makeLocals('user-1'), platform: makePlatform() });
		expect(res.status).toBe(502);
		const body = await res.json();
		expect(body.code).toBe('BAD_GATEWAY');
		expect(body.message).toBe('LINE 通知の送信に失敗したため承認フローを完了できませんでした');
	});

	test('[SPEC: AC-120] ネットワークエラーが発生した場合は 502 BAD_GATEWAY を返す // spec:b0e3fc0b', async () => {
		const { requestExpenses } = await import('../service');
		vi.mocked(requestExpenses).mockRejectedValueOnce(
			new AppError(
				'BAD_GATEWAY',
				502,
				'LINE 通知の送信に失敗したため承認フローを完了できませんでした'
			)
		);
		const { POST } = await import('./request/+server');
		const request = new Request('http://localhost/expenses/request', { method: 'POST' });
		// @ts-expect-error - simplified event
		const res = await POST({ request, locals: makeLocals('user-1'), platform: makePlatform() });
		expect(res.status).toBe(502);
	});
});

describe('POST /expenses/cancel', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.mock('../service', () => ({ cancelExpenses: vi.fn() }));
		vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
	});

	test('[SPEC: AC-116] pending 支出が 0 件の場合は 409 CONFLICT を返す // spec:b0e3fc0b', async () => {
		const { cancelExpenses } = await import('../service');
		vi.mocked(cancelExpenses).mockRejectedValueOnce(
			new AppError('CONFLICT', 409, '申請中の支出がありません')
		);
		const { POST } = await import('./cancel/+server');
		const request = new Request('http://localhost/expenses/cancel', { method: 'POST' });
		// @ts-expect-error - simplified event
		const res = await POST({ request, locals: makeLocals('user-1'), platform: makePlatform() });
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.code).toBe('CONFLICT');
		expect(body.message).toBe('申請中の支出がありません');
	});
});

describe('POST /expenses/approve', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.mock('../service', () => ({ approveExpenses: vi.fn() }));
		vi.mock('$lib/server/db', () => ({ createDb: vi.fn() }));
	});

	test('[SPEC: AC-118] 承認対象パートナーの pending が 0 件の場合は 409 CONFLICT を返す // spec:b0e3fc0b', async () => {
		const { approveExpenses } = await import('../service');
		vi.mocked(approveExpenses).mockRejectedValueOnce(
			new AppError('CONFLICT', 409, '承認できる支出がありません')
		);
		const { POST } = await import('./approve/+server');
		const request = new Request('http://localhost/expenses/approve', { method: 'POST' });
		// @ts-expect-error - simplified event
		const res = await POST({ request, locals: makeLocals('user-1'), platform: makePlatform() });
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.code).toBe('CONFLICT');
		expect(body.message).toBe('承認できる支出がありません');
	});

	test('[SPEC: AC-120] LINE API が 5xx を返した場合は 502 BAD_GATEWAY を返す // spec:b0e3fc0b', async () => {
		const { approveExpenses } = await import('../service');
		vi.mocked(approveExpenses).mockRejectedValueOnce(
			new AppError(
				'BAD_GATEWAY',
				502,
				'LINE 通知の送信に失敗したため承認フローを完了できませんでした'
			)
		);
		const { POST } = await import('./approve/+server');
		const request = new Request('http://localhost/expenses/approve', { method: 'POST' });
		// @ts-expect-error - simplified event
		const res = await POST({ request, locals: makeLocals('user-1'), platform: makePlatform() });
		expect(res.status).toBe(502);
		const body = await res.json();
		expect(body.code).toBe('BAD_GATEWAY');
	});
});
