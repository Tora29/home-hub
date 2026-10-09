/**
 * @file 型定義: 精算額
 * @module src/lib/features/expenses/settlements/types.ts
 * @feature expenses
 *
 * @description
 * 精算額確認機能で service・コンポーネント間で共有する型定義。
 * サーバー依存なしの純粋な型ファイル。
 */

/** 精算の当事者と、対象月に支払った承認済み支出の合計。 */
export type SettlementMember = {
	userId: string;
	name: string;
	paid: number;
};

/** 差額の支払い（fromUser → toUser へ amount 円）。 */
export type SettlementTransfer = {
	fromUserId: string;
	fromName: string;
	toUserId: string;
	toName: string;
	amount: number;
};

/** 指定月の精算額。transfer が null のときは差額なし。 */
export type SettlementSummary = {
	month: string;
	total: number;
	members: SettlementMember[];
	transfer: SettlementTransfer | null;
	approvedCount: number;
	unapprovedCount: number;
};
