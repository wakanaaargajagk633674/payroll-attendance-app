"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  generatePayrollPreview,
  type PayrollGenerationAttendance,
  type PayrollGenerationEmployee,
} from "@/lib/payroll/generate-payroll";
import { createClient } from "@/lib/supabase/server";

type EmployeeRecord = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  salary_type?: string | null;
  hourly_rate?: number | string | null;
  night_rate?: number | string | null;
  monthly_salary?: number | string | null;
  transportation_type?: string | null;
  transportation_per_day?: number | string | null;
  transportation_max?: number | string | null;
  transportation_max_days?: number | string | null;
};

type AttendanceRecord = {
  employee_id: string;
  work_date: string | null;
  clock_in: string | null;
  clock_out: string | null;
  break_minutes: number | string | null;
  regular_hours: number | string | null;
  night_hours: number | string | null;
  status: string | null;
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

function monthRange(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();

  return {
    start: `${yearMonth}-01`,
    end: `${yearMonth}-${String(lastDay).padStart(2, "0")}`,
  };
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numberValue =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function employeeName(employee: EmployeeRecord) {
  return employee.name || employee.full_name || employee.display_name || "";
}

function employeeDisplayName(employee: EmployeeRecord) {
  return employee.display_name || employee.name || employee.full_name || "";
}

function normalizeEmployee(employee: EmployeeRecord): PayrollGenerationEmployee {
  const hourlyRate = toNumber(employee.hourly_rate);
  const nightRate =
    toNumber(employee.night_rate) || Math.round(hourlyRate * 1.25);

  return {
    id: employee.id,
    name: employeeName(employee),
    displayName: employeeDisplayName(employee),
    salaryType: employee.salary_type ?? null,
    hourlyRate,
    nightRate,
    monthlySalary: toNumber(employee.monthly_salary),
    transportationType: employee.transportation_type ?? null,
    transportationPerDay: toNumber(employee.transportation_per_day),
    transportationMax: toNumber(employee.transportation_max),
    transportationMaxDays: toNumber(employee.transportation_max_days),
  };
}

function normalizeAttendance(
  record: AttendanceRecord,
): PayrollGenerationAttendance | null {
  if (!record.work_date) {
    return null;
  }

  return {
    employeeId: record.employee_id,
    workDate: record.work_date,
    clockIn: record.clock_in,
    clockOut: record.clock_out,
    breakMinutes: toNumber(record.break_minutes),
    regularHours: toNumber(record.regular_hours),
    nightHours: toNumber(record.night_hours),
    status: record.status,
  };
}

type ExistingDeductions = {
  employee_id: string;
  health_insurance: number | string | null;
  long_term_care_insurance: number | string | null;
  pension_insurance: number | string | null;
  employment_insurance: number | string | null;
  income_tax: number | string | null;
  meal_deduction: number | string | null;
  rent_deduction: number | string | null;
  other_deduction: number | string | null;
};

const EMPTY_DEDUCTIONS = {
  healthInsurance: 0,
  longTermCareInsurance: 0,
  pensionInsurance: 0,
  employmentInsurance: 0,
  incomeTax: 0,
  mealDeduction: 0,
  rentDeduction: 0,
  otherDeduction: 0,
};

async function buildPayrollPayloads(yearMonth: string) {
  const supabase = await createClient();
  const range = monthRange(yearMonth);
  const [employeesResult, attendanceResult, existingResult] = await Promise.all([
    supabase
      .from("employees")
      .select(
        "id,name,full_name,display_name,salary_type,hourly_rate,night_rate,monthly_salary,transportation_type,transportation_per_day,transportation_max,transportation_max_days,active",
      )
      .eq("active", true),
    supabase
      .from("attendance_records")
      .select(
        "employee_id,work_date,clock_in,clock_out,break_minutes,regular_hours,night_hours,status",
      )
      .gte("work_date", range.start)
      .lte("work_date", range.end),
    supabase
      .from("payroll_records")
      .select(
        "employee_id,health_insurance,long_term_care_insurance,pension_insurance,employment_insurance,income_tax,meal_deduction,rent_deduction,other_deduction",
      )
      .eq("year_month", yearMonth),
  ]);

  if (employeesResult.error) {
    throw new Error(employeesResult.error.message);
  }

  if (attendanceResult.error) {
    throw new Error(attendanceResult.error.message);
  }

  if (existingResult.error) {
    throw new Error(existingResult.error.message);
  }

  const existingDeductions = new Map(
    ((existingResult.data ?? []) as ExistingDeductions[]).map((record) => [
      record.employee_id,
      {
        healthInsurance: toNumber(record.health_insurance),
        longTermCareInsurance: toNumber(record.long_term_care_insurance),
        pensionInsurance: toNumber(record.pension_insurance),
        employmentInsurance: toNumber(record.employment_insurance),
        incomeTax: toNumber(record.income_tax),
        mealDeduction: toNumber(record.meal_deduction),
        rentDeduction: toNumber(record.rent_deduction),
        otherDeduction: toNumber(record.other_deduction),
      },
    ]),
  );

  const employees = ((employeesResult.data ?? []) as EmployeeRecord[]).map(
    normalizeEmployee,
  );
  const attendanceRecords = ((attendanceResult.data ?? []) as AttendanceRecord[])
    .map(normalizeAttendance)
    .filter(
      (record): record is PayrollGenerationAttendance => record !== null,
    );
  const previews = generatePayrollPreview(employees, attendanceRecords);
  const updatedAt = new Date().toISOString();

  return previews.map((preview) => {
    // 所得税・食事代などは画面からの手入力。勤怠の再計算で消さずに引き継ぐ。
    const deductions =
      existingDeductions.get(preview.employeeId) ?? EMPTY_DEDUCTIONS;
    const deductionTotal = Math.round(
      deductions.healthInsurance +
        deductions.longTermCareInsurance +
        deductions.pensionInsurance +
        deductions.employmentInsurance +
        deductions.incomeTax +
        deductions.mealDeduction +
        deductions.rentDeduction +
        deductions.otherDeduction,
    );

    return {
      employee_id: preview.employeeId,
      year_month: yearMonth,
      payroll_month: `${yearMonth}-01`,
      salary_type: preview.salaryType,
      hourly_rate: preview.hourlyRate,
      monthly_salary:
        preview.salaryType === "monthly" ? preview.monthlySalary : null,
      night_rate: preview.nightRate,
      work_days: preview.workDays,
      break_minutes_total: preview.breakMinutesTotal,
      regular_hours: preview.regularHours,
      night_hours: preview.nightHours,
      regular_pay: preview.regularPay,
      night_pay: preview.nightPay,
      transportation_amount: preview.transportationAmount,
      gross_payment: preview.grossPayment,
      health_insurance: Math.round(deductions.healthInsurance),
      long_term_care_insurance: Math.round(deductions.longTermCareInsurance),
      pension_insurance: Math.round(deductions.pensionInsurance),
      employment_insurance: Math.round(deductions.employmentInsurance),
      income_tax: Math.round(deductions.incomeTax),
      meal_deduction: Math.round(deductions.mealDeduction),
      rent_deduction: Math.round(deductions.rentDeduction),
      other_deduction: Math.round(deductions.otherDeduction),
      deduction_total: deductionTotal,
      net_payment: Math.round(preview.grossPayment - deductionTotal),
      source: "attendance_generate",
      updated_at: updatedAt,
    };
  });
}

export async function generateMonthlyPayroll(formData: FormData) {
  const yearMonth = readText(formData, "year_month");
  let errorMessage: string | null = null;

  try {
    assertYearMonth(yearMonth);

    const payloads = await buildPayrollPayloads(yearMonth);

    if (payloads.length === 0) {
      throw new Error("対象の従業員がありません。");
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("payroll_records")
      .upsert(payloads, { onConflict: "employee_id,year_month" });

    if (error) {
      errorMessage = error.message;
    }
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "月次給与の作成に失敗しました。";
  }

  const query = new URLSearchParams({ yearMonth });

  if (errorMessage) {
    query.set("error", errorMessage);
    redirect(`/payroll/generate?${query.toString()}`);
  }

  revalidatePath("/payroll/generate");
  revalidatePath("/payroll");
  revalidatePath(`/payroll/${yearMonth}`);
  query.set("saved", "1");
  redirect(`/payroll/generate?${query.toString()}`);
}
