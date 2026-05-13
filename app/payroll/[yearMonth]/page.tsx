import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

import {
  PayrollEditForm,
  type PayrollEditRecord,
} from "./payroll-edit-form";

type Params = Promise<{
  yearMonth: string;
}>;

type SearchParams = Promise<{
  saved?: string | string[];
  error?: string | string[];
}>;

type EmployeeRecord = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  employee_no?: string | null;
  employee_code?: string | null;
  nearest_station?: string | null;
};

type PayrollRecord = {
  id: string;
  year_month: string | null;
  salary_type: string | null;
  work_days: number | string | null;
  break_minutes_total?: number | string | null;
  regular_hours: number | string | null;
  night_hours: number | string | null;
  hourly_rate: number | string | null;
  night_rate: number | string | null;
  monthly_salary: number | string | null;
  regular_pay: number | string | null;
  night_pay: number | string | null;
  transportation_amount: number | string | null;
  gross_payment: number | string | null;
  income_tax: number | string | null;
  meal_deduction: number | string | null;
  rent_deduction: number | string | null;
  other_deduction: number | string | null;
  deduction_total: number | string | null;
  net_payment: number | string | null;
  source: string | null;
  employees?: EmployeeRecord | EmployeeRecord[] | null;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numberValue =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function employeeFromRecord(record: PayrollRecord) {
  if (Array.isArray(record.employees)) {
    return record.employees[0] ?? null;
  }

  return record.employees ?? null;
}

function employeeDisplayName(employee: EmployeeRecord | null | undefined) {
  return employee?.display_name || employee?.name || employee?.full_name || "";
}

function employeeName(employee: EmployeeRecord | null | undefined) {
  return employee?.name || employee?.full_name || employee?.display_name || "";
}

function sortPayrollRecords(a: PayrollRecord, b: PayrollRecord) {
  const employeeA = employeeFromRecord(a);
  const employeeB = employeeFromRecord(b);

  return employeeDisplayName(employeeA).localeCompare(
    employeeDisplayName(employeeB),
    "ja",
  );
}

function toPayrollEditRecord(record: PayrollRecord): PayrollEditRecord {
  const employee = employeeFromRecord(record);

  return {
    id: record.id,
    employeeNo: employee?.employee_no || employee?.employee_code || "",
    displayName: employeeDisplayName(employee),
    name: employeeName(employee),
    nearestStation: employee?.nearest_station || "",
    salaryType: record.salary_type || "",
    workDays: toNumber(record.work_days),
    breakMinutesTotal: toNumber(record.break_minutes_total),
    regularHours: toNumber(record.regular_hours),
    nightHours: toNumber(record.night_hours),
    hourlyRate: toNumber(record.hourly_rate),
    nightRate: toNumber(record.night_rate),
    monthlySalary: toNumber(record.monthly_salary),
    regularPay: toNumber(record.regular_pay),
    nightPay: toNumber(record.night_pay),
    transportationAmount: toNumber(record.transportation_amount),
    grossPayment: toNumber(record.gross_payment),
    incomeTax: toNumber(record.income_tax),
    mealDeduction: toNumber(record.meal_deduction),
    rentDeduction: toNumber(record.rent_deduction),
    otherDeduction: toNumber(record.other_deduction),
    deductionTotal: toNumber(record.deduction_total),
    netPayment: toNumber(record.net_payment),
    source: record.source || "",
  };
}

async function ActionMessage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const error = firstParam(params.error);
  const saved = firstParam(params.saved);

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (saved) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        給与データを更新しました。
      </div>
    );
  }

  return null;
}

async function PayrollEditContent({ yearMonth }: { yearMonth: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payroll_records")
    .select(
      "id,year_month,salary_type,work_days,break_minutes_total,regular_hours,night_hours,hourly_rate,night_rate,monthly_salary,regular_pay,night_pay,transportation_amount,gross_payment,income_tax,meal_deduction,rent_deduction,other_deduction,deduction_total,net_payment,source,employees:employee_id(id,name,full_name,display_name,employee_no,employee_code,nearest_station)",
    )
    .eq("year_month", yearMonth);

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error.message}
      </div>
    );
  }

  const records = ((data ?? []) as PayrollRecord[])
    .sort(sortPayrollRecords)
    .map(toPayrollEditRecord);

  return <PayrollEditForm yearMonth={yearMonth} records={records} />;
}

async function PayrollYearMonthContent({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { yearMonth } = await params;

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <Link
            href="/payroll"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            給与月一覧へ戻る
          </Link>
          <h1 className="text-2xl font-semibold tracking-normal">
            給与確認・修正 {yearMonth}
          </h1>
          <p className="text-sm text-muted-foreground">
            交通費・控除を修正し、控除計と差引支給額を再計算して保存できます。
          </p>
        </div>
        <div className="flex max-w-md flex-col gap-2 rounded-md border bg-background p-4 text-sm text-muted-foreground shadow-sm">
          <p>Excel出力は管理者専用画面で行います。</p>
          <Button asChild variant="outline">
            <Link href={`/admin/exports?yearMonth=${encodeURIComponent(yearMonth)}`}>
              /admin/exports を開く
            </Link>
          </Button>
        </div>
      </div>

      <Suspense>
        <ActionMessage searchParams={searchParams} />
      </Suspense>

      <PayrollEditContent yearMonth={yearMonth} />
    </>
  );
}

export default function PayrollYearMonthPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <Suspense
          fallback={
            <section className="rounded-md border bg-background p-5 text-sm text-muted-foreground shadow-sm">
              読み込み中...
            </section>
          }
        >
          <PayrollYearMonthContent
            params={params}
            searchParams={searchParams}
          />
        </Suspense>
      </div>
    </main>
  );
}
