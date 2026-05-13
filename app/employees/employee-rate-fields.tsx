"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type NumericValue = number | string | null | undefined;

type EmployeeRateFieldsProps = {
  idPrefix: string;
  formId?: string;
  defaultHourlyRate?: NumericValue;
  defaultMonthlySalary?: NumericValue;
};

type EmployeeRateCellsProps = EmployeeRateFieldsProps & {
  cellClassName?: string;
};

function toInputValue(value: NumericValue) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function calculateNightRate(hourlyRateValue: string) {
  if (!hourlyRateValue) {
    return "";
  }

  const hourlyRate = Number(hourlyRateValue);

  if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
    return "0";
  }

  return String(Math.round(hourlyRate * 1.25));
}

function useCalculatedNightRate(defaultHourlyRate: NumericValue) {
  const [hourlyRate, setHourlyRate] = useState(() =>
    toInputValue(defaultHourlyRate),
  );
  const nightRate = useMemo(() => calculateNightRate(hourlyRate), [hourlyRate]);

  return { hourlyRate, setHourlyRate, nightRate };
}

export function EmployeeRateFields({
  idPrefix,
  formId,
  defaultHourlyRate,
  defaultMonthlySalary,
}: EmployeeRateFieldsProps) {
  const { hourlyRate, setHourlyRate, nightRate } =
    useCalculatedNightRate(defaultHourlyRate);

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-hourly-rate`}>時給</Label>
        <Input
          id={`${idPrefix}-hourly-rate`}
          form={formId}
          name="hourly_rate"
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={hourlyRate}
          onChange={(event) => setHourlyRate(event.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-night-rate`}>深夜時給</Label>
        <Input
          id={`${idPrefix}-night-rate`}
          form={formId}
          name="night_rate"
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={nightRate}
          readOnly
          className="bg-muted/40"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-monthly-salary`}>月給</Label>
        <Input
          id={`${idPrefix}-monthly-salary`}
          form={formId}
          name="monthly_salary"
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          defaultValue={toInputValue(defaultMonthlySalary)}
        />
      </div>
    </>
  );
}

export function EmployeeRateCells({
  idPrefix,
  formId,
  defaultHourlyRate,
  defaultMonthlySalary,
  cellClassName = "whitespace-nowrap px-3 py-2",
}: EmployeeRateCellsProps) {
  const { hourlyRate, setHourlyRate, nightRate } =
    useCalculatedNightRate(defaultHourlyRate);

  return (
    <>
      <td className={cellClassName}>
        <Input
          id={`${idPrefix}-hourly-rate`}
          form={formId}
          aria-label="hourly_rate"
          name="hourly_rate"
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={hourlyRate}
          onChange={(event) => setHourlyRate(event.target.value)}
          className="h-8 w-28 text-right tabular-nums"
        />
      </td>
      <td className={cellClassName}>
        <Input
          id={`${idPrefix}-night-rate`}
          form={formId}
          aria-label="night_rate"
          name="night_rate"
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={nightRate}
          readOnly
          className="h-8 w-28 bg-muted/40 text-right tabular-nums"
        />
      </td>
      <td className={cellClassName}>
        <Input
          id={`${idPrefix}-monthly-salary`}
          form={formId}
          aria-label="monthly_salary"
          name="monthly_salary"
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          defaultValue={toInputValue(defaultMonthlySalary)}
          className="h-8 w-32 text-right tabular-nums"
        />
      </td>
    </>
  );
}
