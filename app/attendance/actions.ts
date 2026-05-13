"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  calculateAttendance,
  formatClockTimeForDatabase,
} from "@/lib/payroll/calculate-attendance";
import { createClient } from "@/lib/supabase/server";

const allowedBreakMinutes = new Set([0, 30, 60, 90, 120]);

type AttendanceUpsert = {
  employee_id: string;
  work_date: string;
  clock_in: string;
  clock_out: string;
  break_minutes: number;
  regular_hours: number;
  night_hours: number;
  status: "draft";
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readBreakMinutes(formData: FormData) {
  const rawValue = readText(formData, "break_minutes");
  const breakMinutes = Number(rawValue);

  if (!Number.isInteger(breakMinutes) || !allowedBreakMinutes.has(breakMinutes)) {
    throw new Error("休憩時間を選択してください。");
  }

  return breakMinutes;
}

function readWorkDate(formData: FormData) {
  const workDate = readText(formData, "work_date");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
    throw new Error("日付を入力してください。");
  }

  return workDate;
}

function buildAttendancePayload(formData: FormData): AttendanceUpsert {
  const employeeId = readText(formData, "employee_id");
  const workDate = readWorkDate(formData);
  const clockIn = readText(formData, "clock_in");
  const clockOut = readText(formData, "clock_out");
  const breakMinutes = readBreakMinutes(formData);

  if (!employeeId) {
    throw new Error("従業員を選択してください。");
  }

  if (!clockIn || !clockOut) {
    throw new Error("出勤時間と退勤時間を入力してください。");
  }

  const calculation = calculateAttendance({
    clockIn,
    clockOut,
    breakMinutes,
  });

  return {
    employee_id: employeeId,
    work_date: workDate,
    clock_in: formatClockTimeForDatabase(clockIn),
    clock_out: formatClockTimeForDatabase(clockOut),
    break_minutes: breakMinutes,
    regular_hours: calculation.regularHours,
    night_hours: calculation.nightHours,
    status: "draft",
  };
}

export async function saveAttendance(formData: FormData) {
  let errorMessage: string | null = null;

  try {
    const payload = buildAttendancePayload(formData);
    const supabase = await createClient();
    const { error } = await supabase
      .from("attendance_records")
      .upsert(payload, { onConflict: "employee_id,work_date" });

    if (error) {
      errorMessage = error.message;
    }
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "勤怠の保存に失敗しました。";
  }

  if (errorMessage) {
    redirect(`/attendance?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/attendance");
  redirect("/attendance?saved=1");
}
