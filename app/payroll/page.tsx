import Link from "next/link";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

type PayrollRecord = {
  id: string;
  year_month: string | null;
  gross_payment: number | string | null;
  deduction_total: number | string | null;
  net_payment: number | string | null;
  source: string | null;
};

type PayrollMonthSummary = {
  yearMonth: string;
  employeeCount: number;
  grossPayment: number;
  deductionTotal: number;
  netPayment: number;
  sources: string[];
};

const moneyFormatter = new Intl.NumberFormat("ja-JP");
const integerFormatter = new Intl.NumberFormat("ja-JP");

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numberValue =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatMoney(value: number) {
  return moneyFormatter.format(value);
}

function summarizePayroll(records: PayrollRecord[]) {
  const summaries = new Map<string, PayrollMonthSummary>();

  for (const record of records) {
    const yearMonth = record.year_month ?? "未設定";
    const current = summaries.get(yearMonth) ?? {
      yearMonth,
      employeeCount: 0,
      grossPayment: 0,
      deductionTotal: 0,
      netPayment: 0,
      sources: [],
    };

    current.employeeCount += 1;
    current.grossPayment += toNumber(record.gross_payment);
    current.deductionTotal += toNumber(record.deduction_total);
    current.netPayment += toNumber(record.net_payment);

    if (record.source && !current.sources.includes(record.source)) {
      current.sources.push(record.source);
    }

    summaries.set(yearMonth, current);
  }

  return Array.from(summaries.values()).sort((a, b) =>
    b.yearMonth.localeCompare(a.yearMonth),
  );
}

async function PayrollMonthsTable() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payroll_records")
    .select("id,year_month,gross_payment,deduction_total,net_payment,source");

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error.message}
      </div>
    );
  }

  const summaries = summarizePayroll((data ?? []) as PayrollRecord[]);

  return (
    <section className="rounded-md border bg-background shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
        <h2 className="text-lg font-semibold">給与月一覧</h2>
        <span className="text-sm text-muted-foreground">
          {integerFormatter.format(summaries.length)} か月
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">対象年月</th>
              <th className="px-4 py-3 text-right font-medium">対象人数</th>
              <th className="px-4 py-3 text-right font-medium">
                総支給額合計
              </th>
              <th className="px-4 py-3 text-right font-medium">控除合計</th>
              <th className="px-4 py-3 text-right font-medium">
                差引支給額合計
              </th>
              <th className="px-4 py-3 font-medium">source</th>
            </tr>
          </thead>
          <tbody>
            {summaries.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  給与データはまだありません。
                </td>
              </tr>
            ) : (
              summaries.map((summary) => (
                <tr
                  key={summary.yearMonth}
                  className="border-t transition-colors hover:bg-muted/40"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium">
                    <Link
                      href={`/payroll/${encodeURIComponent(summary.yearMonth)}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {summary.yearMonth}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {integerFormatter.format(summary.employeeCount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatMoney(summary.grossPayment)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatMoney(summary.deductionTotal)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatMoney(summary.netPayment)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {summary.sources.length === 0 ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        summary.sources.map((source) => (
                          <Badge key={source} variant="secondary">
                            {source}
                          </Badge>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function PayrollPage() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-normal">給与確認</h1>
          <p className="text-sm text-muted-foreground">
            Excel確定データとして登録した給与月の集計を確認します。
          </p>
        </div>

        <Suspense
          fallback={
            <section className="rounded-md border bg-background p-5 text-sm text-muted-foreground shadow-sm">
              読み込み中...
            </section>
          }
        >
          <PayrollMonthsTable />
        </Suspense>
      </div>
    </main>
  );
}
