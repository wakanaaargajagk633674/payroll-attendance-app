"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateAttendance } from "@/lib/payroll/calculate-attendance";
import { cn } from "@/lib/utils";

import { saveMonthlyAttendance } from "./actions";

const breakOptions = [0, 30, 60, 90, 120] as const;
const moneyFormatter = new Intl.NumberFormat("ja-JP");
const decimalFormatter = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export type MonthlyAttendanceEmployee = {
  id: string;
  name: string;
  displayName: string;
  salaryType: string | null;
  hourlyRate: number;
  nightRate: number;
  monthlySalary: number;
};

export type MonthlyAttendanceRow = {
  workDate: string;
  dayLabel: string;
  weekdayLabel: string;
  isWeekend: boolean;
  clockIn: string;
  clockOut: string;
  breakMinutes: number;
  status: string;
  regularHours: number;
  nightHours: number;
};

type MonthlyAttendanceFormProps = {
  yearMonth: string;
  employee: MonthlyAttendanceEmployee;
  rows: MonthlyAttendanceRow[];
};

function calculateNightRate(hourlyRate: number, nightRate: number) {
  return nightRate > 0 ? nightRate : Math.round(hourlyRate * 1.25);
}

function calculateDailyPay(
  employee: MonthlyAttendanceEmployee,
  row: MonthlyAttendanceRow,
) {
  if (employee.salaryType !== "hourly") {
    return 0;
  }

  const nightRate = calculateNightRate(employee.hourlyRate, employee.nightRate);

  return (
    Math.round(row.regularHours * employee.hourlyRate) +
    Math.round(row.nightHours * nightRate)
  );
}

function hasWork(row: MonthlyAttendanceRow) {
  if (row.status === "off" || row.status === "absent") {
    return false;
  }

  return Boolean(row.clockIn && row.clockOut);
}

function recalculateRow(row: MonthlyAttendanceRow): MonthlyAttendanceRow {
  if (!row.clockIn || !row.clockOut) {
    return {
      ...row,
      regularHours: 0,
      nightHours: 0,
    };
  }

  try {
    const calculation = calculateAttendance({
      clockIn: row.clockIn,
      clockOut: row.clockOut,
      breakMinutes: row.breakMinutes,
    });

    return {
      ...row,
      status: row.status || "work",
      regularHours: calculation.regularHours,
      nightHours: calculation.nightHours,
    };
  } catch {
    return {
      ...row,
      regularHours: 0,
      nightHours: 0,
    };
  }
}

function formatHours(value: number) {
  return decimalFormatter.format(value);
}

function formatBreakTotal(totalMinutes: number) {
  return `${totalMinutes}分 / ${decimalFormatter.format(totalMinutes / 60)}時間`;
}

function employeeLabel(employee: MonthlyAttendanceEmployee) {
  if (employee.displayName && employee.name && employee.displayName !== employee.name) {
    return `${employee.displayName}（${employee.name}）`;
  }

  return employee.displayName || employee.name || "氏名未設定";
}

export function MonthlyAttendanceForm({
  yearMonth,
  employee,
  rows: initialRows,
}: MonthlyAttendanceFormProps) {
  const [rows, setRows] = useState(initialRows);

  const totals = useMemo(
    () =>
      rows.reduce(
        (summary, row) => {
          const dailyPay = calculateDailyPay(employee, row);

          return {
            workDays: summary.workDays + (hasWork(row) ? 1 : 0),
            breakMinutes:
              summary.breakMinutes + (hasWork(row) ? row.breakMinutes : 0),
            regularHours: summary.regularHours + row.regularHours,
            nightHours: summary.nightHours + row.nightHours,
            dailyPay: summary.dailyPay + dailyPay,
          };
        },
        {
          workDays: 0,
          breakMinutes: 0,
          regularHours: 0,
          nightHours: 0,
          dailyPay: 0,
        },
      ),
    [employee, rows],
  );

  function updateRow(index: number, patch: Partial<MonthlyAttendanceRow>) {
    setRows((currentRows) =>
      currentRows.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        return recalculateRow({ ...row, ...patch });
      }),
    );
  }

  function clearRow(index: number) {
    setRows((currentRows) =>
      currentRows.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        return {
          ...row,
          clockIn: "",
          clockOut: "",
          breakMinutes: 0,
          status: "",
          regularHours: 0,
          nightHours: 0,
        };
      }),
    );
  }

  return (
    <form action={saveMonthlyAttendance} className="grid gap-4">
      <input type="hidden" name="employee_id" value={employee.id} />
      <input type="hidden" name="year_month" value={yearMonth} />
      <input type="hidden" name="rows" value={JSON.stringify(rows)} />

      <section className="grid gap-3 rounded-md border bg-background p-4 shadow-sm md:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">表示名</p>
          <p className="text-base font-semibold">{employee.displayName || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">本名</p>
          <p className="text-base font-semibold">{employee.name || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">給与区分</p>
          <p className="text-base font-semibold">
            {employee.salaryType || "-"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {employee.salaryType === "monthly" ? "月給" : "昼間時給 / 深夜時給"}
          </p>
          <p className="text-base font-semibold tabular-nums">
            {employee.salaryType === "monthly"
              ? moneyFormatter.format(employee.monthlySalary)
              : `${moneyFormatter.format(employee.hourlyRate)} / ${moneyFormatter.format(
                  employee.nightRate,
                )}`}
          </p>
        </div>
      </section>

      <section className="grid gap-3 rounded-md border bg-background p-4 shadow-sm md:grid-cols-5">
        <div>
          <p className="text-xs text-muted-foreground">勤務日数</p>
          <p className="text-xl font-semibold tabular-nums">{totals.workDays}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">休憩合計</p>
          <p className="text-lg font-semibold tabular-nums">
            {formatBreakTotal(totals.breakMinutes)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">通常時間合計</p>
          <p className="text-xl font-semibold tabular-nums">
            {formatHours(totals.regularHours)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">深夜時間合計</p>
          <p className="text-xl font-semibold tabular-nums">
            {formatHours(totals.nightHours)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">日額給与合計</p>
          <p className="text-xl font-semibold tabular-nums">
            {moneyFormatter.format(totals.dailyPay)}
          </p>
        </div>
      </section>

      <section className="rounded-md border bg-background shadow-sm">
        <div className="flex flex-col gap-3 border-b px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">月別勤怠入力</h2>
            <p className="text-sm text-muted-foreground">
              {employeeLabel(employee)} / {yearMonth}
            </p>
          </div>
          <Button type="submit">まとめて保存</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-3 font-medium">日付</th>
                <th className="px-3 py-3 font-medium">曜日</th>
                <th className="px-3 py-3 font-medium">status</th>
                <th className="px-3 py-3 font-medium">出勤</th>
                <th className="px-3 py-3 font-medium">退勤</th>
                <th className="px-3 py-3 font-medium">休憩</th>
                <th className="px-3 py-3 text-right font-medium">通常時間</th>
                <th className="px-3 py-3 text-right font-medium">深夜時間</th>
                <th className="px-3 py-3 text-right font-medium">日額給与</th>
                <th className="sticky right-0 z-20 bg-muted px-3 py-3 text-right font-medium shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.2)]">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const dailyPay = calculateDailyPay(employee, row);

                return (
                  <tr
                    key={row.workDate}
                    className={cn(
                      "border-t transition-colors hover:bg-muted/40",
                      row.isWeekend && "bg-muted/20",
                    )}
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-medium">
                      {row.dayLabel}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {row.weekdayLabel}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <select
                        value={row.status}
                        onChange={(event) =>
                          updateRow(index, { status: event.target.value })
                        }
                        className="h-8 w-28 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">未入力</option>
                        <option value="work">work</option>
                        <option value="off">off</option>
                        <option value="absent">absent</option>
                        <option value="draft">draft</option>
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Input
                        type="time"
                        value={row.clockIn}
                        onChange={(event) =>
                          updateRow(index, { clockIn: event.target.value })
                        }
                        className="h-8 w-28"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Input
                        type="time"
                        value={row.clockOut}
                        onChange={(event) =>
                          updateRow(index, { clockOut: event.target.value })
                        }
                        className="h-8 w-28"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <select
                        value={row.breakMinutes}
                        onChange={(event) =>
                          updateRow(index, {
                            breakMinutes: Number(event.target.value),
                          })
                        }
                        className="h-8 w-24 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {breakOptions.map((minutes) => (
                          <option key={minutes} value={minutes}>
                            {minutes}分
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {formatHours(row.regularHours)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {formatHours(row.nightHours)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {dailyPay > 0 ? moneyFormatter.format(dailyPay) : "-"}
                    </td>
                    <td className="sticky right-0 z-10 whitespace-nowrap bg-background px-3 py-2 text-right shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.2)]">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => clearRow(index)}
                      >
                        クリア
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t bg-muted/40 font-semibold">
              <tr>
                <td className="px-3 py-3" colSpan={5}>
                  合計
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {formatBreakTotal(totals.breakMinutes)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {formatHours(totals.regularHours)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {formatHours(totals.nightHours)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                  {moneyFormatter.format(totals.dailyPay)}
                </td>
                <td className="sticky right-0 z-10 bg-muted px-3 py-3 shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.2)]" />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </form>
  );
}
