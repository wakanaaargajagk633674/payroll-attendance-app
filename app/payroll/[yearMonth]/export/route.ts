import { NextResponse } from "next/server";

type Params = Promise<{
  yearMonth: string;
}>;

function adminExportUrl(request: Request, yearMonth: string) {
  const safeYearMonth = /^\d{4}-\d{2}$/.test(yearMonth) ? yearMonth : "";
  const pathname = safeYearMonth
    ? `/admin/exports/${encodeURIComponent(safeYearMonth)}/export`
    : "/admin/exports";

  return new URL(pathname, request.url);
}

export async function GET(
  request: Request,
  { params }: { params: Params },
) {
  const { yearMonth } = await params;
  return NextResponse.redirect(adminExportUrl(request, yearMonth));
}
