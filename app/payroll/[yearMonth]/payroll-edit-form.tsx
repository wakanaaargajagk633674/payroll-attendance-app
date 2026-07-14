"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateMonthlyIncomeTax } from "@/lib/payroll/income-tax";

import { updatePayrollRows } from "./actions";

export type PayrollEditRecord = {
  id: string;
  employeeNo: string;
  displayName: string;
  name: string;
  nearestStation: string;
  salaryType: string;
  workDays: number;
  breakMinutesTotal: number;
  regularHours: number;
  nightHours: number;
  hourlyRate: number;
  nightRate: number;
  monthlySalary: number;
  regularPay: number;
  nightPay: number;
  transportationAmount: number;
  grossPayment: number;
  incomeTax: number;
  mealDeduction: number;
  rentDeduction: number;
  otherDeduction: number;
  deductionTotal: number;
  netPayment: number;
  source: string;
};

type PayrollEditFormProps = {
  yearMonth: string;
  records: PayrollEditRecord[];
};

type PayrollEditTotals = {
  workDays: number;
  breakMinutesTotal: number;
  regularHours: number;
  nightHours: number;
  regularPay: number;
  nightPay: number;
  transportationAmount: number;
  grossPayment: number;
  incomeTax: number;
  mealDeduction: number;
  rentDeduction: number;
  otherDeduction: number;
  deductionTotal: number;
  netPayment: number;
};

const moneyFormatter = new Intl.NumberFormat("ja-JP");
const integerFormatter = new Intl.NumberFormat("ja-JP");
const decimalFormatter = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MEAL_RATE_PER_DAY = 250;
const MEAL_DEDUCTION_MAX = 5000;

function calculateMealDeduction(workDays: number) {
  return Math.min(
    Math.round(workDays * MEAL_RATE_PER_DAY),
    MEAL_DEDUCTION_MAX,
  );
}

function calculateDeductionTotal(row: PayrollEditRecord) {
  return Math.round(
    row.incomeTax + row.mealDeduction + row.rentDeduction + row.otherDeduction,
  );
}

function recalculateRow(row: PayrollEditRecord): PayrollEditRecord {
  const deductionTotal = calculateDeductionTotal(row);
  const grossPayment = Math.round(
    row.regularPay + row.nightPay + row.transportationAmount,
  );

  return {
    ...row,
    grossPayment,
    deductionTotal,
    netPayment: Math.round(grossPayment - deductionTotal),
  };
}

function toNumberInput(value: string) {
  if (!value) {
    return 0;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatMoney(value: number) {
  return moneyFormatter.format(value);
}

function formatHours(value: number) {
  return decimalFormatter.format(value);
}

function formatInteger(value: number) {
  return integerFormatter.format(value);
}

function formatBreak(value: number) {
  return `${integerFormatter.format(value)}分`;
}

function editableRowsPayload(records: PayrollEditRecord[]) {
  return records.map((record) => ({
    id: record.id,
    transportationAmount: record.transportationAmount,
    incomeTax: record.incomeTax,
    mealDeduction: record.mealDeduction,
    rentDeduction: record.rentDeduction,
    otherDeduction: record.otherDeduction,
  }));
}

function calculateTotals(records: PayrollEditRecord[]) {
  return records.reduce<PayrollEditTotals>(
    (totals, record) => ({
      workDays: totals.workDays + record.workDays,
      breakMinutesTotal:
        totals.breakMinutesTotal + record.breakMinutesTotal,
      regularHours: totals.regularHours + record.regularHours,
      nightHours: totals.nightHours + record.nightHours,
      regularPay: totals.regularPay + record.regularPay,
      nightPay: totals.nightPay + record.nightPay,
      transportationAmount:
        totals.transportationAmount + record.transportationAmount,
      grossPayment: totals.grossPayment + record.grossPayment,
      incomeTax: totals.incomeTax + record.incomeTax,
      mealDeduction: totals.mealDeduction + record.mealDeduction,
      rentDeduction: totals.rentDeduction + record.rentDeduction,
      otherDeduction: totals.otherDeduction + record.otherDeduction,
      deductionTotal: totals.deductionTotal + record.deductionTotal,
      netPayment: totals.netPayment + record.netPayment,
    }),
    {
      workDays: 0,
      breakMinutesTotal: 0,
      regularHours: 0,
      nightHours: 0,
      regularPay: 0,
      nightPay: 0,
      transportationAmount: 0,
      grossPayment: 0,
      incomeTax: 0,
      mealDeduction: 0,
      rentDeduction: 0,
      otherDeduction: 0,
      deductionTotal: 0,
      netPayment: 0,
    },
  );
}

export function PayrollEditForm({
  yearMonth,
  records: initialRecords,
}: PayrollEditFormProps) {
  const [records, setRecords] = useState(initialRecords);
  const totals = useMemo(() => calculateTotals(records), [records]);

  function updateRecord(
    id: string,
    key:
      | "transportationAmount"
      | "incomeTax"
      | "mealDeduction"
      | "rentDeduction"
      | "otherDeduction",
    value: string,
  ) {
    setRecords((currentRecords) =>
      currentRecords.map((record) => {
        if (record.id !== id) {
          return record;
        }

        return recalculateRow({
          ...record,
          [key]: Math.round(toNumberInput(value)),
        });
      }),
    );
  }

  function applyIncomeTaxes() {
    setRecords((currentRecords) =>
      currentRecords.map((record) =>
        recalculateRow({
          ...record,
          // 交通費は非課税、社会保険料の控除なし。全員 甲欄・扶養0人。
          incomeTax: calculateMonthlyIncomeTax({
            amountAfterSocialInsurance: record.regularPay + record.nightPay,
          }),
        }),
      ),
    );
  }

  function applyMealDeductions() {
    setRecords((currentRecords) =>
      currentRecords.map((record) =>
        recalculateRow({
          ...record,
          mealDeduction: calculateMealDeduction(record.workDays),
        }),
      ),
    );
  }

  if (records.length === 0) {
    return (
      <section className="rounded-md border bg-background p-8 text-center text-sm text-muted-foreground shadow-sm">
        給与データがありません。/payroll/generate で作成してください。
      </section>
    );
  }

  return (
    <form action={updatePayrollRows} className="grid gap-4">
      <input type="hidden" name="year_month" value={yearMonth} />
      <input
        type="hidden"
        name="rows"
        value={JSON.stringify(editableRowsPayload(records))}
      />

      <section className="grid gap-3 rounded-md border bg-background p-4 shadow-sm md:grid-cols-5">
        <div>
          <p className="text-xs text-muted-foreground">対象人数</p>
          <p className="text-xl font-semibold tabular-nums">
            {formatInteger(records.length)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">総支給額合計</p>
          <p className="text-xl font-semibold tabular-nums">
            {formatMoney(totals.grossPayment)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">控除合計</p>
          <p className="text-xl font-semibold tabular-nums">
            {formatMoney(totals.deductionTotal)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">差引支給額合計</p>
          <p className="text-xl font-semibold tabular-nums">
            {formatMoney(totals.netPayment)}
          </p>
        </div>
        <div className="flex items-end justify-start gap-2 md:justify-end">
          <Button type="button" variant="outline" onClick={applyIncomeTaxes}>
            所得税を自動計算
          </Button>
          <Button type="button" variant="outline" onClick={applyMealDeductions}>
            食事代を自動計算
          </Button>
          <Button type="submit">まとめて保存</Button>
        </div>
      </section>

      <section className="rounded-md border bg-background shadow-sm">
        <div className="flex flex-col gap-1 border-b px-5 py-4">
          <h2 className="text-lg font-semibold">給与確認・修正</h2>
          <p className="text-sm text-muted-foreground">
            交通費と控除欄を編集できます。控除計と差引支給額は自動再計算されます。
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[2450px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-3 font-medium">社員NO</th>
                <th className="px-3 py-3 font-medium">表示名</th>
                <th className="px-3 py-3 font-medium">本名</th>
                <th className="px-3 py-3 font-medium">最寄り駅</th>
                <th className="px-3 py-3 font-medium">給与区分</th>
                <th className="px-3 py-3 text-right font-medium">勤務日数</th>
                <th className="px-3 py-3 text-right font-medium">休憩合計</th>
                <th className="px-3 py-3 text-right font-medium">通常時間</th>
                <th className="px-3 py-3 text-right font-medium">深夜時間</th>
                <th className="px-3 py-3 text-right font-medium">昼間時給</th>
                <th className="px-3 py-3 text-right font-medium">深夜時給</th>
                <th className="px-3 py-3 text-right font-medium">月給</th>
                <th className="px-3 py-3 text-right font-medium">通常給与</th>
                <th className="px-3 py-3 text-right font-medium">深夜給与</th>
                <th className="px-3 py-3 text-right font-medium">交通費</th>
                <th className="px-3 py-3 text-right font-medium">総支給額</th>
                <th className="px-3 py-3 text-right font-medium">所得税</th>
                <th className="px-3 py-3 text-right font-medium">食事代</th>
                <th className="px-3 py-3 text-right font-medium">家賃</th>
                <th className="px-3 py-3 text-right font-medium">その他控除</th>
                <th className="px-3 py-3 text-right font-medium">控除計</th>
                <th className="px-3 py-3 text-right font-medium">差引支給額</th>
                <th className="px-3 py-3 font-medium">source</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr
                  key={record.id}
                  className="border-t align-top transition-colors hover:bg-muted/40"
                >
                  <td className="whitespace-nowrap px-3 py-2">
                    {record.employeeNo || "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium">
                    {record.displayName || "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {record.name || "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {record.nearestStation || "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Badge variant="secondary">{record.salaryType || "-"}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {formatHours(record.workDays)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {formatBreak(record.breakMinutesTotal)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {formatHours(record.regularHours)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {formatHours(record.nightHours)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {record.hourlyRate > 0 ? formatMoney(record.hourlyRate) : "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {record.nightRate > 0 ? formatMoney(record.nightRate) : "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {record.monthlySalary > 0
                      ? formatMoney(record.monthlySalary)
                      : "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {formatMoney(record.regularPay)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {formatMoney(record.nightPay)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={record.transportationAmount}
                      onChange={(event) =>
                        updateRecord(
                          record.id,
                          "transportationAmount",
                          event.target.value,
                        )
                      }
                      className="h-8 w-28 text-right tabular-nums"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                    {formatMoney(record.grossPayment)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={record.incomeTax}
                      onChange={(event) =>
                        updateRecord(record.id, "incomeTax", event.target.value)
                      }
                      className="h-8 w-28 text-right tabular-nums"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={record.mealDeduction}
                      onChange={(event) =>
                        updateRecord(
                          record.id,
                          "mealDeduction",
                          event.target.value,
                        )
                      }
                      className="h-8 w-28 text-right tabular-nums"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={record.rentDeduction}
                      onChange={(event) =>
                        updateRecord(
                          record.id,
                          "rentDeduction",
                          event.target.value,
                        )
                      }
                      className="h-8 w-28 text-right tabular-nums"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={record.otherDeduction}
                      onChange={(event) =>
                        updateRecord(
                          record.id,
                          "otherDeduction",
                          event.target.value,
                        )
                      }
                      className="h-8 w-28 text-right tabular-nums"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                    {formatMoney(record.deductionTotal)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                    {formatMoney(record.netPayment)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Badge variant="secondary">{record.source || "-"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t bg-muted/40 font-semibold">
              <tr>
                <td className="px-3 py-3" colSpan={5}>
                  合計
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {formatHours(totals.workDays)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {formatBreak(totals.breakMinutesTotal)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {formatHours(totals.regularHours)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {formatHours(totals.nightHours)}
                </td>
                <td className="px-3 py-3" />
                <td className="px-3 py-3" />
                <td className="px-3 py-3" />
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {formatMoney(totals.regularPay)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {formatMoney(totals.nightPay)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {formatMoney(totals.transportationAmount)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {formatMoney(totals.grossPayment)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {formatMoney(totals.incomeTax)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {formatMoney(totals.mealDeduction)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {formatMoney(totals.rentDeduction)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {formatMoney(totals.otherDeduction)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {formatMoney(totals.deductionTotal)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {formatMoney(totals.netPayment)}
                </td>
                <td className="px-3 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </form>
  );
}
