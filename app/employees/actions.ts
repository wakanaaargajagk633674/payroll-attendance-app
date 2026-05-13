"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type SalaryType = "hourly" | "monthly";

type EmployeePayload = Record<string, string | number | boolean | null>;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readNullableText(formData: FormData, key: string) {
  const value = readText(formData, key);
  return value.length > 0 ? value : null;
}

function readNullableNumber(formData: FormData, key: string) {
  const value = readText(formData, key);

  if (!value) {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`${key} は数値で入力してください。`);
  }

  return numberValue;
}

function readSalaryType(formData: FormData): SalaryType {
  const salaryType = readText(formData, "salary_type");

  if (salaryType !== "hourly" && salaryType !== "monthly") {
    throw new Error("給与タイプを選択してください。");
  }

  return salaryType;
}

function calculateNightRate(hourlyRate: number | null) {
  if (hourlyRate === null) {
    return null;
  }

  if (hourlyRate <= 0) {
    return 0;
  }

  return Math.round(hourlyRate * 1.25);
}

function buildEmployeePayload(formData: FormData): EmployeePayload {
  const name = readText(formData, "name");
  const salaryType = readSalaryType(formData);
  const inputHourlyRate = readNullableNumber(formData, "hourly_rate");
  const monthlySalary = readNullableNumber(formData, "monthly_salary");
  const hourlyRate =
    salaryType === "hourly" && inputHourlyRate === null ? 0 : inputHourlyRate;

  if (!name) {
    throw new Error("氏名を入力してください。");
  }

  if (salaryType === "monthly" && monthlySalary === null) {
    throw new Error("月給者は月給を入力してください。");
  }

  return {
    name,
    full_name: name,
    employee_no: readNullableText(formData, "employee_no"),
    display_name: readNullableText(formData, "display_name"),
    salary_type: salaryType,
    hourly_rate: hourlyRate,
    monthly_salary: salaryType === "monthly" ? monthlySalary : null,
    night_rate: calculateNightRate(hourlyRate),
    transportation_type: readNullableText(formData, "transportation_type"),
    transportation_per_day: readNullableNumber(
      formData,
      "transportation_per_day",
    ),
    transportation_max: readNullableNumber(formData, "transportation_max"),
    transportation_max_days: readNullableNumber(
      formData,
      "transportation_max_days",
    ),
    nearest_station: readNullableText(formData, "nearest_station"),
    active: formData.get("active") === "on",
  };
}

async function insertEmployee(payload: EmployeePayload) {
  const supabase = await createClient();
  const { error } = await supabase.from("employees").insert(payload);

  if (!error) {
    return null;
  }

  if (
    error.message.includes("full_name") ||
    error.message.includes("schema cache")
  ) {
    const payloadWithoutFullName = { ...payload };
    delete payloadWithoutFullName.full_name;

    const retry = await supabase.from("employees").insert(payloadWithoutFullName);
    return retry.error;
  }

  return error;
}

async function updateEmployeeById(id: string, payload: EmployeePayload) {
  const supabase = await createClient();
  const updatePayload: EmployeePayload = {
    ...payload,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("employees")
    .update(updatePayload)
    .eq("id", id);

  if (!error) {
    return null;
  }

  if (
    error.message.includes("full_name") ||
    error.message.includes("schema cache")
  ) {
    const payloadWithoutFullName = { ...updatePayload };
    delete payloadWithoutFullName.full_name;

    const retry = await supabase
      .from("employees")
      .update(payloadWithoutFullName)
      .eq("id", id);
    return retry.error;
  }

  return error;
}

export async function createEmployee(formData: FormData) {
  let errorMessage: string | null = null;

  try {
    const payload = buildEmployeePayload(formData);
    const error = await insertEmployee(payload);

    if (error) {
      errorMessage = error.message;
    }
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "従業員の登録に失敗しました。";
  }

  if (errorMessage) {
    redirect(`/employees?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/employees");
  redirect("/employees?created=1");
}

export async function updateEmployee(formData: FormData) {
  let errorMessage: string | null = null;

  try {
    const id = readText(formData, "id");

    if (!id) {
      throw new Error("更新対象の従業員IDがありません。");
    }

    const payload = buildEmployeePayload(formData);
    const error = await updateEmployeeById(id, payload);

    if (error) {
      errorMessage = error.message;
    }
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "従業員の更新に失敗しました。";
  }

  if (errorMessage) {
    redirect(`/employees?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/employees");
  redirect("/employees?updated=1");
}
