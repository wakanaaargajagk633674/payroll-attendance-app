import { Suspense } from "react";

import { BackToHomeLink } from "@/components/back-to-home-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

import { createEmployee, updateEmployee } from "./actions";
import { EmployeeRateCells, EmployeeRateFields } from "./employee-rate-fields";

type SearchParams = Promise<{
  created?: string | string[];
  updated?: string | string[];
  error?: string | string[];
}>;

type EmployeeRecord = Record<string, unknown> & {
  id?: string;
  name?: string | null;
  full_name?: string | null;
  employee_no?: string | null;
  display_name?: string | null;
  salary_type?: string | null;
  hourly_rate?: number | string | null;
  monthly_salary?: number | string | null;
  night_rate?: number | string | null;
  transportation_type?: string | null;
  transportation_per_day?: number | string | null;
  transportation_max?: number | string | null;
  transportation_max_days?: number | string | null;
  nearest_station?: string | null;
  social_insurance_enrolled?: boolean | null;
  long_term_care_insured?: boolean | null;
  active?: boolean | null;
};

const numberFormatter = new Intl.NumberFormat("ja-JP");
const selectClassName =
  "flex h-8 w-full min-w-28 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const editInputClassName = "h-8 min-w-28";
const editNumberInputClassName = "h-8 w-28 text-right tabular-nums";

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function employeeName(employee: EmployeeRecord) {
  return employee.name ?? employee.full_name ?? "";
}

function inputValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function activeValue(employee: EmployeeRecord) {
  return employee.active !== false;
}

function sortEmployees(a: EmployeeRecord, b: EmployeeRecord) {
  const activeSort = Number(activeValue(b)) - Number(activeValue(a));

  if (activeSort !== 0) {
    return activeSort;
  }

  return employeeName(a).localeCompare(employeeName(b), "ja");
}

async function ActionMessage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const error = firstParam(params.error);
  const created = firstParam(params.created);
  const updated = firstParam(params.updated);

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (created || updated) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        {created ? "従業員を登録しました。" : "従業員を更新しました。"}
      </div>
    );
  }

  return null;
}

function EmployeeForm() {
  return (
    <section className="rounded-md border bg-background p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-1">
        <h2 className="text-lg font-semibold">新規追加</h2>
        <p className="text-sm text-muted-foreground">
          時給を入力すると深夜時給は自動計算されます。数値空欄は未設定として保存します。
        </p>
      </div>

      <form action={createEmployee} className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="name">氏名</Label>
            <Input id="name" name="name" placeholder="TRAN VAN HUAN" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="employee_no">社員NO</Label>
            <Input id="employee_no" name="employee_no" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="display_name">表示名</Label>
            <Input id="display_name" name="display_name" placeholder="フアン" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="salary_type">給与タイプ</Label>
            <select
              id="salary_type"
              name="salary_type"
              defaultValue="hourly"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="hourly">hourly</option>
              <option value="monthly">monthly</option>
            </select>
          </div>
          <EmployeeRateFields idPrefix="new-employee" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="transportation_type">交通費区分</Label>
            <Input id="transportation_type" name="transportation_type" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="transportation_per_day">交通費/日</Label>
            <Input
              id="transportation_per_day"
              name="transportation_per_day"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="transportation_max">交通費上限</Label>
            <Input
              id="transportation_max"
              name="transportation_max"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="transportation_max_days">上限日数</Label>
            <Input
              id="transportation_max_days"
              name="transportation_max_days"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="nearest_station">最寄り駅</Label>
            <Input id="nearest_station" name="nearest_station" />
          </div>
          <div className="flex items-end gap-3 pb-2">
            <input
              id="social_insurance_enrolled"
              name="social_insurance_enrolled"
              type="checkbox"
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="social_insurance_enrolled">
              社会保険加入（正社員）
            </Label>
          </div>
          <div className="flex items-end gap-3 pb-2">
            <input
              id="long_term_care_insured"
              name="long_term_care_insured"
              type="checkbox"
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="long_term_care_insured">介護保険対象（40歳〜64歳）</Label>
          </div>
          <div className="flex items-end gap-3 pb-2">
            <input
              id="active"
              name="active"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="active">active</Label>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit">登録</Button>
        </div>
      </form>
    </section>
  );
}

function TextCell({
  formId,
  name,
  value,
  widthClassName = "min-w-32",
  required = false,
}: {
  formId: string;
  name: string;
  value: unknown;
  widthClassName?: string;
  required?: boolean;
}) {
  return (
    <td className="whitespace-nowrap px-3 py-2">
      <Input
        form={formId}
        name={name}
        defaultValue={inputValue(value)}
        required={required}
        className={cn(editInputClassName, widthClassName)}
      />
    </td>
  );
}

function NumberCell({
  formId,
  name,
  value,
}: {
  formId: string;
  name: string;
  value: unknown;
}) {
  return (
    <td className="whitespace-nowrap px-3 py-2">
      <Input
        form={formId}
        name={name}
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        defaultValue={inputValue(value)}
        className={editNumberInputClassName}
      />
    </td>
  );
}

async function EmployeesTable() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("employees").select("*");

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error.message}
      </div>
    );
  }

  const employees = ((data ?? []) as EmployeeRecord[]).sort(sortEmployees);

  return (
    <section className="rounded-md border bg-background shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
        <h2 className="text-lg font-semibold">従業員一覧・編集</h2>
        <span className="text-sm text-muted-foreground">
          {numberFormatter.format(employees.length)} 件
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[2100px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-3 font-medium">employee_no</th>
              <th className="px-3 py-3 font-medium">name</th>
              <th className="px-3 py-3 font-medium">display_name</th>
              <th className="px-3 py-3 font-medium">salary_type</th>
              <th className="px-3 py-3 text-right font-medium">hourly_rate</th>
              <th className="px-3 py-3 text-right font-medium">night_rate</th>
              <th className="px-3 py-3 text-right font-medium">
                monthly_salary
              </th>
              <th className="px-3 py-3 font-medium">transportation_type</th>
              <th className="px-3 py-3 text-right font-medium">
                transportation_per_day
              </th>
              <th className="px-3 py-3 text-right font-medium">
                transportation_max
              </th>
              <th className="px-3 py-3 text-right font-medium">
                transportation_max_days
              </th>
              <th className="px-3 py-3 font-medium">nearest_station</th>
              <th className="px-3 py-3 font-medium">社会保険</th>
              <th className="px-3 py-3 font-medium">介護保険</th>
              <th className="px-3 py-3 font-medium">active</th>
              <th className="px-3 py-3 font-medium">保存</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td
                  colSpan={16}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  従業員データはまだありません。
                </td>
              </tr>
            ) : (
              employees.map((employee) => {
                const active = activeValue(employee);
                const employeeId = employee.id ?? "";
                const formId = `employee-${employeeId}-form`;
                const rowId = employeeId || employeeName(employee);

                return (
                  <tr
                    key={rowId}
                    className={cn(
                      "border-t align-top transition-colors hover:bg-muted/40",
                      !active && "bg-muted/20 text-muted-foreground opacity-60",
                    )}
                  >
                    <TextCell
                      formId={formId}
                      name="employee_no"
                      value={employee.employee_no}
                      widthClassName="min-w-24"
                    />
                    <TextCell
                      formId={formId}
                      name="name"
                      value={employeeName(employee)}
                      widthClassName="min-w-48"
                      required
                    />
                    <TextCell
                      formId={formId}
                      name="display_name"
                      value={employee.display_name}
                      widthClassName="min-w-28"
                    />
                    <td className="whitespace-nowrap px-3 py-2">
                      <select
                        form={formId}
                        name="salary_type"
                        defaultValue={employee.salary_type ?? "hourly"}
                        className={selectClassName}
                      >
                        <option value="hourly">hourly</option>
                        <option value="monthly">monthly</option>
                      </select>
                    </td>
                    <EmployeeRateCells
                      idPrefix={`employee-${employeeId || "unknown"}`}
                      formId={formId}
                      defaultHourlyRate={employee.hourly_rate}
                      defaultMonthlySalary={employee.monthly_salary}
                    />
                    <TextCell
                      formId={formId}
                      name="transportation_type"
                      value={employee.transportation_type}
                      widthClassName="min-w-32"
                    />
                    <NumberCell
                      formId={formId}
                      name="transportation_per_day"
                      value={employee.transportation_per_day}
                    />
                    <NumberCell
                      formId={formId}
                      name="transportation_max"
                      value={employee.transportation_max}
                    />
                    <NumberCell
                      formId={formId}
                      name="transportation_max_days"
                      value={employee.transportation_max_days}
                    />
                    <TextCell
                      formId={formId}
                      name="nearest_station"
                      value={employee.nearest_station}
                      widthClassName="min-w-32"
                    />
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex h-8 items-center gap-2">
                        <input
                          form={formId}
                          id={`${formId}-social-insurance`}
                          name="social_insurance_enrolled"
                          type="checkbox"
                          defaultChecked={
                            employee.social_insurance_enrolled === true
                          }
                          className="h-4 w-4 rounded border-input"
                        />
                        <Label htmlFor={`${formId}-social-insurance`}>加入</Label>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex h-8 items-center gap-2">
                        <input
                          form={formId}
                          id={`${formId}-long-term-care`}
                          name="long_term_care_insured"
                          type="checkbox"
                          defaultChecked={
                            employee.long_term_care_insured === true
                          }
                          className="h-4 w-4 rounded border-input"
                        />
                        <Label htmlFor={`${formId}-long-term-care`}>対象</Label>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex h-8 items-center gap-2">
                        <input
                          form={formId}
                          id={`${formId}-active`}
                          name="active"
                          type="checkbox"
                          defaultChecked={active}
                          className="h-4 w-4 rounded border-input"
                        />
                        <Badge variant={active ? "default" : "secondary"}>
                          {active ? "active" : "inactive"}
                        </Badge>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <form id={formId} action={updateEmployee}>
                        <input type="hidden" name="id" value={employeeId} />
                        <Button type="submit" size="sm" disabled={!employeeId}>
                          保存
                        </Button>
                      </form>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {employees.length > 0 ? (
        <div className="border-t px-5 py-3 text-xs text-muted-foreground">
          現在値: active
          は上に表示し、inactiveは薄く表示しています。時給を変えると深夜時給が自動更新されます。社会保険に「加入」を付けた従業員だけ、給与画面で健康保険・厚生年金・雇用保険を自動計算します。
        </div>
      ) : null}
    </section>
  );
}

export default function EmployeesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <BackToHomeLink />
          <h1 className="text-2xl font-semibold tracking-normal">
            従業員マスター
          </h1>
          <p className="text-sm text-muted-foreground">
            給与計算に使う従業員情報を管理します。
          </p>
        </div>

        <Suspense>
          <ActionMessage searchParams={searchParams} />
        </Suspense>

        <EmployeeForm />

        <Suspense
          fallback={
            <section className="rounded-md border bg-background p-5 text-sm text-muted-foreground shadow-sm">
              読み込み中...
            </section>
          }
        >
          <EmployeesTable />
        </Suspense>
      </div>
    </main>
  );
}
