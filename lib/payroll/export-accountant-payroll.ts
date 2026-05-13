import ExcelJS from "exceljs";

export type AccountantPayrollRecord = {
  yearMonth: string;
  employeeName: string;
  salaryType: string | null;
  hourlyRate: number;
  monthlySalary: number;
  nightRate: number;
  workDays: number;
  regularHours: number;
  nightHours: number;
  regularPay: number;
  nightPay: number;
  transportationPerDay: number;
  transportationAmount: number;
  grossPayment: number;
  incomeTax: number;
  mealDeduction: number;
  rentDeduction: number;
  otherDeduction: number;
  deductionTotal: number;
  netPayment: number;
};

const COMPANY_NAME = "CtoS　合同会社";
const BASE_FONT = "Yu Gothic";
const HEADER_FILL = "FFD9EAF7";
const TOTAL_FILL = "FFFFF2CC";
const GRAND_TOTAL_FILL = "FFF4B183";
const BORDER_COLOR = "FF6B7280";
const COLUMN_COUNT = 27;
const TITLE_ROW = 1;
const META_ROW = 2;
const HEADER_ROW = 4;
const DATA_START_ROW = 5;

const HEADERS = [
  "No",
  "氏名",
  "休憩",
  "勤務時間",
  "基本時給",
  "給与",
  "深夜勤務",
  "時給",
  "深夜給",
  "合算給与",
  "最寄り駅",
  "交通費単価",
  "交通費",
  "総支給額",
  "健康保険",
  "介護保険",
  "厚生年金",
  "雇用保険",
  "社会保険料合計",
  "差引額",
  "所得税",
  "食事代",
  "定額減税分",
  "家賃",
  "その他控除",
  "控除合計",
  "差し引き支給額",
] as const;

const columnWidths = [
  4,
  16,
  5,
  7,
  7,
  9,
  7,
  7,
  8,
  9,
  8,
  7,
  7,
  9,
  7,
  7,
  7,
  7,
  8,
  9,
  7,
  7,
  7,
  7,
  7,
  8,
  10,
];

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: BORDER_COLOR } },
  left: { style: "thin", color: { argb: BORDER_COLOR } },
  bottom: { style: "thin", color: { argb: BORDER_COLOR } },
  right: { style: "thin", color: { argb: BORDER_COLOR } },
};

const moneyColumnIndexes = new Set([
  5,
  6,
  8,
  9,
  10,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
  27,
]);
const decimalColumnIndexes = new Set([3, 4, 7]);
const textColumnIndexes = new Set([2, 11]);

function applyStyle(cell: ExcelJS.Cell, style: Partial<ExcelJS.Style>) {
  cell.style = { ...cell.style, ...style };
}

function styleRange(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  startColumn: number,
  endRow: number,
  endColumn: number,
  style: Partial<ExcelJS.Style>,
) {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let column = startColumn; column <= endColumn; column += 1) {
      applyStyle(worksheet.getCell(row, column), style);
    }
  }
}

function setMergedValue(
  worksheet: ExcelJS.Worksheet,
  row: number,
  startColumn: number,
  endColumn: number,
  value: ExcelJS.CellValue,
  style: Partial<ExcelJS.Style>,
) {
  worksheet.mergeCells(row, startColumn, row, endColumn);
  const cell = worksheet.getCell(row, startColumn);
  cell.value = value;
  styleRange(worksheet, row, startColumn, row, endColumn, style);
  return cell;
}

function formatTargetMonth(yearMonth: string) {
  const match = yearMonth.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return `${yearMonth}月`;
  }

  return `${match[1]}.${match[2]}月`;
}

function basePay(record: AccountantPayrollRecord) {
  if (record.salaryType === "monthly") {
    return record.monthlySalary;
  }

  return record.regularPay;
}

function combinedPay(record: AccountantPayrollRecord) {
  return basePay(record) + record.nightPay;
}

function setupWorksheet(worksheet: ExcelJS.Worksheet) {
  worksheet.views = [{ showGridLines: false }];
  worksheet.properties.defaultRowHeight = 16;
  worksheet.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    horizontalCentered: true,
    verticalCentered: false,
    margins: {
      left: 0.15,
      right: 0.15,
      top: 0.25,
      bottom: 0.2,
      header: 0.05,
      footer: 0.05,
    },
  };

  worksheet.columns = columnWidths.map((width, index) => ({
    key: `col${index + 1}`,
    width,
  }));
}

function setTitle(worksheet: ExcelJS.Worksheet, yearMonth: string) {
  worksheet.getRow(TITLE_ROW).height = 24;
  worksheet.getRow(META_ROW).height = 18;

  setMergedValue(worksheet, TITLE_ROW, 1, COLUMN_COUNT, "給与一覧表（会計士提出用）", {
    font: { name: BASE_FONT, bold: true, size: 16 },
    alignment: { horizontal: "center", vertical: "middle" },
  });

  setMergedValue(worksheet, META_ROW, 1, 8, `対象月 ${formatTargetMonth(yearMonth)}`, {
    font: { name: BASE_FONT, bold: true, size: 9 },
    alignment: { horizontal: "left", vertical: "middle" },
  });

  setMergedValue(worksheet, META_ROW, 21, COLUMN_COUNT, COMPANY_NAME, {
    font: { name: BASE_FONT, bold: true, size: 9 },
    alignment: { horizontal: "right", vertical: "middle" },
  });
}

function setHeaders(worksheet: ExcelJS.Worksheet) {
  const headerRow = worksheet.getRow(HEADER_ROW);
  headerRow.height = 28;
  headerRow.values = [undefined, ...HEADERS];

  for (let column = 1; column <= COLUMN_COUNT; column += 1) {
    applyStyle(headerRow.getCell(column), {
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: HEADER_FILL },
      },
      font: { name: BASE_FONT, bold: true, size: 7 },
      alignment: {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      },
      border: thinBorder,
    });
  }
}

function setDataRows(
  worksheet: ExcelJS.Worksheet,
  records: AccountantPayrollRecord[],
) {
  records.forEach((record, index) => {
    const row = worksheet.getRow(DATA_START_ROW + index);
    const regularOrMonthlyPay = basePay(record);
    row.height = 16;
    row.values = [
      undefined,
      index + 1,
      record.employeeName,
      0,
      record.regularHours,
      record.hourlyRate,
      regularOrMonthlyPay,
      record.nightHours,
      record.nightRate,
      record.nightPay,
      combinedPay(record),
      // employees に最寄り駅カラムを追加したら、この空欄へ差し替える。
      "",
      record.transportationPerDay,
      record.transportationAmount,
      record.grossPayment,
      0,
      0,
      0,
      0,
      0,
      record.grossPayment,
      record.incomeTax,
      record.mealDeduction,
      0,
      record.rentDeduction,
      record.otherDeduction,
      record.deductionTotal,
      record.netPayment,
    ];

    for (let column = 1; column <= COLUMN_COUNT; column += 1) {
      const cell = row.getCell(column);
      const isText = textColumnIndexes.has(column);

      applyStyle(cell, {
        font: { name: BASE_FONT, size: 7 },
        alignment: {
          horizontal: isText ? "left" : "right",
          vertical: "middle",
          wrapText: column === 2,
        },
        border: thinBorder,
      });

      if (moneyColumnIndexes.has(column)) {
        cell.numFmt = "#,##0";
      } else if (decimalColumnIndexes.has(column)) {
        cell.numFmt = "0.00";
      } else if (column === 1) {
        cell.numFmt = "0";
      }
    }
  });
}

function setSummaryRow(
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  label: string,
  value: number,
  grandTotal = false,
) {
  const fillColor = grandTotal ? GRAND_TOTAL_FILL : TOTAL_FILL;
  const labelCell = setMergedValue(worksheet, rowNumber, 1, 6, label, {
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: fillColor },
    },
    font: { name: BASE_FONT, bold: true, size: grandTotal ? 10 : 9 },
    alignment: { horizontal: "center", vertical: "middle" },
    border: thinBorder,
  });
  const valueCell = setMergedValue(worksheet, rowNumber, 7, 10, value, {
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: fillColor },
    },
    font: { name: BASE_FONT, bold: true, size: grandTotal ? 10 : 9 },
    alignment: { horizontal: "right", vertical: "middle" },
    border: thinBorder,
  });

  labelCell.numFmt = "@";
  valueCell.numFmt = "¥#,##0";
  worksheet.getRow(rowNumber).height = grandTotal ? 20 : 18;
}

function setSummary(
  worksheet: ExcelJS.Worksheet,
  yearMonth: string,
  records: AccountantPayrollRecord[],
) {
  const summaryStartRow = DATA_START_ROW + records.length + 2;
  const grossPaymentTotal = records.reduce(
    (total, record) => total + record.grossPayment,
    0,
  );
  const feeAmount = Math.round(grossPaymentTotal * 0.2);
  const transportationTotal = records.reduce(
    (total, record) => total + record.transportationAmount,
    0,
  );
  const netPaymentTotal = records.reduce(
    (total, record) => total + record.netPayment,
    0,
  );

  setMergedValue(worksheet, summaryStartRow - 1, 1, 10, "集計", {
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_FILL },
    },
    font: { name: BASE_FONT, bold: true, size: 9 },
    alignment: { horizontal: "center", vertical: "middle" },
    border: thinBorder,
  });

  setSummaryRow(worksheet, summaryStartRow, "総支給額合計", grossPaymentTotal);
  setSummaryRow(worksheet, summaryStartRow + 1, "手数料20%", feeAmount);
  setSummaryRow(
    worksheet,
    summaryStartRow + 2,
    "総支給額合計＋手数料20%",
    grossPaymentTotal + feeAmount,
    true,
  );
  setSummaryRow(worksheet, summaryStartRow + 3, "交通費合計", transportationTotal);
  setSummaryRow(
    worksheet,
    summaryStartRow + 4,
    "差し引き支給額合計",
    netPaymentTotal,
  );

  setMergedValue(
    worksheet,
    summaryStartRow,
    21,
    COLUMN_COUNT,
    `対象月 ${formatTargetMonth(yearMonth)}`,
    {
      font: { name: BASE_FONT, bold: true, size: 9 },
      alignment: { horizontal: "right", vertical: "middle" },
    },
  );
  setMergedValue(worksheet, summaryStartRow + 1, 21, COLUMN_COUNT, COMPANY_NAME, {
    font: { name: BASE_FONT, bold: true, size: 10 },
    alignment: { horizontal: "right", vertical: "middle" },
  });

  return summaryStartRow + 4;
}

export async function exportAccountantPayrollWorkbook(
  yearMonth: string,
  records: AccountantPayrollRecord[],
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "payroll-attendance-app";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;

  const worksheet = workbook.addWorksheet("会計士提出用");
  setupWorksheet(worksheet);
  setTitle(worksheet, yearMonth);
  setHeaders(worksheet);
  setDataRows(worksheet, records);
  const lastRow = setSummary(worksheet, yearMonth, records);

  worksheet.pageSetup.printArea = `A1:AA${lastRow}`;
  worksheet.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to: { row: HEADER_ROW, column: COLUMN_COUNT },
  };

  const buffer = await workbook.xlsx.writeBuffer();

  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}
