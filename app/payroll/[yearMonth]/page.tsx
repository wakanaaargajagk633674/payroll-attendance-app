import Link from "next/link";
import { Suspense } from "react";

import { BackToHomeLink } from "@/components/back-to-home-link";
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
  social_insurance_enrolled?: boolean | null;
  long_term_care_insured?: boolean | null;
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
  health_insurance: number | string | null;
  long_term_care_insurance: number | string | null;
  pension_insurance: number | string | null;
  employment_insurance: number | string | null;
  income_tax: number | string | null;
  meal_deduction: number | string | null;
  rent_deduction: number | string | null;
  other_deduction: number | string | null;
  deduction_total: number | string | null;
  net_payment: number | string | null;
  source: string | null;
  employees?: EmployeeRecord | EmployeeRecord[] | null;
};

const TEXT = {
  back: "\u7d66\u4e0e\u6708\u4e00\u89a7\u3078\u623b\u308b",
  title: "\u7d66\u4e0e\u78ba\u8a8d\u30fb\u4fee\u6b63",
  description:
    "\u4ea4\u901a\u8cbb\u30fb\u63a7\u9664\u3092\u4fee\u6b63\u3057\u3001\u63a7\u9664\u8a08\u3068\u5dee\u5f15\u652f\u7d66\u984d\u3092\u518d\u8a08\u7b97\u3057\u3066\u4fdd\u5b58\u3067\u304d\u307e\u3059\u3002",
  adminExports:
    "Excel\u51fa\u529b\u306f\u7ba1\u7406\u8005\u5c02\u7528\u753b\u9762\u3067\u884c\u3044\u307e\u3059\u3002",
  openAdminExports: "/admin/exports \u3092\u958b\u304f",
  saved: "\u7d66\u4e0e\u30c7\u30fc\u30bf\u3092\u66f4\u65b0\u3057\u307e\u3057\u305f\u3002",
  loading: "\u8aad\u307f\u8fbc\u307f\u4e2d...",
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
    socialInsuranceEnrolled: employee?.social_insurance_enrolled === true,
    longTermCareInsured: employee?.long_term_care_insured === true,
    healthInsurance: toNumber(record.health_insurance),
    longTermCareInsurance: toNumber(record.long_term_care_insurance),
    pensionInsurance: toNumber(record.pension_insurance),
    employmentInsurance: toNumber(record.employment_insurance),
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
        {TEXT.saved}
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
      "id,year_month,salary_type,work_days,break_minutes_total,regular_hours,night_hours,hourly_rate,night_rate,monthly_salary,regular_pay,night_pay,transportation_amount,gross_payment,health_insurance,long_term_care_insurance,pension_insurance,employment_insurance,income_tax,meal_deduction,rent_deduction,other_deduction,deduction_total,net_payment,source,employees:employee_id(id,name,full_name,display_name,employee_no,employee_code,nearest_station,social_insurance_enrolled,long_term_care_insured)",
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
          <BackToHomeLink />
          <Link
            href="/payroll"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {TEXT.back}
          </Link>
          <h1 className="text-2xl font-semibold tracking-normal">
            {TEXT.title} {yearMonth}
          </h1>
          <p className="text-sm text-muted-foreground">{TEXT.description}</p>
        </div>
        <div className="flex max-w-md flex-col gap-2 rounded-md border bg-background p-4 text-sm text-muted-foreground shadow-sm">
          <p>{TEXT.adminExports}</p>
          <Button asChild variant="outline">
            <Link href={`/admin/exports?yearMonth=${encodeURIComponent(yearMonth)}`}>
              {TEXT.openAdminExports}
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
              {TEXT.loading}
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
