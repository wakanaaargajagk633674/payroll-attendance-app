import Link from "next/link";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  generatePayrollPreview,
  summarizePayrollPreview,
  type PayrollGenerationAttendance,
  type PayrollGenerationEmployee,
  type PayrollGenerationPreview,
} from "@/lib/payroll/generate-payroll";
import { createClient } from "@/lib/supabase/server";

import { generateMonthlyPayroll } from "./actions";

type SearchParams = Promise<{
  yearMonth?: string | string[];
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

type ExistingPayrollRecord = {
  id: string;
  employee_id: string;
  source: string | null;
};

const moneyFormatter = new Intl.NumberFormat("ja-JP");
const integerFormatter = new Intl.NumberFormat("ja-JP");
const decimalFormatter = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
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

function displayTime(value: string) {
  const match = value.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : value;
}

function formatMoney(value: number) {
  return moneyFormatter.format(value);
}

function formatHours(value: number) {
  return decimalFormatter.format(value);
}

function formatBreakMinutes(value: number) {
  return `${integerFormatter.format(value)}分`;
}

function sourceSummary(records: ExistingPayrollRecord[]) {
  const sources = Array.from(
    new Set(records.map((record) => record.source).filter(Boolean)),
  );

  return sources.length > 0 ? sources.join(", ") : "-";
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
        月次給与を作成しました。
      </div>
    );
  }

  return null;
}

function MonthSelector({ yearMonth }: { yearMonth: string }) {
  return (
    <section className="rounded-md border bg-background p-5 shadow-sm">
      <form className="grid gap-4 md:grid-cols-[180px_auto] md:items-end">
        <div className="grid gap-2">
          <Label htmlFor="yearMonth">対象月</Label>
          <Input
            id="yearMonth"
            name="yearMonth"
            type="month"
            defaultValue={yearMonth}
          />
        </div>
        <Button type="submit">表示</Button>
      </form>
    </section>
  );
}

function SummaryCards({ previews }: { previews: PayrollGenerationPreview[] }) {
  const totals = summarizePayrollPreview(previews);

  return (
    <section className="grid gap-3 rounded-md border bg-background p-4 shadow-sm md:grid-cols-5">
      <div>
        <p className="text-xs text-muted-foreground">対象人数</p>
        <p className="text-xl font-semibold tabular-nums">
          {integerFormatter.format(previews.length)}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">勤務日数合計</p>
        <p className="text-xl font-semibold tabular-nums">
          {integerFormatter.format(totals.workDays)}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">通常/深夜時間</p>
        <p className="text-xl font-semibold tabular-nums">
          {formatHours(totals.regularHours)} / {formatHours(totals.nightHours)}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">総支給額合計</p>
        <p className="text-xl font-semibold tabular-nums">
          {formatMoney(totals.grossPayment)}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">差引支給額合計</p>
        <p className="text-xl font-semibold tabular-nums">
          {formatMoney(totals.netPayment)}
        </p>
      </div>
    </section>
  );
}

function DailyDetail({ preview }: { preview: PayrollGenerationPreview }) {
  return (
    <details className="group">
      <summary className="cursor-pointer text-sm font-medium underline-offset-4 hover:underline">
        詳細
      </summary>
      <div className="mt-3 overflow-x-auto rounded-md border bg-background">
        <table className="w-full min-w-[620px] text-xs">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">日付</th>
              <th className="px-3 py-2 text-left font-medium">出勤</th>
              <th className="px-3 py-2 text-left font-medium">退勤</th>
              <th className="px-3 py-2 text-right font-medium">休憩</th>
              <th className="px-3 py-2 text-right font-medium">通常時間</th>
              <th className="px-3 py-2 text-right font-medium">深夜時間</th>
              <th className="px-3 py-2 text-right font-medium">日額給与</th>
            </tr>
          </thead>
          <tbody>
            {preview.dailyRows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-4 text-center text-muted-foreground"
                >
                  勤務日の勤怠がありません。
                </td>
              </tr>
            ) : (
              preview.dailyRows.map((row) => (
                <tr key={row.workDate} className="border-t">
                  <td className="whitespace-nowrap px-3 py-2">
                    {row.workDate}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {displayTime(row.clockIn)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {displayTime(row.clockOut)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {formatBreakMinutes(row.breakMinutes)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {formatHours(row.regularHours)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {formatHours(row.nightHours)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                    {row.dailyPay > 0 ? formatMoney(row.dailyPay) : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function PayrollPreviewTable({
  yearMonth,
  previews,
  existingRecords,
}: {
  yearMonth: string;
  previews: PayrollGenerationPreview[];
  existingRecords: ExistingPayrollRecord[];
}) {
  const totals = summarizePayrollPreview(previews);
  const hasExistingPayroll = existingRecords.length > 0;

  return (
    <section className="rounded-md border bg-background shadow-sm">
      <div className="flex flex-col gap-3 border-b px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">給与プレビュー</h2>
          <p className="text-sm text-muted-foreground">
            attendance_records から {yearMonth} の給与を集計しています。
          </p>
        </div>
        <form action={generateMonthlyPayroll}>
          <input type="hidden" name="year_month" value={yearMonth} />
          <Button type="submit" disabled={previews.length === 0}>
            この内容で月次給与を作成
          </Button>
        </form>
      </div>

      {hasExistingPayroll ? (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          既存データがあります。作成すると上書きします。
          <span className="ml-2">
            {existingRecords.length}件 / source: {sourceSummary(existingRecords)}
          </span>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1900px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-3 font-medium">表示名</th>
              <th className="px-3 py-3 font-medium">本名</th>
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
              <th className="px-3 py-3 text-right font-medium">控除合計</th>
              <th className="px-3 py-3 text-right font-medium">差引支給額</th>
              <th className="px-3 py-3 font-medium">詳細</th>
            </tr>
          </thead>
          <tbody>
            {previews.length === 0 ? (
              <tr>
                <td
                  colSpan={17}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  active=true の従業員がありません。
                </td>
              </tr>
            ) : (
              previews.map((preview) => (
                <tr
                  key={preview.employeeId}
                  className="border-t align-top transition-colors hover:bg-muted/40"
                >
                  <td className="whitespace-nowrap px-3 py-3 font-medium">
                    {preview.displayName || "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {preview.name || "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <Badge variant="secondary">{preview.salaryType}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {integerFormatter.format(preview.workDays)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {formatBreakMinutes(preview.breakMinutesTotal)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {formatHours(preview.regularHours)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {formatHours(preview.nightHours)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {formatMoney(preview.hourlyRate)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {formatMoney(preview.nightRate)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {preview.monthlySalary > 0
                      ? formatMoney(preview.monthlySalary)
                      : "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {formatMoney(preview.regularPay)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {formatMoney(preview.nightPay)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {formatMoney(preview.transportationAmount)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {formatMoney(preview.grossPayment)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {formatMoney(preview.deductionTotal)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {formatMoney(preview.netPayment)}
                  </td>
                  <td className="min-w-[640px] px-3 py-3">
                    <DailyDetail preview={preview} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {previews.length > 0 ? (
            <tfoot className="border-t bg-muted/40 font-semibold">
              <tr>
                <td className="whitespace-nowrap px-3 py-3">合計</td>
                <td className="px-3 py-3" />
                <td className="px-3 py-3" />
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {integerFormatter.format(totals.workDays)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {formatBreakMinutes(totals.breakMinutesTotal)}
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
                  {formatMoney(totals.deductionTotal)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {formatMoney(totals.netPayment)}
                </td>
                <td className="px-3 py-3" />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </section>
  );
}

async function PayrollGenerateContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const yearMonth = normalizeYearMonth(firstParam(params.yearMonth));
  const range = monthRange(yearMonth);
  const supabase = await createClient();
  const [employeesResult, attendanceResult, payrollResult] = await Promise.all([
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
      .select("id,employee_id,source")
      .eq("year_month", yearMonth),
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

  if (payrollResult.error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {payrollResult.error.message}
      </div>
    );
  }

  const employees = ((employeesResult.data ?? []) as EmployeeRecord[])
    .map(normalizeEmployee)
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));
  const attendanceRecords = ((attendanceResult.data ?? []) as AttendanceRecord[])
    .map(normalizeAttendance)
    .filter(
      (record): record is PayrollGenerationAttendance => record !== null,
    );
  const previews = generatePayrollPreview(employees, attendanceRecords);
  const existingRecords = (payrollResult.data ?? []) as ExistingPayrollRecord[];

  return (
    <>
      <MonthSelector yearMonth={yearMonth} />
      <SummaryCards previews={previews} />
      <PayrollPreviewTable
        yearMonth={yearMonth}
        previews={previews}
        existingRecords={existingRecords}
      />
    </>
  );
}

export default function PayrollGeneratePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link
            href="/payroll"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            給与月一覧へ戻る
          </Link>
          <h1 className="text-2xl font-semibold tracking-normal">
            月次給与作成
          </h1>
          <p className="text-sm text-muted-foreground">
            勤怠データから給与をプレビューし、payroll_records に保存します。
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
          <PayrollGenerateContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
