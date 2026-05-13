const MINUTES_PER_DAY = 24 * 60;
const REGULAR_START_MINUTES = 5 * 60;
const NIGHT_START_MINUTES = 22 * 60;
const NIGHT_END_NEXT_DAY_MINUTES = 29 * 60;

export type CalculateAttendanceInput = {
  clockIn: string;
  clockOut: string;
  breakMinutes: number;
};

export type AttendanceCalculationResult = {
  regularHours: number;
  nightHours: number;
};

function roundHours(minutes: number) {
  return Math.round((minutes / 60) * 100) / 100;
}

function overlapMinutes(
  startMinutes: number,
  endMinutes: number,
  rangeStartMinutes: number,
  rangeEndMinutes: number,
) {
  return Math.max(
    0,
    Math.min(endMinutes, rangeEndMinutes) -
      Math.max(startMinutes, rangeStartMinutes),
  );
}

export function parseClockTimeToMinutes(time: string) {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

  if (!match) {
    throw new Error("時刻は HH:mm 形式で入力してください。");
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] ? Number(match[3]) : 0;

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    !Number.isInteger(seconds) ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    throw new Error("時刻の形式が不正です。");
  }

  if (hours === 24 && minutes === 0 && seconds === 0) {
    return MINUTES_PER_DAY;
  }

  if (hours < 0 || hours > 23) {
    throw new Error("時刻の形式が不正です。");
  }

  return hours * 60 + minutes + Math.round(seconds / 60);
}

export function formatClockTimeForDatabase(time: string) {
  const minutes = parseClockTimeToMinutes(time) % MINUTES_PER_DAY;
  const hoursPart = Math.floor(minutes / 60);
  const minutesPart = minutes % 60;

  return `${String(hoursPart).padStart(2, "0")}:${String(minutesPart).padStart(
    2,
    "0",
  )}:00`;
}

export function calculateAttendance({
  clockIn,
  clockOut,
  breakMinutes,
}: CalculateAttendanceInput): AttendanceCalculationResult {
  if (!Number.isInteger(breakMinutes) || breakMinutes < 0) {
    throw new Error("休憩時間は0以上の分数で入力してください。");
  }

  const startMinutes = parseClockTimeToMinutes(clockIn);
  let endMinutes = parseClockTimeToMinutes(clockOut);

  if (endMinutes <= startMinutes) {
    endMinutes += MINUTES_PER_DAY;
  }

  const regularMinutesBeforeBreak = overlapMinutes(
    startMinutes,
    endMinutes,
    REGULAR_START_MINUTES,
    NIGHT_START_MINUTES,
  );
  const regularMinutes = Math.max(
    regularMinutesBeforeBreak - breakMinutes,
    0,
  );
  const earlyNightMinutes = overlapMinutes(
    startMinutes,
    endMinutes,
    0,
    REGULAR_START_MINUTES,
  );
  const lateNightMinutes = overlapMinutes(
    startMinutes,
    endMinutes,
    NIGHT_START_MINUTES,
    NIGHT_END_NEXT_DAY_MINUTES,
  );

  return {
    regularHours: roundHours(regularMinutes),
    nightHours: roundHours(earlyNightMinutes + lateNightMinutes),
  };
}

export const attendanceCalculationExamples = [
  {
    input: { clockIn: "18:00", clockOut: "24:00", breakMinutes: 60 },
    expected: { regularHours: 3, nightHours: 2 },
  },
  {
    input: { clockIn: "19:00", clockOut: "23:30", breakMinutes: 60 },
    expected: { regularHours: 2, nightHours: 1.5 },
  },
  {
    input: { clockIn: "17:00", clockOut: "21:00", breakMinutes: 60 },
    expected: { regularHours: 3, nightHours: 0 },
  },
  {
    input: { clockIn: "21:30", clockOut: "24:00", breakMinutes: 60 },
    expected: { regularHours: 0, nightHours: 2 },
  },
  {
    input: { clockIn: "22:00", clockOut: "24:00", breakMinutes: 0 },
    expected: { regularHours: 0, nightHours: 2 },
  },
] as const;
