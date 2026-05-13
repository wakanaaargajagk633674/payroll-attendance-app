import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";

import {
  MonthlyAttendanceForm,
  type MonthlyAttendanceEmployee,
  type MonthlyAttendanceRow,
} from "./monthly-attendance-form";

type SearchParams = Promise<{
  yearMonth?: string | string[];
  employeeId?: string | string[];
  saved?: string | string[];
  error?: string | string[];
}>;

type EmployeeRecord = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  salary_type?: string | null;
  hourly_rate?: number | string | null;
  night_rate?: number | string | null;
  monthly_salary?: number | string | null;
};

type AttendanceRecord = {
  id: string;
  work_date: string | null;
  clock_in: string | null;
  clock_out: string | null;
  break_minutes: number | string | null;
  regular_hours: number | string | null;
  night_hours: number | string | null;
  status: string | null;
};

const weekdayFormatter = new Intl.DateTimeFormat("ja-JP", {
  weekday: "short",
});

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function defaultYearMonth() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 7);
}

function normalizeYearMonth(value: string | undefined) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }

  return defaultYearMonth();
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numberValue =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function employeeDisplayName(employee: EmployeeRecord) {
  return employee.display_name || employee.name || employee.full_name || "";
}

function employeeName(employee: EmployeeRecord) {
  return employee.name || employee.full_name || employee.display_name || "";
}

function employeeOptionLabel(employee: EmployeeRecord) {
  const displayName = employeeDisplayName(employee);
  const name = employeeName(employee);

  if (displayName && name && displayName !== name) {
    return `${displayName}（${name}）`;
  }

  return displayName || name || "氏名未設定";
}

function sortEmployees(a: EmployeeRecord, b: EmployeeRecord) {
  return employeeDisplayName(a).localeCompare(employeeDisplayName(b), "ja");
}

function daysInMonth(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function monthRange(yearMonth: string) {
  const days = daysInMonth(yearMonth);

  return {
    start: `${yearMonth}-01`,
    end: `${yearMonth}-${String(days).padStart(2, "0")}`,
  };
}

function displayTime(value: string | null) {
  if (!value) {
    return "";
  }

  const match = value.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : value;
}

function buildMonthRows(
  yearMonth: string,
  records: AttendanceRecord[],
): MonthlyAttendanceRow[] {
  const [year, month] = yearMonth.split("-").map(Number);
  const recordMap = new Map(
    records
      .filter((record) => record.work_date)
      .map((record) => [record.work_date as string, record]),
  );

  return Array.from({ length: daysInMonth(yearMonth) }, (_, index) => {
    const day = index + 1;
    const workDate = `${yearMonth}-${String(day).padStart(2, "0")}`;
    const date = new Date(year, month - 1, day);
    const record = recordMap.get(workDate);
    const weekday = date.getDay();

    return {
      workDate,
      dayLabel: `${day}日`,
      weekdayLabel: weekdayFormatter.format(date),
      isWeekend: weekday === 0 || weekday === 6,
      clockIn: displayTime(record?.clock_in ?? null),
      clockOut: displayTime(record?.clock_out ?? null),
      breakMinutes: toNumber(record?.break_minutes),
      status: record?.status ?? "",
      regularHours: toNumber(record?.regular_hours),
      nightHours: toNumber(record?.night_hours),
    };
  });
}

function toMonthlyAttendanceEmployee(
  employee: EmployeeRecord,
): MonthlyAttendanceEmployee {
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
        月別勤怠を保存しました。
      </div>
    );
  }

  return null;
}

function MonthlySelector({
  yearMonth,
  employeeId,
  employees,
}: {
  yearMonth: string;
  employeeId: string;
  employees: EmployeeRecord[];
}) {
  return (
    <section className="rounded-md border bg-background p-5 shadow-sm">
      <form className="grid gap-4 md:grid-cols-[180px_1fr_auto] md:items-end">
        <div className="grid gap-2">
          <Label htmlFor="yearMonth">対象月</Label>
          <Input
            id="yearMonth"
            name="yearMonth"
            type="month"
            defaultValue={yearMonth}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="employeeId">従業員</Label>
          <select
            id="employeeId"
            name="employeeId"
            defaultValue={employeeId}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">選択してください</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employeeOptionLabel(employee)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">表示</Button>
      </form>
    </section>
  );
}

async function MonthlyAttendanceContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const yearMonth = normalizeYearMonth(firstParam(params.yearMonth));
  const employeeId = firstParam(params.employeeId) ?? "";
  const supabase = await createClient();

  const employeesResult = await supabase
    .from("employees")
    .select(
      "id,name,full_name,display_name,salary_type,hourly_rate,night_rate,monthly_salary,active",
    )
    .eq("active", true);

  if (employeesResult.error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {employeesResult.error.message}
      </div>
    );
  }

  const employees = ((employeesResult.data ?? []) as EmployeeRecord[]).sort(
    sortEmployees,
  );
  const selectedEmployee = employees.find((employee) => employee.id === employeeId);
  let records: AttendanceRecord[] = [];

  if (selectedEmployee) {
    const range = monthRange(yearMonth);
    const attendanceResult = await supabase
      .from("attendance_records")
      .select(
        "id,work_date,clock_in,clock_out,break_minutes,regular_hours,night_hours,status",
      )
      .eq("employee_id", selectedEmployee.id)
      .gte("work_date", range.start)
      .lte("work_date", range.end)
      .order("work_date", { ascending: true });

    if (attendanceResult.error) {
      return (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {attendanceResult.error.message}
        </div>
      );
    }

    records = (attendanceResult.data ?? []) as AttendanceRecord[];
  }

  return (
    <>
      <MonthlySelector
        yearMonth={yearMonth}
        employeeId={employeeId}
        employees={employees}
      />

      {employees.length === 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          active=true の従業員がありません。先に従業員マスターを登録してください。
        </div>
      ) : null}

      {!selectedEmployee && employees.length > 0 ? (
        <div className="rounded-md border bg-background px-4 py-8 text-center text-sm text-muted-foreground shadow-sm">
          対象月と従業員を選択してください。
        </div>
      ) : null}

      {selectedEmployee ? (
        <MonthlyAttendanceForm
          yearMonth={yearMonth}
          employee={toMonthlyAttendanceEmployee(selectedEmployee)}
          rows={buildMonthRows(yearMonth, records)}
        />
      ) : null}
    </>
  );
}

export default function MonthlyAttendancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link
            href="/attendance"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            通常の勤怠入力へ戻る
          </Link>
          <h1 className="text-2xl font-semibold tracking-normal">
            月別勤怠入力
          </h1>
          <p className="text-sm text-muted-foreground">
            従業員ごとに1ヶ月分の出勤・退勤・休憩をまとめて入力します。
          </p>
        </div>

        <Suspense>
          <ActionMessage searchParams={searchParams} />
        </Suspense>

        <Suspense
          fallback={
            <section className="rounded-md border bg-background p-5 text-sm text-muted-foreground shadow-sm">
              読み込み中...
            </section>
          }
        >
          <MonthlyAttendanceContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
