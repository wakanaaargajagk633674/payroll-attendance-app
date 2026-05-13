import ExcelJS from "exceljs";

export type PayrollSlipRecord = {
  yearMonth: string;
  employeeName: string;
  employeeNo: string;
  salaryType: string | null;
  hourlyRate: number | null;
  monthlySalary: number | null;
  nightRate: number | null;
  workDays: number;
  regularHours: number;
  nightHours: number;
  regularPay: number;
  nightPay: number;
  transportationAmount: number;
  grossPayment: number;
  incomeTax: number;
  mealDeduction: number;
  rentDeduction: number;
  otherDeduction: number;
  deductionTotal: number;
  netPayment: number;
};

const PRINT_RANGE = "A1:J36";
const BASE_FONT = "Yu Gothic";
const COMPANY_NAME = "CtoS　合同会社";
const DEPARTMENT_NAME = "バカ息子　渋谷";
const BORDER_COLOR = "FF6B7280";
const TITLE_COLOR = "FF111827";
const HEADER_FILL = "FFD9EAF7";
const SECTION_FILL = "FFBDD7EE";
const LABEL_FILL = "FFF3F6FA";
const NET_FILL = "FFFFF2CC";

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: BORDER_COLOR } },
  left: { style: "thin", color: { argb: BORDER_COLOR } },
  bottom: { style: "thin", color: { argb: BORDER_COLOR } },
  right: { style: "thin", color: { argb: BORDER_COLOR } },
};

const mediumBorder: Partial<ExcelJS.Borders> = {
  top: { style: "medium", color: { argb: BORDER_COLOR } },
  left: { style: "medium", color: { argb: BORDER_COLOR } },
  bottom: { style: "medium", color: { argb: BORDER_COLOR } },
  right: { style: "medium", color: { argb: BORDER_COLOR } },
};

function toSheetNameBase(name: string) {
  const cleaned = name
    .replace(/[\[\]:*?/\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^'+|'+$/g, "");

  return cleaned || "給与明細";
}

function createUniqueSheetName(name: string, usedNames: Set<string>) {
  const base = toSheetNameBase(name).slice(0, 31) || "給与明細";
  let sheetName = base;
  let counter = 2;

  while (usedNames.has(sheetName.toLowerCase())) {
    const suffix = `_${counter}`;
    sheetName = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    counter += 1;
  }

  usedNames.add(sheetName.toLowerCase());
  return sheetName;
}

function formatYearMonth(yearMonth: string) {
  const match = yearMonth.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return `${yearMonth}分`;
  }

  return `${match[1]}年${Number(match[2])}月分`;
}

function salaryTypeLabel(salaryType: string | null) {
  if (salaryType === "monthly") {
    return "月給";
  }

  if (salaryType === "hourly") {
    return "時給";
  }

  return salaryType ?? "-";
}

function basePayAmount(record: PayrollSlipRecord) {
  if (record.salaryType === "monthly" && record.monthlySalary !== null) {
    return record.monthlySalary;
  }

  return record.regularPay;
}

function setMergedValue(
  worksheet: ExcelJS.Worksheet,
  range: string,
  value: ExcelJS.CellValue,
  style: Partial<ExcelJS.Style> = {},
) {
  worksheet.mergeCells(range);
  const cell = worksheet.getCell(range.split(":")[0]);
  cell.value = value;
  cell.style = { ...cell.style, ...style };
  return cell;
}

function applyStyle(
  cell: ExcelJS.Cell,
  style: Partial<ExcelJS.Style>,
) {
  cell.style = { ...cell.style, ...style };
}

function forEachCell(
  worksheet: ExcelJS.Worksheet,
  range: string,
  callback: (cell: ExcelJS.Cell) => void,
) {
  const [start, end] = range.split(":");
  const startCell = worksheet.getCell(start);
  const endCell = worksheet.getCell(end ?? start);

  for (let row = startCell.row; row <= endCell.row; row += 1) {
    for (let col = Number(startCell.col); col <= Number(endCell.col); col += 1) {
      callback(worksheet.getCell(row, col));
    }
  }
}

function styleRange(
  worksheet: ExcelJS.Worksheet,
  range: string,
  style: Partial<ExcelJS.Style>,
) {
  forEachCell(worksheet, range, (cell) => applyStyle(cell, style));
}

function setSectionHeader(worksheet: ExcelJS.Worksheet, row: number, title: string) {
  setMergedValue(worksheet, `A${row}:J${row}`, title, {
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: SECTION_FILL },
    },
    font: {
      name: BASE_FONT,
      bold: true,
      size: 11,
      color: { argb: TITLE_COLOR },
    },
    alignment: { horizontal: "center", vertical: "middle" },
    border: thinBorder,
  });
}

function setPair(
  worksheet: ExcelJS.Worksheet,
  labelRange: string,
  valueRange: string,
  label: string,
  value: ExcelJS.CellValue,
  valueFormat?: string,
) {
  const labelCell = setMergedValue(worksheet, labelRange, label, {
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: LABEL_FILL },
    },
    font: { name: BASE_FONT, bold: true, size: 9 },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    border: thinBorder,
  });
  const valueCell = setMergedValue(worksheet, valueRange, value, {
    font: { name: BASE_FONT, size: 10 },
    alignment: { horizontal: "right", vertical: "middle" },
    border: thinBorder,
  });

  if (valueFormat) {
    valueCell.numFmt = valueFormat;
  }

  return { labelCell, valueCell };
}

function setLabelRow(
  worksheet: ExcelJS.Worksheet,
  row: number,
  labels: string[],
) {
  labels.forEach((label, index) => {
    const cell = worksheet.getCell(row, index + 1);
    cell.value = label;
    applyStyle(cell, {
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: LABEL_FILL },
      },
      font: { name: BASE_FONT, bold: true, size: 8 },
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: thinBorder,
    });
  });
}

function setValueRow(
  worksheet: ExcelJS.Worksheet,
  row: number,
  values: number[],
  numberFormats: string[],
) {
  values.forEach((value, index) => {
    const cell = worksheet.getCell(row, index + 1);
    cell.value = value;
    cell.numFmt = numberFormats[index] ?? "#,##0";
    applyStyle(cell, {
      font: { name: BASE_FONT, size: 9 },
      alignment: { horizontal: "right", vertical: "middle" },
      border: thinBorder,
    });
  });
}

function setMergedValueWithBorder(
  worksheet: ExcelJS.Worksheet,
  range: string,
  value: ExcelJS.CellValue,
  style: Partial<ExcelJS.Style>,
) {
  const cell = setMergedValue(worksheet, range, value, style);
  styleRange(worksheet, range, { border: style.border ?? thinBorder });
  return cell;
}

function setupWorksheet(worksheet: ExcelJS.Worksheet) {
  worksheet.views = [{ showGridLines: false }];
  worksheet.properties.defaultRowHeight = 19;
  worksheet.pageSetup = {
    paperSize: 9,
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    horizontalCentered: true,
    verticalCentered: false,
    margins: {
      left: 0.22,
      right: 0.22,
      top: 0.28,
      bottom: 0.28,
      header: 0.1,
      footer: 0.1,
    },
    printArea: PRINT_RANGE,
  };

  worksheet.columns = [
    { key: "a", width: 10 },
    { key: "b", width: 10 },
    { key: "c", width: 10 },
    { key: "d", width: 10 },
    { key: "e", width: 10 },
    { key: "f", width: 10 },
    { key: "g", width: 10 },
    { key: "h", width: 10 },
    { key: "i", width: 10 },
    { key: "j", width: 11 },
  ];

  for (let row = 1; row <= 36; row += 1) {
    worksheet.getRow(row).height = 18.5;
  }

  worksheet.getRow(1).height = 30;
  worksheet.getRow(4).height = 24;
  worksheet.getRow(6).height = 20;
  worksheet.getRow(8).height = 26;
  worksheet.getRow(9).height = 21;
  worksheet.getRow(13).height = 21;
  worksheet.getRow(15).height = 21;
  worksheet.getRow(19).height = 21;
  worksheet.getRow(21).height = 21;
  worksheet.getRow(23).height = 21;
  worksheet.getRow(26).height = 30;
  worksheet.getRow(27).height = 30;
  worksheet.getRow(28).height = 30;
}

function buildSlipSheet(
  workbook: ExcelJS.Workbook,
  record: PayrollSlipRecord,
  sheetName: string,
) {
  const worksheet = workbook.addWorksheet(sheetName);
  setupWorksheet(worksheet);

  setMergedValue(worksheet, "A1:J1", "給料明細書", {
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_FILL },
    },
    font: { name: BASE_FONT, bold: true, size: 20, color: { argb: TITLE_COLOR } },
    alignment: { horizontal: "center", vertical: "middle" },
  });
  setMergedValue(worksheet, "A2:C2", formatYearMonth(record.yearMonth), {
    font: { name: BASE_FONT, bold: true, size: 11 },
    alignment: { horizontal: "left", vertical: "middle" },
  });
  setMergedValue(worksheet, "H2:J2", COMPANY_NAME, {
    font: { name: BASE_FONT, bold: true, size: 10 },
    alignment: { horizontal: "right", vertical: "middle" },
  });

  setPair(worksheet, "A4:B4", "C4:H4", "氏名", record.employeeName);
  worksheet.getCell("C4").font = { name: BASE_FONT, bold: true, size: 14 };
  worksheet.getCell("C4").alignment = { horizontal: "left", vertical: "middle" };
  setMergedValueWithBorder(worksheet, "I4:J4", "殿", {
    font: { name: BASE_FONT, bold: true, size: 12 },
    alignment: { horizontal: "center", vertical: "middle" },
    border: thinBorder,
  });
  setPair(worksheet, "A5:B5", "C5:F5", "部門名", DEPARTMENT_NAME);
  worksheet.getCell("C5").alignment = { horizontal: "left", vertical: "middle" };
  setPair(worksheet, "G5:H5", "I5:J5", "社員NO", record.employeeNo);
  setPair(worksheet, "A6:B6", "C6:D6", "給与区分", salaryTypeLabel(record.salaryType));
  setPair(
    worksheet,
    "E6:F6",
    "G6:J6",
    record.salaryType === "monthly" ? "月給額" : "時給",
    record.salaryType === "monthly" ? (record.monthlySalary ?? 0) : (record.hourlyRate ?? 0),
    "#,##0",
  );

  setSectionHeader(worksheet, 7, "勤怠");
  setLabelRow(worksheet, 8, [
    "労働日数",
    "出勤日数",
    "有休休暇日数",
    "慶弔休暇日数",
    "欠勤日数",
    "遅刻回数",
    "早退回数",
    "超勤時間",
    "通常時間",
    "深夜時間",
  ]);
  setValueRow(
    worksheet,
    9,
    [
      record.workDays,
      record.workDays,
      0,
      0,
      0,
      0,
      0,
      0,
      record.regularHours,
      record.nightHours,
    ],
    ["0", "0", "0", "0", "0", "0", "0", "0.00", "0.00", "0.00"],
  );

  setSectionHeader(worksheet, 11, "支給");
  setPair(worksheet, "A12:B12", "A13:B13", "基本給", basePayAmount(record), "#,##0");
  setPair(worksheet, "C12:D12", "C13:D13", "役職手当", 0, "#,##0");
  setPair(worksheet, "E12:F12", "E13:F13", "資格手当", 0, "#,##0");
  setPair(worksheet, "G12:H12", "G13:H13", "家族手当", 0, "#,##0");
  setPair(worksheet, "I12:J12", "I13:J13", "時間外手当", record.nightPay, "#,##0");
  setPair(
    worksheet,
    "A14:B14",
    "A15:B15",
    "通勤手当",
    record.transportationAmount,
    "#,##0",
  );
  setMergedValueWithBorder(worksheet, "C14:H15", "", {
    border: thinBorder,
  });
  setPair(
    worksheet,
    "I14:J14",
    "I15:J15",
    "総支給額",
    record.grossPayment,
    "#,##0",
  );
  worksheet.getCell("I15").font = { name: BASE_FONT, bold: true, size: 11 };

  setSectionHeader(worksheet, 17, "控除");
  setPair(worksheet, "A18:B18", "A19:B19", "健康保険（介護）", 0, "#,##0");
  setPair(worksheet, "C18:D18", "C19:D19", "健康保険（健保）", 0, "#,##0");
  setPair(worksheet, "E18:F18", "E19:F19", "厚生年金", 0, "#,##0");
  setPair(worksheet, "G18:H18", "G19:H19", "雇用保険", 0, "#,##0");
  setPair(worksheet, "I18:J18", "I19:J19", "社会保険料", 0, "#,##0");
  setPair(worksheet, "A20:B20", "A21:B21", "所得税", record.incomeTax, "#,##0");
  setPair(worksheet, "C20:D20", "C21:D21", "住民税", 0, "#,##0");
  setPair(worksheet, "E20:F20", "E21:F21", "積立金", 0, "#,##0");
  setPair(worksheet, "G20:H20", "G21:H21", "食事代", record.mealDeduction, "#,##0");
  setPair(worksheet, "I20:J20", "I21:J21", "家賃", record.rentDeduction, "#,##0");
  setPair(
    worksheet,
    "A22:B22",
    "A23:B23",
    "その他控除",
    record.otherDeduction,
    "#,##0",
  );
  setMergedValueWithBorder(worksheet, "C22:H23", "", {
    border: thinBorder,
  });
  setPair(
    worksheet,
    "I22:J22",
    "I23:J23",
    "控除計",
    record.deductionTotal,
    "#,##0",
  );
  worksheet.getCell("I23").font = { name: BASE_FONT, bold: true, size: 11 };

  setMergedValueWithBorder(worksheet, "A26:D28", "差引支給額", {
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: NET_FILL },
    },
    font: { name: BASE_FONT, bold: true, size: 16 },
    alignment: { horizontal: "center", vertical: "middle" },
    border: mediumBorder,
  });
  const netCell = setMergedValueWithBorder(worksheet, "E26:J28", record.netPayment, {
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: NET_FILL },
    },
    font: { name: BASE_FONT, bold: true, size: 20 },
    alignment: { horizontal: "right", vertical: "middle" },
    border: mediumBorder,
  });
  netCell.numFmt = '#,##0" 円"';

  setSectionHeader(worksheet, 30, "備考欄");
  setMergedValueWithBorder(worksheet, "A31:J33", "", {
    font: { name: BASE_FONT, size: 10 },
    alignment: { horizontal: "left", vertical: "top", wrapText: true },
    border: thinBorder,
  });
  setPair(worksheet, "A35:B35", "C35:J35", "支払会社名", COMPANY_NAME);
  worksheet.getCell("C35").font = { name: BASE_FONT, bold: true, size: 11 };
  worksheet.getCell("C35").alignment = { horizontal: "left", vertical: "middle" };
}

export async function exportPayrollSlipsWorkbook(
  yearMonth: string,
  records: PayrollSlipRecord[],
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "payroll-attendance-app";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;

  const usedSheetNames = new Set<string>();
  const sortedRecords = [...records].sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName, "ja"),
  );

  for (const record of sortedRecords) {
    const sheetName = createUniqueSheetName(record.employeeName, usedSheetNames);
    buildSlipSheet(workbook, { ...record, yearMonth }, sheetName);
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}
