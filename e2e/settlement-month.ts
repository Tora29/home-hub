/**
 * @file E2Eテスト: 精算テスト用の対象月
 * @module e2e/settlement-month.ts
 * @testType e2e
 *
 * @description
 * global-setup.ts（データ投入）と expenses.e2e.ts（検証）で共有する精算額確認用の月。
 * シード（2026 年の固定月）・当月・前月（空月として使用）と重ならないよう 10 年前の月を使う。
 * 支出一覧は URL の month で開くため、月セレクトの選択肢（過去 13 か月）の範囲外でもよい。
 */
import { addMonths, getCurrentMonth } from '../src/lib/utils/date';

export const E2E_SETTLEMENT_MONTH = addMonths(getCurrentMonth(), -120);
