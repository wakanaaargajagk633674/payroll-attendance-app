import { Suspense, type ReactNode } from "react";
import { cookies } from "next/headers";

import { BackToHomeLink } from "@/components/back-to-home-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ADMIN_EXPORT_COOKIE_NAME,
  isAdminExportPasswordConfigured,
  verifyAdminExportToken,
} from "@/lib/admin/export-auth";

import { authenticateAdminExports, logoutAdminExports } from "./actions";

type SearchParams = Promise<{
  yearMonth?: string | string[];
  error?: string | string[];
}>;

const TEXT = {
  title: "Excel\u51fa\u529b\u7ba1\u7406",
  description:
    "\u3053\u306eURL\u306f\u7ba1\u7406\u8005\u5c02\u7528\u3067\u3059\u3002\u7d66\u4e0e\u660e\u7d30Excel\u3068\u4f1a\u8a08\u58eb\u63d0\u51fa\u7528Excel\u3092\u51fa\u529b\u3057\u307e\u3059\u3002",
  yearMonth: "\u5bfe\u8c61\u6708",
  show: "\u8868\u793a",
  password: "\u7ba1\u7406\u30d1\u30b9\u30ef\u30fc\u30c9",
  authenticate: "\u8a8d\u8a3c",
  passwordUnset:
    "\u7ba1\u7406\u30d1\u30b9\u30ef\u30fc\u30c9\u304c\u672a\u8a2d\u5b9a\u3067\u3059\u3002",
  invalidPassword:
    "\u7ba1\u7406\u30d1\u30b9\u30ef\u30fc\u30c9\u304c\u9055\u3044\u307e\u3059\u3002",
  unauthorized:
    "\u7ba1\u7406\u8a8d\u8a3c\u304c\u5fc5\u8981\u3067\u3059\u3002",
  slipsExport: "\u7d66\u4e0e\u660e\u7d30Excel\u51fa\u529b",
  accountantExport:
    "\u4f1a\u8a08\u58eb\u63d0\u51fa\u7528Excel\u51fa\u529b",
  authenticated:
    "\u7ba1\u7406\u8a8d\u8a3c\u6e08\u307f\u3067\u3059\u3002\u51fa\u529b\u30ea\u30f3\u30af\u306f12\u6642\u9593\u6709\u52b9\u3067\u3059\u3002",
  logout: "\u30ed\u30b0\u30a2\u30a6\u30c8",
  loading: "\u8aad\u307f\u8fbc\u307f\u4e2d\u3067\u3059\u3002",
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function defaultYearMonth() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 7);
}

function normalizeYearMonth(value: string | undefined) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }

  return defaultYearMonth();
}

function errorMessage(error: string | undefined) {
  if (error === "password_unset") {
    return TEXT.passwordUnset;
  }

  if (error === "invalid_password") {
    return TEXT.invalidPassword;
  }

  if (error === "unauthorized") {
    return TEXT.unauthorized;
  }

  return null;
}

async function isAuthenticated() {
  const cookieStore = await cookies();
  return verifyAdminExportToken(cookieStore.get(ADMIN_EXPORT_COOKIE_NAME)?.value);
}

function PageFrame({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <BackToHomeLink />
          <h1 className="text-2xl font-semibold tracking-normal">
            {TEXT.title}
          </h1>
          <p className="text-sm text-muted-foreground">{TEXT.description}</p>
        </div>
        {children}
      </div>
    </main>
  );
}

function MonthSelector({ yearMonth }: { yearMonth: string }) {
  return (
    <form className="grid gap-3 md:grid-cols-[180px_auto] md:items-end">
      <div className="grid gap-2">
        <Label htmlFor="yearMonth">{TEXT.yearMonth}</Label>
        <Input
          id="yearMonth"
          name="yearMonth"
          type="month"
          defaultValue={yearMonth}
        />
      </div>
      <Button type="submit" variant="outline">
        {TEXT.show}
      </Button>
    </form>
  );
}

function LoginForm({
  yearMonth,
  disabled,
}: {
  yearMonth: string;
  disabled: boolean;
}) {
  return (
    <form action={authenticateAdminExports} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="login-yearMonth">{TEXT.yearMonth}</Label>
        <Input
          id="login-yearMonth"
          name="yearMonth"
          type="month"
          defaultValue={yearMonth}
          disabled={disabled}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">{TEXT.password}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          disabled={disabled}
          required
        />
      </div>
      <Button type="submit" disabled={disabled}>
        {TEXT.authenticate}
      </Button>
    </form>
  );
}

function ExportLinks({ yearMonth }: { yearMonth: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Button asChild>
        <a href={`/admin/exports/${encodeURIComponent(yearMonth)}/export`}>
          {TEXT.slipsExport}
        </a>
      </Button>
      <Button asChild variant="outline">
        <a
          href={`/admin/exports/${encodeURIComponent(
            yearMonth,
          )}/accountant-export`}
        >
          {TEXT.accountantExport}
        </a>
      </Button>
    </div>
  );
}

async function AdminExportsContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const yearMonth = normalizeYearMonth(firstParam(params.yearMonth));
  const configured = isAdminExportPasswordConfigured();
  const authenticated = configured ? await isAuthenticated() : false;
  const message = !configured
    ? TEXT.passwordUnset
    : errorMessage(firstParam(params.error));

  return (
    <PageFrame>
      {message ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {message}
        </div>
      ) : null}

      <section className="grid gap-5 rounded-md border bg-background p-5 shadow-sm">
        {authenticated ? (
          <>
            <MonthSelector yearMonth={yearMonth} />
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {TEXT.authenticated}
            </div>
            <ExportLinks yearMonth={yearMonth} />
            <form action={logoutAdminExports}>
              <input type="hidden" name="yearMonth" value={yearMonth} />
              <Button type="submit" variant="secondary">
                {TEXT.logout}
              </Button>
            </form>
          </>
        ) : (
          <LoginForm yearMonth={yearMonth} disabled={!configured} />
        )}
      </section>
    </PageFrame>
  );
}

export default function AdminExportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense
      fallback={
        <PageFrame>
          <section className="rounded-md border bg-background p-5 text-sm text-muted-foreground shadow-sm">
            {TEXT.loading}
          </section>
        </PageFrame>
      }
    >
      <AdminExportsContent searchParams={searchParams} />
    </Suspense>
  );
}
