/**
 * @file テスト: 精算額確認モーダル
 * @module src/lib/features/expenses/settlements/components/SettlementDialog.svelte.test.ts
 * @testType unit
 *
 * @target ./SettlementDialog.svelte
 */
import { describe, test, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import SettlementDialog from './SettlementDialog.svelte';
import type { SettlementSummary } from '../types';

function makeSummary(overrides: Partial<SettlementSummary> = {}): SettlementSummary {
	return {
		month: '2026-09',
		total: 45000,
		members: [
			{ userId: 'user-2', name: '妻', paid: 10000 },
			{ userId: 'user-1', name: '夫', paid: 35000 }
		],
		transfer: {
			fromUserId: 'user-2',
			fromName: '妻',
			toUserId: 'user-1',
			toName: '夫',
			amount: 12500
		},
		approvedCount: 3,
		unapprovedCount: 0,
		...overrides
	};
}

function makeProps(summary: SettlementSummary = makeSummary(), onClose = vi.fn()) {
	return { open: true, summary, currentUserId: 'user-1', currentMonth: '2026-10', onClose };
}

describe('SettlementDialog', () => {
	test('対象月・誰が誰にいくら払うか・各自の支払額が表示される', async () => {
		await render(SettlementDialog, makeProps());

		await expect.element(page.getByRole('heading', { name: '2026年09月の精算' })).toBeVisible();
		await expect.element(page.getByTestId('settlement-transfer')).toHaveTextContent(/妻.*夫/);
		await expect.element(page.getByTestId('settlement-transfer')).toHaveTextContent('¥12,500');
		// 自分（user-1）の支払額が先頭に表示される
		const paid = page.getByTestId('settlement-member-paid');
		await expect.element(paid.nth(0)).toHaveTextContent('夫 の支払い ¥35,000');
		await expect.element(paid.nth(1)).toHaveTextContent('妻 の支払い ¥10,000');
		await expect.element(page.getByTestId('settlement-total')).toHaveTextContent('¥45,000');
	});

	test('差額がない月は「差額はありません」と表示される', async () => {
		await render(SettlementDialog, makeProps(makeSummary({ transfer: null })));
		await expect.element(page.getByText('差額はありません')).toBeVisible();
	});

	test('未承認の支出がある月は、精算額に含まれない件数が表示される', async () => {
		await render(SettlementDialog, makeProps(makeSummary({ unapprovedCount: 2 })));
		await expect
			.element(page.getByTestId('settlement-notes'))
			.toHaveTextContent('未承認の支出 2 件は含まれていません');
	});

	test('当月は途中経過である旨が表示される', async () => {
		await render(SettlementDialog, makeProps(makeSummary({ month: '2026-10' })));
		await expect
			.element(page.getByTestId('settlement-notes'))
			.toHaveTextContent('今月は途中経過です');
	});

	test('過去月かつ未承認がない場合、注意書きは表示されない', async () => {
		await render(SettlementDialog, makeProps());
		await expect.element(page.getByTestId('settlement-notes')).not.toBeInTheDocument();
	});

	test('閉じるボタンを押すと onClose が呼ばれる', async () => {
		const onClose = vi.fn();
		await render(SettlementDialog, makeProps(makeSummary(), onClose));

		(page.getByRole('button', { name: '閉じる' }).element() as HTMLElement).click();
		expect(onClose).toHaveBeenCalledOnce();
	});
});
