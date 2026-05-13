"use client";

import { useMemo, useState } from "react";

import { Label } from "@/components/ui/label";

export type AttendanceEmployeeOption = {
  id: string;
  name: string;
  displayName: string;
  salaryType: string | null;
  hourlyRate: number;
  nightRate: number;
  monthlySalary: number;
};

type AttendanceEmployeeSelectProps = {
  employees: AttendanceEmployeeOption[];
};

const moneyFormatter = new Intl.NumberFormat("ja-JP");

function employeeOptionLabel(employee: AttendanceEmployeeOption) {
  if (employee.displayName && employee.name && employee.displayName !== employee.name) {
    return `${employee.displayName}（${employee.name}）`;
  }

  return employee.displayName || employee.name || "氏名未設定";
}

function salaryDetail(employee: AttendanceEmployeeOption) {
  if (employee.salaryType === "monthly") {
    return `月給: ${moneyFormatter.format(employee.monthlySalary)}`;
  }

  return `昼間時給: ${moneyFormatter.format(
    employee.hourlyRate,
  )} / 深夜時給: ${moneyFormatter.format(employee.nightRate)}`;
}

export function AttendanceEmployeeSelect({
  employees,
}: AttendanceEmployeeSelectProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId),
    [employees, selectedEmployeeId],
  );

  return (
    <div className="grid gap-2 xl:col-span-2">
      <Label htmlFor="employee_id">従業員</Label>
      <select
        id="employee_id"
        name="employee_id"
        required
        disabled={employees.length === 0}
        value={selectedEmployeeId}
        onChange={(event) => setSelectedEmployeeId(event.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">選択してください</option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employeeOptionLabel(employee)}
          </option>
        ))}
      </select>

      {selectedEmployee ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs leading-6">
          <div>
            表示名:{" "}
            <span className="font-medium">{selectedEmployee.displayName || "-"}</span>
          </div>
          <div>
            本名: <span className="font-medium">{selectedEmployee.name || "-"}</span>
          </div>
          <div>
            給与区分:{" "}
            <span className="font-medium">
              {selectedEmployee.salaryType || "-"}
            </span>
          </div>
          <div>{salaryDetail(selectedEmployee)}</div>
        </div>
      ) : null}
    </div>
  );
}
