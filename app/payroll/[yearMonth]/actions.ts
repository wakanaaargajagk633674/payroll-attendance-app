"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type PayrollEditRowInput = {
  id?: unknown;
  transportationAmount?: unknown;
  healthInsurance?: unknown;
  longTermCareInsurance?: unknown;
  pensionInsurance?: unknown;
  employmentInsurance?: unknown;
  incomeTax?: unknown;
  mealDeduction?: unknown;
  rentDeduction?: unknown;
  otherDeduction?: unknown;
};

type ExistingPayrollRecord = {
  id: string;
  regular_pay: number | string | null;
  night_pay: number | string | null;
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function assertYearMonth(yearMonth: string) {
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    throw new Error("対象月が不正です。");
  }
}

function readRows(formData: FormData): PayrollEditRowInput[] {
  const rawRows = readText(formData, "rows");

  if (!rawRows) {
    return [];
  }

  const parsedRows = JSON.parse(rawRows);

  if (!Array.isArray(parsedRows)) {
    throw new Error("給与編集データの形式が不正です。");
  }

  return parsedRows as PayrollEditRowInput[];
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numberValue =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function socialInsuranceTotal(row: PayrollEditRowInput) {
  return Math.round(
    toNumber(row.healthInsurance) +
      toNumber(row.longTermCareInsurance) +
      toNumber(row.pensionInsurance) +
      toNumber(row.employmentInsurance),
  );
}

function calculateDeductionTotal(row: PayrollEditRowInput) {
  return Math.round(
    socialInsuranceTotal(row) +
      toNumber(row.incomeTax) +
      toNumber(row.mealDeduction) +
      toNumber(row.rentDeduction) +
      toNumber(row.otherDeduction),
  );
}

export async function updatePayrollRows(formData: FormData) {
  const yearMonth = readText(formData, "year_month");
  let errorMessage: string | null = null;

  try {
    assertYearMonth(yearMonth);

    const rows = readRows(formData);
    const ids = rows.map((row) => toId(row.id)).filter(Boolean);

    if (ids.length === 0) {
      throw new Error("保存する給与データがありません。");
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("payroll_records")
      .select("id,regular_pay,night_pay")
      .eq("year_month", yearMonth)
      .in("id", ids);

    if (error) {
      throw new Error(error.message);
    }

    const existingRecords = new Map(
      ((data ?? []) as ExistingPayrollRecord[]).map((record) => [
        record.id,
        record,
      ]),
    );

    // 対象行が1件も取れないのはセッション切れ（RLS下で0件が返る）が典型。
    // ここで止めないと全行スキップのまま「保存しました」と表示してしまう。
    if (existingRecords.size === 0) {
      throw new Error(
        "保存対象の給与データを取得できませんでした。ログインが切れている可能性があります。再度ログインしてから保存してください。",
      );
    }

    const updatedAt = new Date().toISOString();
    let updatedCount = 0;

    for (const row of rows) {
      const id = toId(row.id);
      const existingRecord = existingRecords.get(id);

      if (!id || !existingRecord) {
        continue;
      }

      const transportationAmount = Math.round(toNumber(row.transportationAmount));
      const deductionTotal = calculateDeductionTotal(row);
      const grossPayment = Math.round(
        toNumber(existingRecord.regular_pay) +
          toNumber(existingRecord.night_pay) +
          transportationAmount,
      );
      const netPayment = Math.round(grossPayment - deductionTotal);
      const { error: updateError } = await supabase
        .from("payroll_records")
        .update({
          transportation_amount: transportationAmount,
          gross_payment: grossPayment,
          health_insurance: Math.round(toNumber(row.healthInsurance)),
          long_term_care_insurance: Math.round(
            toNumber(row.longTermCareInsurance),
          ),
          pension_insurance: Math.round(toNumber(row.pensionInsurance)),
          employment_insurance: Math.round(toNumber(row.employmentInsurance)),
          income_tax: Math.round(toNumber(row.incomeTax)),
          meal_deduction: Math.round(toNumber(row.mealDeduction)),
          rent_deduction: Math.round(toNumber(row.rentDeduction)),
          other_deduction: Math.round(toNumber(row.otherDeduction)),
          deduction_total: deductionTotal,
          net_payment: netPayment,
          updated_at: updatedAt,
        })
        .eq("id", id)
        .eq("year_month", yearMonth);

      if (updateError) {
        throw new Error(updateError.message);
      }

      updatedCount += 1;
    }

    if (updatedCount !== rows.length) {
      throw new Error(
        `保存できたのは ${rows.length} 件中 ${updatedCount} 件です。画面を再読み込みして、内容を確認してください。`,
      );
    }
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "給与データの更新に失敗しました。";
  }

  if (errorMessage) {
    redirect(
      `/payroll/${encodeURIComponent(yearMonth)}?error=${encodeURIComponent(
        errorMessage,
      )}`,
    );
  }

  revalidatePath(`/payroll/${yearMonth}`);
  revalidatePath("/payroll");
  redirect(`/payroll/${encodeURIComponent(yearMonth)}?saved=1`);
}
