// 社会保険料（健康保険・介護保険・厚生年金・雇用保険）の本人負担額
//
// 料率: 協会けんぽ 埼玉県支部（令和7年度）／厚生年金 18.3%／雇用保険 一般の事業
// - 健康保険      9.78%  （労使折半 → 本人 4.89%）
// - 介護保険      1.59%  （全国一律。40歳〜64歳のみ。労使折半 → 本人 0.795%）
// - 厚生年金     18.30%  （労使折半 → 本人 9.15%）
// - 雇用保険      本人 0.55%（総支給額に直接かける。標準報酬月額は使わない）
//
// 健康保険・介護保険・厚生年金は「標準報酬月額」に料率をかける。
// 標準報酬月額はその月の総支給額（通勤手当を含む）を等級表に当てはめて求める。
// 本来は算定基礎届・月額変更届で決めた等級を1年間使うが、
// 当アプリでは毎月の総支給額から自動算出する運用としている。

export type SocialInsuranceInput = {
  /** その月の総支給額（通勤手当を含む。社会保険の「報酬」） */
  grossPayment: number;
  /** 40歳〜64歳（介護保険第2号被保険者）か */
  longTermCareInsured?: boolean;
};

export type SocialInsuranceResult = {
  /** 標準報酬月額（健康保険） */
  standardMonthlyRemuneration: number;
  /** 健康保険の等級（1〜50） */
  healthInsuranceGrade: number;
  /** 標準報酬月額（厚生年金。88,000〜650,000 に丸められる） */
  pensionStandardMonthlyRemuneration: number;
  healthInsurance: number;
  longTermCareInsurance: number;
  pensionInsurance: number;
  employmentInsurance: number;
  /** 社会保険料合計（本人負担） */
  total: number;
};

/** 協会けんぽ 埼玉県支部 令和7年度（全体の料率。本人負担は折半） */
export const HEALTH_INSURANCE_RATE = 0.0978;
/** 介護保険 令和7年度（全国一律。本人負担は折半） */
export const LONG_TERM_CARE_INSURANCE_RATE = 0.0159;
/** 厚生年金（本人負担は折半） */
export const PENSION_INSURANCE_RATE = 0.183;
/** 雇用保険 一般の事業 令和7年度の被保険者負担率 */
export const EMPLOYMENT_INSURANCE_EMPLOYEE_RATE = 0.0055;

/**
 * 健康保険 標準報酬月額表（令和7年度）。
 * [等級, 標準報酬月額, 報酬月額の下限]。下限以上・次の等級の下限未満がその等級。
 */
const HEALTH_INSURANCE_GRADES: [number, number, number][] = [
  [1, 58_000, 0],
  [2, 68_000, 63_000],
  [3, 78_000, 73_000],
  [4, 88_000, 83_000],
  [5, 98_000, 93_000],
  [6, 104_000, 101_000],
  [7, 110_000, 107_000],
  [8, 118_000, 114_000],
  [9, 126_000, 122_000],
  [10, 134_000, 130_000],
  [11, 142_000, 138_000],
  [12, 150_000, 146_000],
  [13, 160_000, 155_000],
  [14, 170_000, 165_000],
  [15, 180_000, 175_000],
  [16, 190_000, 185_000],
  [17, 200_000, 195_000],
  [18, 220_000, 210_000],
  [19, 240_000, 230_000],
  [20, 260_000, 250_000],
  [21, 280_000, 270_000],
  [22, 300_000, 290_000],
  [23, 320_000, 310_000],
  [24, 340_000, 330_000],
  [25, 360_000, 350_000],
  [26, 380_000, 370_000],
  [27, 410_000, 395_000],
  [28, 440_000, 425_000],
  [29, 470_000, 455_000],
  [30, 500_000, 485_000],
  [31, 530_000, 515_000],
  [32, 560_000, 545_000],
  [33, 590_000, 575_000],
  [34, 620_000, 605_000],
  [35, 650_000, 635_000],
  [36, 680_000, 665_000],
  [37, 710_000, 695_000],
  [38, 750_000, 730_000],
  [39, 790_000, 770_000],
  [40, 830_000, 810_000],
  [41, 880_000, 855_000],
  [42, 930_000, 905_000],
  [43, 980_000, 955_000],
  [44, 1_030_000, 1_005_000],
  [45, 1_090_000, 1_055_000],
  [46, 1_150_000, 1_115_000],
  [47, 1_210_000, 1_175_000],
  [48, 1_270_000, 1_235_000],
  [49, 1_330_000, 1_295_000],
  [50, 1_390_000, 1_355_000],
];

/** 厚生年金の標準報酬月額の下限・上限（健康保険の4級〜35級に相当） */
const PENSION_MIN_STANDARD = 88_000;
const PENSION_MAX_STANDARD = 650_000;

/** 保険料の端数処理: 50銭以下は切り捨て、50銭超は切り上げ */
function roundInsuranceAmount(value: number) {
  const fraction = value - Math.floor(value);
  return fraction <= 0.5 ? Math.floor(value) : Math.ceil(value);
}

/** 報酬月額から健康保険の等級・標準報酬月額を求める */
export function findHealthInsuranceGrade(remuneration: number) {
  const amount = Math.max(0, Math.round(remuneration));
  let matched = HEALTH_INSURANCE_GRADES[0];

  for (const grade of HEALTH_INSURANCE_GRADES) {
    if (amount >= grade[2]) {
      matched = grade;
    } else {
      break;
    }
  }

  return { grade: matched[0], standardMonthlyRemuneration: matched[1] };
}

export function calculateSocialInsurance({
  grossPayment,
  longTermCareInsured = false,
}: SocialInsuranceInput): SocialInsuranceResult {
  const remuneration = Math.max(0, Math.round(grossPayment));
  const { grade, standardMonthlyRemuneration } =
    findHealthInsuranceGrade(remuneration);
  const pensionStandard = Math.min(
    PENSION_MAX_STANDARD,
    Math.max(PENSION_MIN_STANDARD, standardMonthlyRemuneration),
  );

  const healthInsurance = roundInsuranceAmount(
    (standardMonthlyRemuneration * HEALTH_INSURANCE_RATE) / 2,
  );
  const longTermCareInsurance = longTermCareInsured
    ? roundInsuranceAmount(
        (standardMonthlyRemuneration * LONG_TERM_CARE_INSURANCE_RATE) / 2,
      )
    : 0;
  const pensionInsurance = roundInsuranceAmount(
    (pensionStandard * PENSION_INSURANCE_RATE) / 2,
  );
  const employmentInsurance = roundInsuranceAmount(
    remuneration * EMPLOYMENT_INSURANCE_EMPLOYEE_RATE,
  );

  return {
    standardMonthlyRemuneration,
    healthInsuranceGrade: grade,
    pensionStandardMonthlyRemuneration: pensionStandard,
    healthInsurance,
    longTermCareInsurance,
    pensionInsurance,
    employmentInsurance,
    total:
      healthInsurance +
      longTermCareInsurance +
      pensionInsurance +
      employmentInsurance,
  };
}
