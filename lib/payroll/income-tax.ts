// 源泉所得税（月額表・甲欄）の電算機計算の特例
// 出典: 国税庁「月額表の甲欄を適用する給与等に対する税額の電算機計算の特例について」令和8年分以降
// https://www.nta.go.jp/publication/pamph/gensen/zeigakuhyo2026/data/denshi_01.pdf
//
// 令和7年分以前の給与等には使用できない（税額表・控除額が異なる）。

export type IncomeTaxInput = {
  /** その月の社会保険料等控除後の給与等の金額（非課税の通勤費は含めない） */
  amountAfterSocialInsurance: number;
  /** 源泉控除対象配偶者に該当する人がいるか */
  hasSpouse?: boolean;
  /** 源泉控除対象親族の数 */
  dependents?: number;
};

/** 第2表: 配偶者控除・扶養控除とも1人あたり同額 */
const DEDUCTION_PER_PERSON = 31_667;

/** 第1表: 給与所得控除の額（1円未満切り上げ） */
function salaryIncomeDeduction(amount: number) {
  if (amount <= 158_333) {
    return 54_167;
  }

  if (amount <= 299_999) {
    return Math.ceil(amount * 0.3 + 6_667);
  }

  if (amount <= 549_999) {
    return Math.ceil(amount * 0.2 + 36_667);
  }

  if (amount <= 708_330) {
    return Math.ceil(amount * 0.1 + 91_667);
  }

  return 162_500;
}

/** 第3表: 基礎控除の額 */
function basicDeduction(amount: number) {
  if (amount <= 2_120_833) {
    return 48_334;
  }

  if (amount <= 2_162_499) {
    return 40_000;
  }

  if (amount <= 2_204_166) {
    return 26_667;
  }

  if (amount <= 2_245_833) {
    return 13_334;
  }

  return 0;
}

/** 第4表: 課税給与所得金額に対する税額（10円未満四捨五入は呼び出し側で実施） */
function taxFromTaxableIncome(taxableIncome: number) {
  if (taxableIncome <= 162_500) {
    return taxableIncome * 0.05105;
  }

  if (taxableIncome <= 275_000) {
    return taxableIncome * 0.1021 - 8_296;
  }

  if (taxableIncome <= 579_166) {
    return taxableIncome * 0.2042 - 36_374;
  }

  if (taxableIncome <= 750_000) {
    return taxableIncome * 0.23483 - 54_113;
  }

  if (taxableIncome <= 1_500_000) {
    return taxableIncome * 0.33693 - 130_688;
  }

  if (taxableIncome <= 3_333_333) {
    return taxableIncome * 0.4084 - 237_893;
  }

  return taxableIncome * 0.45945 - 408_061;
}

/** 10円未満四捨五入 */
function roundToTen(value: number) {
  return Math.round(value / 10) * 10;
}

export function calculateMonthlyIncomeTax({
  amountAfterSocialInsurance,
  hasSpouse = false,
  dependents = 0,
}: IncomeTaxInput) {
  const amount = Math.max(0, Math.round(amountAfterSocialInsurance));

  if (amount === 0) {
    return 0;
  }

  const personalDeductions =
    (hasSpouse ? DEDUCTION_PER_PERSON : 0) +
    DEDUCTION_PER_PERSON * Math.max(0, dependents);
  const taxableIncome = Math.max(
    0,
    amount -
      salaryIncomeDeduction(amount) -
      personalDeductions -
      basicDeduction(amount),
  );

  if (taxableIncome === 0) {
    return 0;
  }

  return Math.max(0, roundToTen(taxFromTaxableIncome(taxableIncome)));
}
