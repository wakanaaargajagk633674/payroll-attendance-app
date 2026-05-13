"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  calculateAttendance,
  formatClockTimeForDatabase,
} from "@/lib/payroll/calculate-attendance";
import { createClient } from "@/lib/supabase/server";

const allowedBreakMinutes = new Set([0, 30, 60, 90, 120]);
const allowedStatuses = new Set(["work", "off", "absent", "draft"]);

type MonthlyAttendanceRowInput = {
  workDate?: unknown;
  clockIn?: unknown;
  clockOut?: unknown;
  breakMinutes?: unknown;
  status?: unknown;
};

type AttendanceUpsert = {
  employee_id: string;
  work_date: string;
  clock_in: string | null;
  clock_out: string | null;
  break_minutes: number;
  regular_hours: number;
  night_hours: number;
  status: string;
  updated_at: string;
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readRows(formData: FormData): MonthlyAttendanceRowInput[] {
  const rawRows = readText(formData, "rows");

  if (!rawRows) {
    return [];
  }

  const parsedRows = JSON.parse(rawRows);

  if (!Array.isArray(parsedRows)) {
    throw new Error("勤怠行の形式が不正です。");
  }

  return parsedRows as MonthlyAttendanceRowInput[];
}

function assertYearMonth(yearMonth: string) {
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    throw new Error("対象月が不正です。");
  }
}

function assertWorkDate(workDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
    throw new Error("日付が不正です。");
  }
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toBreakMinutes(value: unknown) {
  const numberValue = Number(value ?? 0);

  if (!Number.isInteger(numberValue) || !allowedBreakMinutes.has(numberValue)) {
    throw new Error("休憩時間を選択してください。");
  }

  return numberValue;
}

function toStatus(value: unknown, hasClockTime: boolean) {
  const status = toStringValue(value);

  if (!status) {
    return hasClockTime ? "work" : "";
  }

  if (!allowedStatuses.has(status)) {
    throw new Error("status の値が不正です。");
  }

  return status;
}

function shouldSaveRow(
  clockIn: string,
  clockOut: string,
  status: string,
) {
  return Boolean(clockIn || clockOut || status);
}

function buildPayload(
  employeeId: string,
  row: MonthlyAttendanceRowInput,
): AttendanceUpsert | null {
  const workDate = toStringValue(row.workDate);
  const clockIn = toStringValue(row.clockIn);
  const clockOut = toStringValue(row.clockOut);
  const breakMinutes = toBreakMinutes(row.breakMinutes);
  const hasClockTime = Boolean(clockIn || clockOut);
  const status = toStatus(row.status, hasClockTime);

  if (!shouldSaveRow(clockIn, clockOut, status)) {
    return null;
  }

  assertWorkDate(workDate);

  let regularHours = 0;
  let nightHours = 0;
  let clockInForDatabase: string | null = null;
  let clockOutForDatabase: string | null = null;

  if (hasClockTime) {
    if (!clockIn || !clockOut) {
      throw new Error(`${workDate} の出勤・退勤を両方入力してください。`);
    }

    const calculation = calculateAttendance({
      clockIn,
      clockOut,
      breakMinutes,
    });
    regularHours = calculation.regularHours;
    nightHours = calculation.nightHours;
    clockInForDatabase = formatClockTimeForDatabase(clockIn);
    clockOutForDatabase = formatClockTimeForDatabase(clockOut);
  }

  return {
    employee_id: employeeId,
    work_date: workDate,
    clock_in: clockInForDatabase,
    clock_out: clockOutForDatabase,
    break_minutes: breakMinutes,
    regular_hours: regularHours,
    night_hours: nightHours,
    status: status || "work",
    updated_at: new Date().toISOString(),
  };
}

export async function saveMonthlyAttendance(formData: FormData) {
  const employeeId = readText(formData, "employee_id");
  const yearMonth = readText(formData, "year_month");
  let errorMessage: string | null = null;

  try {
    if (!employeeId) {
      throw new Error("従業員を選択してください。");
    }

    assertYearMonth(yearMonth);

    const rows = readRows(formData);
    const payloads = rows
      .map((row) => buildPayload(employeeId, row))
      .filter((payload): payload is AttendanceUpsert => payload !== null);

    if (payloads.length === 0) {
      throw new Error("保存する勤怠行がありません。");
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("attendance_records")
      .upsert(payloads, { onConflict: "employee_id,work_date" });

    if (error) {
      errorMessage = error.message;
    }
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "月別勤怠の保存に失敗しました。";
  }

  const query = new URLSearchParams({
    yearMonth,
    employeeId,
  });

  if (errorMessage) {
    query.set("error", errorMessage);
    redirect(`/attendance/monthly?${query.toString()}`);
  }

  revalidatePath("/attendance/monthly");
  query.set("saved", "1");
  redirect(`/attendance/monthly?${query.toString()}`);
}
