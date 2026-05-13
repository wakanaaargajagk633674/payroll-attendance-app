export type PayrollGenerationEmployee = {
  id: string;
  name: string;
  displayName: string;
  salaryType: string | null;
  hourlyRate: number;
  nightRate: number;
  monthlySalary: number;
  transportationType: string | null;
  transportationPerDay: number;
  transportationMax: number;
  transportationMaxDays: number;
};

export type PayrollGenerationAttendance = {
  employeeId: string;
  workDate: string;
  clockIn: string | null;
  clockOut: string | null;
  breakMinutes: number;
  regularHours: number;
  nightHours: number;
  status: string | null;
};

export type PayrollGenerationDailyRow = {
  workDate: string;
  clockIn: string;
  clockOut: string;
  breakMinutes: number;
  regularHours: number;
  nightHours: number;
  dailyPay: number;
};

export type PayrollGenerationPreview = {
  employeeId: string;
  name: string;
  displayName: string;
  salaryType: string;
  workDays: number;
  breakMinutesTotal: number;
  regularHours: number;
  nightHours: number;
  hourlyRate: number;
  nightRate: number;
  monthlySalary: number;
  regularPay: number;
  nightPay: number;
  transportationAmount: number;
  grossPayment: number;
  deductionTotal: number;
  netPayment: number;
  dailyRows: PayrollGenerationDailyRow[];
};

export type PayrollGenerationTotals = {
  workDays: number;
  breakMinutesTotal: number;
  regularHours: number;
  nightHours: number;
  regularPay: number;
  nightPay: number;
  transportationAmount: number;
  grossPayment: number;
  deductionTotal: number;
  netPayment: number;
};

function roundHours(value: number) {
  return Math.round(value * 100) / 100;
}

function isWorkedAttendance(record: PayrollGenerationAttendance) {
  const status = record.status ?? "";

  if (status === "off" || status === "absent") {
    return false;
  }

  return Boolean(record.clockIn && record.clockOut);
}

function effectiveNightRate(hourlyRate: number, nightRate: number) {
  return nightRate > 0 ? nightRate : Math.round(hourlyRate * 1.25);
}

function calculateTransportationAmount(
  employee: PayrollGenerationEmployee,
  workDays: number,
) {
  const perDayAmount =
    employee.transportationPerDay > 0
      ? Math.round(employee.transportationPerDay * workDays)
      : 0;

  if (
    employee.transportationMax > 0 &&
    employee.transportationMaxDays > 0 &&
    workDays >= employee.transportationMaxDays
  ) {
    return Math.round(employee.transportationMax);
  }

  return perDayAmount;
}

function calculateDailyPay(
  salaryType: string,
  regularHours: number,
  nightHours: number,
  hourlyRate: number,
  nightRate: number,
) {
  if (salaryType !== "hourly") {
    return 0;
  }

  return (
    Math.round(regularHours * hourlyRate) +
    Math.round(nightHours * nightRate)
  );
}

export function generatePayrollPreview(
  employees: PayrollGenerationEmployee[],
  attendanceRecords: PayrollGenerationAttendance[],
) {
  const recordsByEmployee = new Map<string, PayrollGenerationAttendance[]>();

  for (const record of attendanceRecords) {
    const currentRecords = recordsByEmployee.get(record.employeeId) ?? [];
    currentRecords.push(record);
    recordsByEmployee.set(record.employeeId, currentRecords);
  }

  return employees.map<PayrollGenerationPreview>((employee) => {
    const salaryType = employee.salaryType === "monthly" ? "monthly" : "hourly";
    const nightRate = effectiveNightRate(employee.hourlyRate, employee.nightRate);
    const workedRecords = (recordsByEmployee.get(employee.id) ?? [])
      .filter(isWorkedAttendance)
      .sort((a, b) => a.workDate.localeCompare(b.workDate));
    const workDays = workedRecords.length;
    const breakMinutesTotal = workedRecords.reduce(
      (total, record) => total + record.breakMinutes,
      0,
    );
    const regularHours = roundHours(
      workedRecords.reduce((total, record) => total + record.regularHours, 0),
    );
    const nightHours = roundHours(
      workedRecords.reduce((total, record) => total + record.nightHours, 0),
    );
    const transportationAmount = calculateTransportationAmount(
      employee,
      workDays,
    );
    const regularPay =
      salaryType === "monthly"
        ? Math.round(employee.monthlySalary)
        : Math.round(regularHours * employee.hourlyRate);
    const nightPay =
      salaryType === "monthly" ? 0 : Math.round(nightHours * nightRate);
    const grossPayment = Math.round(
      regularPay + nightPay + transportationAmount,
    );
    const deductionTotal = 0;
    const netPayment = grossPayment - deductionTotal;
    const dailyRows = workedRecords.map<PayrollGenerationDailyRow>((record) => ({
      workDate: record.workDate,
      clockIn: record.clockIn ?? "",
      clockOut: record.clockOut ?? "",
      breakMinutes: record.breakMinutes,
      regularHours: record.regularHours,
      nightHours: record.nightHours,
      dailyPay: calculateDailyPay(
        salaryType,
        record.regularHours,
        record.nightHours,
        employee.hourlyRate,
        nightRate,
      ),
    }));

    return {
      employeeId: employee.id,
      name: employee.name,
      displayName: employee.displayName,
      salaryType,
      workDays,
      breakMinutesTotal,
      regularHours,
      nightHours,
      hourlyRate: employee.hourlyRate,
      nightRate,
      monthlySalary: employee.monthlySalary,
      regularPay,
      nightPay,
      transportationAmount,
      grossPayment,
      deductionTotal,
      netPayment,
      dailyRows,
    };
  });
}

export function summarizePayrollPreview(
  previews: PayrollGenerationPreview[],
): PayrollGenerationTotals {
  return previews.reduce<PayrollGenerationTotals>(
    (totals, preview) => ({
      workDays: totals.workDays + preview.workDays,
      breakMinutesTotal:
        totals.breakMinutesTotal + preview.breakMinutesTotal,
      regularHours: roundHours(totals.regularHours + preview.regularHours),
      nightHours: roundHours(totals.nightHours + preview.nightHours),
      regularPay: totals.regularPay + preview.regularPay,
      nightPay: totals.nightPay + preview.nightPay,
      transportationAmount:
        totals.transportationAmount + preview.transportationAmount,
      grossPayment: totals.grossPayment + preview.grossPayment,
      deductionTotal: totals.deductionTotal + preview.deductionTotal,
      netPayment: totals.netPayment + preview.netPayment,
    }),
    {
      workDays: 0,
      breakMinutesTotal: 0,
      regularHours: 0,
      nightHours: 0,
      regularPay: 0,
      nightPay: 0,
      transportationAmount: 0,
      grossPayment: 0,
      deductionTotal: 0,
      netPayment: 0,
    },
  );
}
