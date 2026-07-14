import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ADMIN_EXPORT_COOKIE_NAME,
  isAdminExportPasswordConfigured,
  verifyAdminExportToken,
} from "@/lib/admin/export-auth";
import {
  exportAccountantPayrollWorkbook,
  type AccountantPayrollRecord,
} from "@/lib/payroll/export-accountant-payroll";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{
  yearMonth: string;
}>;

type EmployeeRecord = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  salary_type?: string | null;
  hourly_rate?: number | string | null;
  monthly_salary?: number | string | null;
  night_rate?: number | string | null;
  transportation_per_day?: number | string | null;
  transportation_max?: number | string | null;
  transportation_max_days?: number | string | null;
  nearest_station?: string | null;
};

type PayrollRecord = {
  id: string;
  year_month: string | null;
  salary_type: string | null;
  hourly_rate: number | string | null;
  monthly_salary: number | string | null;
  night_rate: number | string | null;
  work_days: number | string | null;
  break_minutes_total: number | string | null;
  regular_hours: number | string | null;
  night_hours: number | string | null;
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
  employees?: EmployeeRecord | EmployeeRecord[] | null;
};

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numberValue =
    typeof value === "number"
      ? value
      : Number.parseFloat(String(value).replace(/,/g, "").trim());

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function employeeFromRecord(record: PayrollRecord) {
  if (Array.isArray(record.employees)) {
    return record.employees[0] ?? null;
  }

  return record.employees ?? null;
}

function employeeName(record: PayrollRecord) {
  const employee = employeeFromRecord(record);

  return employee?.name || employee?.full_name || "\u6c0f\u540d\u672a\u8a2d\u5b9a";
}

function sortPayrollRecords(a: PayrollRecord, b: PayrollRecord) {
  return employeeName(a).localeCompare(employeeName(b), "ja");
}

function fallbackValue(primary: unknown, fallback: unknown) {
  if (primary === null || primary === undefined || primary === "") {
    return fallback;
  }

  return primary;
}

function toAccountantPayrollRecord(
  record: PayrollRecord,
  fallbackYearMonth: string,
): AccountantPayrollRecord {
  const employee = employeeFromRecord(record);
  const salaryType = record.salary_type ?? employee?.salary_type ?? null;

  return {
    yearMonth: record.year_month ?? fallbackYearMonth,
    employeeName: employeeName(record),
    salaryType,
    hourlyRate: toNumber(fallbackValue(record.hourly_rate, employee?.hourly_rate)),
    monthlySalary: toNumber(
      fallbackValue(record.monthly_salary, employee?.monthly_salary),
    ),
    nightRate: toNumber(fallbackValue(record.night_rate, employee?.night_rate)),
    workDays: toNumber(record.work_days),
    breakMinutesTotal: toNumber(record.break_minutes_total),
    regularHours: toNumber(record.regular_hours),
    nightHours: toNumber(record.night_hours),
    nearestStation: employee?.nearest_station ?? "",
    regularPay: toNumber(record.regular_pay),
    nightPay: toNumber(record.night_pay),
    transportationPerDay: toNumber(employee?.transportation_per_day),
    transportationAmount: toNumber(record.transportation_amount),
    grossPayment: toNumber(record.gross_payment),
    incomeTax: toNumber(record.income_tax),
    mealDeduction: toNumber(record.meal_deduction),
    rentDeduction: toNumber(record.rent_deduction),
    otherDeduction: toNumber(record.other_deduction),
    deductionTotal: toNumber(record.deduction_total),
    netPayment: toNumber(record.net_payment),
  };
}

function encodeContentDispositionFilename(filename: string) {
  return `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(
    filename,
  )}`;
}

function noDataMessage(yearMonth: string) {
  return `${yearMonth} \u306e\u7d66\u4e0e\u30c7\u30fc\u30bf\u304c\u3042\u308a\u307e\u305b\u3093\u3002`;
}

async function adminExportAuthRedirect(request: Request) {
  const url = new URL("/admin/exports", request.url);
  const cookieStore = await cookies();

  if (!isAdminExportPasswordConfigured()) {
    url.searchParams.set("error", "password_unset");
    return NextResponse.redirect(url);
  }

  if (
    !verifyAdminExportToken(cookieStore.get(ADMIN_EXPORT_COOKIE_NAME)?.value)
  ) {
    url.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(url);
  }

  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Params },
) {
  const authRedirect = await adminExportAuthRedirect(request);

  if (authRedirect) {
    return authRedirect;
  }

  const { yearMonth } = await params;
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("payroll_records")
    .select(
      "id,year_month,salary_type,hourly_rate,monthly_salary,night_rate,work_days,break_minutes_total,regular_hours,night_hours,regular_pay,night_pay,transportation_amount,gross_payment,income_tax,meal_deduction,rent_deduction,other_deduction,deduction_total,net_payment,employees:employee_id(id,name,full_name,salary_type,hourly_rate,monthly_salary,night_rate,transportation_per_day,transportation_max,transportation_max_days,nearest_station)",
    )
    .eq("year_month", yearMonth);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const records = ((data ?? []) as PayrollRecord[])
    .sort(sortPayrollRecords)
    .map((record) => toAccountantPayrollRecord(record, yearMonth));

  if (records.length === 0) {
    return NextResponse.json(
      { error: noDataMessage(yearMonth) },
      { status: 404 },
    );
  }

  const workbookBuffer = await exportAccountantPayrollWorkbook(yearMonth, records);
  const filename = `accountant-payroll-${yearMonth}.xlsx`;

  return new Response(workbookBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": encodeContentDispositionFilename(filename),
      "Content-Length": String(workbookBuffer.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
