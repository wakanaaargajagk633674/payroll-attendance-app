import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";

import {
  AttendanceEmployeeSelect,
  type AttendanceEmployeeOption,
} from "./employee-select";
import { saveAttendance } from "./actions";

type SearchParams = Promise<{
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
  active?: boolean | null;
};

type AttendanceRecord = {
  id: string;
  employee_id: string;
  work_date: string | null;
  clock_in: string | null;
  clock_out: string | null;
  break_minutes: number | string | null;
  regular_hours: number | string | null;
  night_hours: number | string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  employees?: EmployeeRecord | EmployeeRecord[] | null;
};

const numberFormatter = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const integerFormatter = new Intl.NumberFormat("ja-JP");
const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "short",
  timeStyle: "short",
});

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function defaultWorkDate() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function employeeDisplayName(employee: EmployeeRecord | null | undefined) {
  return employee?.display_name || employee?.name || employee?.full_name || "";
}

function employeeName(employee: EmployeeRecord | null | undefined) {
  return employee?.name || employee?.full_name || employee?.display_name || "";
}

function employeeDisplayLabel(employee: EmployeeRecord | null | undefined) {
  const displayName = employeeDisplayName(employee);
  const name = employeeName(employee);

  if (displayName && name && displayName !== name) {
    return `${displayName}（${name}）`;
  }

  return displayName || name;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numberValue =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toAttendanceEmployeeOption(
  employee: EmployeeRecord,
): AttendanceEmployeeOption {
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

function recordEmployee(record: AttendanceRecord) {
  if (Array.isArray(record.employees)) {
    return record.employees[0] ?? null;
  }

  return record.employees ?? null;
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function displayTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const match = value.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : value;
}

function displayHours(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const numberValue =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  return Number.isFinite(numberValue)
    ? numberFormatter.format(numberValue)
    : String(value);
}

function displayInteger(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const numberValue =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  return Number.isFinite(numberValue)
    ? integerFormatter.format(numberValue)
    : String(value);
}

function displayDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateTimeFormatter.format(date);
}

function sortEmployees(a: EmployeeRecord, b: EmployeeRecord) {
  return employeeDisplayName(a).localeCompare(employeeDisplayName(b), "ja");
}

function sortAttendance(a: AttendanceRecord, b: AttendanceRecord) {
  const dateSort = displayValue(b.work_date).localeCompare(
    displayValue(a.work_date),
  );

  if (dateSort !== 0) {
    return dateSort;
  }

  return employeeDisplayName(recordEmployee(a)).localeCompare(
    employeeDisplayName(recordEmployee(b)),
    "ja",
  );
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
        勤怠を保存しました。
      </div>
    );
  }

  return null;
}

function AttendanceForm({ employees }: { employees: EmployeeRecord[] }) {
  return (
    <section className="rounded-md border bg-background p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-1">
        <h2 className="text-lg font-semibold">新規登録</h2>
        <p className="text-sm text-muted-foreground">
          同じ従業員・日付の勤怠がある場合は上書き保存されます。
        </p>
      </div>

      {employees.length === 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          active=true の従業員がありません。先に従業員マスターを登録してください。
        </div>
      ) : null}

      <form action={saveAttendance} className="mt-5 grid gap-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="grid gap-2 xl:col-span-2">
            <AttendanceEmployeeSelect
              employees={employees.map(toAttendanceEmployeeOption)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="work_date">日付</Label>
            <Input
              id="work_date"
              name="work_date"
              type="date"
              defaultValue={defaultWorkDate()}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="clock_in">出勤</Label>
            <Input id="clock_in" name="clock_in" type="time" required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="clock_out">退勤</Label>
            <Input id="clock_out" name="clock_out" type="time" required />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="grid gap-2">
            <Label htmlFor="break_minutes">休憩</Label>
            <select
              id="break_minutes"
              name="break_minutes"
              defaultValue="60"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="0">0分</option>
              <option value="30">30分</option>
              <option value="60">60分</option>
              <option value="90">90分</option>
              <option value="120">120分</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">status</Label>
            <Input id="status" value="draft" readOnly disabled />
          </div>

          <div className="flex items-end xl:col-span-3">
            <Button
              type="submit"
              disabled={employees.length === 0}
              className="ml-auto"
            >
              保存
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}

function AttendanceTable({ records }: { records: AttendanceRecord[] }) {
  return (
    <section className="rounded-md border bg-background shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
        <h2 className="text-lg font-semibold">勤怠一覧</h2>
        <span className="text-sm text-muted-foreground">
          {integerFormatter.format(records.length)} 件
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">日付</th>
              <th className="px-4 py-3 font-medium">従業員</th>
              <th className="px-4 py-3 font-medium">出勤</th>
              <th className="px-4 py-3 font-medium">退勤</th>
              <th className="px-4 py-3 text-right font-medium">休憩分</th>
              <th className="px-4 py-3 text-right font-medium">通常時間</th>
              <th className="px-4 py-3 text-right font-medium">深夜時間</th>
              <th className="px-4 py-3 font-medium">status</th>
              <th className="px-4 py-3 font-medium">作成日時</th>
              <th className="px-4 py-3 font-medium">更新日時</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  勤怠データはまだありません。
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr
                  key={record.id}
                  className="border-t transition-colors hover:bg-muted/40"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    {displayValue(record.work_date)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium">
                    {displayValue(employeeDisplayLabel(recordEmployee(record)))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {displayTime(record.clock_in)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {displayTime(record.clock_out)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {displayInteger(record.break_minutes)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {displayHours(record.regular_hours)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {displayHours(record.night_hours)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge variant="secondary">
                      {displayValue(record.status)}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {displayDateTime(record.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {displayDateTime(record.updated_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

async function AttendanceContent() {
  const supabase = await createClient();
  const [employeesResult, attendanceResult] = await Promise.all([
    supabase
      .from("employees")
      .select(
        "id,name,full_name,display_name,salary_type,hourly_rate,night_rate,monthly_salary,active",
      )
      .eq("active", true),
    supabase
      .from("attendance_records")
      .select(
        "id,employee_id,work_date,clock_in,clock_out,break_minutes,regular_hours,night_hours,status,created_at,updated_at,employees:employee_id(id,name,full_name,display_name)",
      )
      .order("work_date", { ascending: false })
      .limit(100),
  ]);

  if (employeesResult.error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {employeesResult.error.message}
      </div>
    );
  }

  if (attendanceResult.error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {attendanceResult.error.message}
      </div>
    );
  }

  const employees = ((employeesResult.data ?? []) as EmployeeRecord[]).sort(
    sortEmployees,
  );
  const records = ((attendanceResult.data ?? []) as AttendanceRecord[]).sort(
    sortAttendance,
  );

  return (
    <>
      <AttendanceForm employees={employees} />
      <AttendanceTable records={records} />
    </>
  );
}

export default function AttendancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-normal">勤怠入力</h1>
          <p className="text-sm text-muted-foreground">
            出勤・退勤・休憩から通常時間と深夜時間を自動計算します。
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
          <AttendanceContent />
        </Suspense>
      </div>
    </main>
  );
}
