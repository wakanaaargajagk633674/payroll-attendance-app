import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateAttendance } from "@/lib/payroll/calculate-attendance";
import { createClient } from "@/lib/supabase/server";

import { PrintButton } from "./print-button";

type SearchParams = Promise<{
  yearMonth?: string | string[];
  employeeId?: string | string[];
}>;

type EmployeeRecord = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  employee_no?: string | null;
  employee_code?: string | null;
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
  notes?: string | null;
};

type PrintRow = {
  workDate: string;
  day: number;
  weekday: string;
  isWeekend: boolean;
  clockIn: string;
  clockOut: string;
  breakMinutes: number;
  regularHours: number;
  nightHours: number;
  status: string;
  notes: string;
};

const TEXT = {
  title: "\u6708\u5225\u52e4\u6020\u78ba\u8a8d\u8868",
  back: "\u6708\u5225\u52e4\u6020\u5165\u529b\u3078\u623b\u308b",
  description:
    "\u5f93\u696d\u54e1\u5225\u306b\u5bfe\u8c61\u6708\u306e\u52e4\u6020\u3092A4\u3067\u5370\u5237\u3067\u304d\u307e\u3059\u3002",
  yearMonth: "\u5bfe\u8c61\u6708",
  employee: "\u5f93\u696d\u54e1",
  show: "\u8868\u793a",
  selectEmployee:
    "\u5bfe\u8c61\u6708\u3068\u5f93\u696d\u54e1\u3092\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  noActiveEmployee:
    "active=true \u306e\u5f93\u696d\u54e1\u304c\u3042\u308a\u307e\u305b\u3093\u3002",
  noEmployee: "\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044",
  displayName: "\u8868\u793a\u540d",
  name: "\u672c\u540d",
  employeeNo: "\u793e\u54e1NO",
  salaryType: "\u7d66\u4e0e\u533a\u5206",
  printDate: "\u5370\u5237\u65e5",
  date: "\u65e5\u4ed8",
  weekday: "\u66dc\u65e5",
  clockIn: "\u51fa\u52e4",
  clockOut: "\u9000\u52e4",
  breakMinutes: "\u4f11\u61a9",
  regularHours: "\u901a\u5e38\u6642\u9593",
  nightHours: "\u6df1\u591c\u6642\u9593",
  status: "status",
  notes: "\u5099\u8003\u30fb\u78ba\u8a8d",
  summary: "\u6708\u5408\u8a08",
  workDays: "\u52e4\u52d9\u65e5\u6570",
  breakTotal: "\u4f11\u61a9\u5408\u8a08",
  totalHours: "\u7dcf\u52e4\u52d9\u6642\u9593",
  referencePay: "\u53c2\u8003\u7d66\u4e0e",
  regularPay: "\u901a\u5e38\u7d66\u4e0e",
  nightPay: "\u6df1\u591c\u7d66\u4e0e",
  totalPay: "\u5408\u8a08",
  monthlySalary: "\u6708\u7d66",
  employeeSign: "\u5f93\u696d\u54e1\u78ba\u8a8d\u30b5\u30a4\u30f3",
  managerSign: "\u5e97\u9577\u78ba\u8a8d\u30b5\u30a4\u30f3",
  remarks: "\u5099\u8003",
  loading: "\u8aad\u307f\u8fbc\u307f\u4e2d...",
  unconfiguredName: "\u6c0f\u540d\u672a\u8a2d\u5b9a",
};

const weekdayFormatter = new Intl.DateTimeFormat("ja-JP", {
  weekday: "short",
});
const moneyFormatter = new Intl.NumberFormat("ja-JP");
const decimalFormatter = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const printDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function defaultYearMonth() {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  });

  return formatter.format(new Date());
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
    typeof value === "number"
      ? value
      : Number.parseFloat(String(value).replace(/,/g, "").trim());

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
    return `${displayName}\uff08${name}\uff09`;
  }

  return displayName || name || TEXT.unconfiguredName;
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

function formatYearMonth(yearMonth: string) {
  const [year, month] = yearMonth.split("-");
  return `${year}\u5e74${Number(month)}\u6708`;
}

function displayTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const match = value.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : value;
}

function hasStoredHours(value: unknown) {
  return value !== null && value !== undefined && value !== "";
}

function calculatedHours(record: AttendanceRecord) {
  const clockIn = displayTime(record.clock_in);
  const clockOut = displayTime(record.clock_out);

  if (!clockIn || !clockOut) {
    return { regularHours: 0, nightHours: 0 };
  }

  if (hasStoredHours(record.regular_hours) || hasStoredHours(record.night_hours)) {
    return {
      regularHours: toNumber(record.regular_hours),
      nightHours: toNumber(record.night_hours),
    };
  }

  try {
    return calculateAttendance({
      clockIn,
      clockOut,
      breakMinutes: toNumber(record.break_minutes),
    });
  } catch {
    return { regularHours: 0, nightHours: 0 };
  }
}

function buildPrintRows(yearMonth: string, records: AttendanceRecord[]) {
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
    const weekday = date.getDay();
    const record = recordMap.get(workDate);
    const hours = record
      ? calculatedHours(record)
      : { regularHours: 0, nightHours: 0 };

    return {
      workDate,
      day,
      weekday: weekdayFormatter.format(date),
      isWeekend: weekday === 0 || weekday === 6,
      clockIn: displayTime(record?.clock_in),
      clockOut: displayTime(record?.clock_out),
      breakMinutes: toNumber(record?.break_minutes),
      regularHours: hours.regularHours,
      nightHours: hours.nightHours,
      status: record?.status ?? "",
      notes: record?.notes ?? "",
    };
  });
}

function isWorkDay(row: PrintRow) {
  if (row.status === "off" || row.status === "absent") {
    return false;
  }

  return Boolean(row.clockIn && row.clockOut);
}

function formatHours(value: number) {
  return decimalFormatter.format(value);
}

function formatMoney(value: number) {
  return moneyFormatter.format(Math.round(value));
}

function formatBreak(totalMinutes: number) {
  return `${totalMinutes}\u5206 / ${formatHours(totalMinutes / 60)}\u6642\u9593`;
}

function calculateNightRate(employee: EmployeeRecord) {
  const hourlyRate = toNumber(employee.hourly_rate);
  const nightRate = toNumber(employee.night_rate);

  return nightRate > 0 ? nightRate : Math.round(hourlyRate * 1.25);
}

function PrintStyles() {
  return (
    <style>{`
      @page {
        size: A4 portrait;
        margin: 9mm;
      }

      @media print {
        body {
          background: #fff !important;
        }

        .no-print {
          display: none !important;
        }

        .print-shell {
          padding: 0 !important;
          background: #fff !important;
        }

        .print-page {
          max-width: none !important;
          border: 0 !important;
          box-shadow: none !important;
          padding: 0 !important;
        }

        .print-table {
          font-size: 10px;
        }

        .print-table th,
        .print-table td {
          padding: 3px 5px !important;
        }

        .signature-box {
          min-height: 42px !important;
        }
      }
    `}</style>
  );
}

function Selector({
  yearMonth,
  employeeId,
  employees,
}: {
  yearMonth: string;
  employeeId: string;
  employees: EmployeeRecord[];
}) {
  return (
    <section className="no-print rounded-md border bg-background p-5 shadow-sm">
      <form className="grid gap-4 md:grid-cols-[180px_1fr_auto_auto] md:items-end">
        <div className="grid gap-2">
          <Label htmlFor="yearMonth">{TEXT.yearMonth}</Label>
          <Input
            id="yearMonth"
            name="yearMonth"
            type="month"
            defaultValue={yearMonth}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="employeeId">{TEXT.employee}</Label>
          <select
            id="employeeId"
            name="employeeId"
            defaultValue={employeeId}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">{TEXT.noEmployee}</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employeeOptionLabel(employee)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          {TEXT.show}
        </Button>
        <PrintButton />
      </form>
    </section>
  );
}

function AttendancePrintView({
  yearMonth,
  employee,
  rows,
}: {
  yearMonth: string;
  employee: EmployeeRecord;
  rows: PrintRow[];
}) {
  const totals = rows.reduce(
    (summary, row) => ({
      workDays: summary.workDays + (isWorkDay(row) ? 1 : 0),
      breakMinutes:
        summary.breakMinutes + (isWorkDay(row) ? row.breakMinutes : 0),
      regularHours: summary.regularHours + row.regularHours,
      nightHours: summary.nightHours + row.nightHours,
    }),
    {
      workDays: 0,
      breakMinutes: 0,
      regularHours: 0,
      nightHours: 0,
    },
  );
  const hourlyRate = toNumber(employee.hourly_rate);
  const nightRate = calculateNightRate(employee);
  const regularPay = Math.round(totals.regularHours * hourlyRate);
  const nightPay = Math.round(totals.nightHours * nightRate);
  const totalPay = regularPay + nightPay;
  const isHourly = employee.salary_type === "hourly";
  const displayName = employeeDisplayName(employee);
  const name = employeeName(employee);

  return (
    <article className="print-page rounded-xl border bg-white p-6 shadow-sm">
      <header className="border-b pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-normal text-slate-950">
              {TEXT.title}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {formatYearMonth(yearMonth)}
            </p>
          </div>
          <div className="text-sm text-slate-600 md:text-right">
            {TEXT.printDate}: {printDateFormatter.format(new Date())}
          </div>
        </div>

        <dl className="mt-4 grid gap-2 text-sm md:grid-cols-5">
          <div className="rounded-md bg-slate-50 p-2">
            <dt className="text-xs text-slate-500">{TEXT.displayName}</dt>
            <dd className="font-semibold">{displayName || "-"}</dd>
          </div>
          <div className="rounded-md bg-slate-50 p-2 md:col-span-2">
            <dt className="text-xs text-slate-500">{TEXT.name}</dt>
            <dd className="font-semibold">{name || "-"}</dd>
          </div>
          <div className="rounded-md bg-slate-50 p-2">
            <dt className="text-xs text-slate-500">{TEXT.employeeNo}</dt>
            <dd className="font-semibold">
              {employee.employee_no || employee.employee_code || "-"}
            </dd>
          </div>
          <div className="rounded-md bg-slate-50 p-2">
            <dt className="text-xs text-slate-500">{TEXT.salaryType}</dt>
            <dd className="font-semibold">{employee.salary_type || "-"}</dd>
          </div>
        </dl>
      </header>

      <section className="mt-4 grid gap-2 text-sm md:grid-cols-5">
        <SummaryItem label={TEXT.workDays} value={`${totals.workDays}`} />
        <SummaryItem label={TEXT.breakTotal} value={formatBreak(totals.breakMinutes)} />
        <SummaryItem label={TEXT.regularHours} value={formatHours(totals.regularHours)} />
        <SummaryItem label={TEXT.nightHours} value={formatHours(totals.nightHours)} />
        <SummaryItem
          label={TEXT.totalHours}
          value={formatHours(totals.regularHours + totals.nightHours)}
        />
      </section>

      <section className="mt-3 rounded-md border border-slate-200 p-3 text-sm">
        <h2 className="font-semibold">{TEXT.referencePay}</h2>
        {isHourly ? (
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <SummaryItem label={TEXT.regularPay} value={formatMoney(regularPay)} />
            <SummaryItem label={TEXT.nightPay} value={formatMoney(nightPay)} />
            <SummaryItem label={TEXT.totalPay} value={formatMoney(totalPay)} />
          </div>
        ) : (
          <div className="mt-2">
            <SummaryItem
              label={TEXT.monthlySalary}
              value={formatMoney(toNumber(employee.monthly_salary))}
            />
          </div>
        )}
      </section>

      <section className="mt-4 overflow-hidden rounded-md border border-slate-300">
        <table className="print-table w-full border-collapse text-xs">
          <thead className="bg-slate-100">
            <tr>
              <TableHeader>{TEXT.date}</TableHeader>
              <TableHeader>{TEXT.weekday}</TableHeader>
              <TableHeader>{TEXT.clockIn}</TableHeader>
              <TableHeader>{TEXT.clockOut}</TableHeader>
              <TableHeader>{TEXT.breakMinutes}</TableHeader>
              <TableHeader align="right">{TEXT.regularHours}</TableHeader>
              <TableHeader align="right">{TEXT.nightHours}</TableHeader>
              <TableHeader>{TEXT.status}</TableHeader>
              <TableHeader>{TEXT.notes}</TableHeader>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.workDate}
                className={row.isWeekend ? "bg-slate-50" : undefined}
              >
                <TableCell>{`${row.day}\u65e5`}</TableCell>
                <TableCell>{row.weekday}</TableCell>
                <TableCell>{row.clockIn || ""}</TableCell>
                <TableCell>{row.clockOut || ""}</TableCell>
                <TableCell>{row.breakMinutes ? `${row.breakMinutes}\u5206` : ""}</TableCell>
                <TableCell align="right">
                  {row.regularHours ? formatHours(row.regularHours) : ""}
                </TableCell>
                <TableCell align="right">
                  {row.nightHours ? formatHours(row.nightHours) : ""}
                </TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>{row.notes}</TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-5 grid gap-3 text-sm md:grid-cols-3">
        <SignatureBox label={TEXT.employeeSign} />
        <SignatureBox label={TEXT.managerSign} />
        <SignatureBox label={TEXT.remarks} />
      </section>
    </article>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-right font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function TableHeader({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`border border-slate-300 px-2 py-2 font-semibold ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      className={`border border-slate-300 px-2 py-1.5 ${
        align === "right" ? "text-right tabular-nums" : ""
      }`}
    >
      {children}
    </td>
  );
}

function SignatureBox({ label }: { label: string }) {
  return (
    <div className="signature-box min-h-20 rounded-md border border-slate-300 p-2">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
    </div>
  );
}

async function AttendancePrintContent({
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
      "id,name,full_name,display_name,employee_no,employee_code,salary_type,hourly_rate,night_rate,monthly_salary,active",
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
  let rows: PrintRow[] = [];

  if (selectedEmployee) {
    const range = monthRange(yearMonth);
    const attendanceResult = await supabase
      .from("attendance_records")
      .select(
        "id,work_date,clock_in,clock_out,break_minutes,regular_hours,night_hours,status,notes",
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

    rows = buildPrintRows(
      yearMonth,
      (attendanceResult.data ?? []) as AttendanceRecord[],
    );
  }

  return (
    <>
      <Selector yearMonth={yearMonth} employeeId={employeeId} employees={employees} />

      {employees.length === 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {TEXT.noActiveEmployee}
        </div>
      ) : null}

      {!selectedEmployee && employees.length > 0 ? (
        <div className="rounded-md border bg-background px-4 py-8 text-center text-sm text-muted-foreground shadow-sm">
          {TEXT.selectEmployee}
        </div>
      ) : null}

      {selectedEmployee ? (
        <AttendancePrintView
          yearMonth={yearMonth}
          employee={selectedEmployee}
          rows={rows}
        />
      ) : null}
    </>
  );
}

export default function AttendancePrintPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="print-shell min-h-screen bg-muted/30 px-4 py-8">
      <PrintStyles />
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="no-print flex flex-col gap-2">
          <Link
            href="/attendance/monthly"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {TEXT.back}
          </Link>
          <h1 className="text-2xl font-semibold tracking-normal">
            {TEXT.title}
          </h1>
          <p className="text-sm text-muted-foreground">{TEXT.description}</p>
        </div>

        <Suspense
          fallback={
            <section className="rounded-md border bg-background p-5 text-sm text-muted-foreground shadow-sm">
              {TEXT.loading}
            </section>
          }
        >
          <AttendancePrintContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
