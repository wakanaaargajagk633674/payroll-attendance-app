import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  CalendarClock,
  Calculator,
  ClipboardCheck,
  FileSpreadsheet,
  UsersRound,
} from "lucide-react";

import { AuthButton } from "@/components/auth-button";
import { EnvVarWarning } from "@/components/env-var-warning";
import { hasEnvVars } from "@/lib/utils";

const TEXT = {
  appName:
    "\u3070\u304b\u606f\u5b50 \u52e4\u6020\u30fb\u7d66\u4e0e\u7ba1\u7406",
  subtitle:
    "\u51fa\u52e4\u5165\u529b\u304b\u3089\u7d66\u4e0e\u78ba\u8a8d\u307e\u3067\u3092\u307e\u3068\u3081\u3066\u7ba1\u7406\u3067\u304d\u307e\u3059",
  managerMenu: "\u5e97\u9577\u7528\u30e1\u30cb\u30e5\u30fc",
  flowTitle:
    "\u6708\u6b21\u4f5c\u696d\u306e\u6d41\u308c",
  flowDescription:
    "\u6bce\u65e5\u306e\u5165\u529b\u304b\u3089\u6708\u672b\u306e\u7d66\u4e0e\u78ba\u5b9a\u307e\u3067\u3001\u3053\u306e\u9806\u756a\u3067\u9032\u3081\u308b\u3068\u5b89\u5fc3\u3067\u3059\u3002",
  mainMenu: "\u4eca\u65e5\u3084\u308b\u3053\u3068\u3092\u9078\u3076",
  adminTitle:
    "\u7ba1\u7406\u8005\u5c02\u7528",
  adminNote:
    "\u7ba1\u7406\u8005\u5c02\u7528\u3067\u3059\u3002\u30d1\u30b9\u30ef\u30fc\u30c9\u304c\u5fc5\u8981\u3067\u3059\u3002",
  helpDaily:
    "\u6bce\u65e5\u306e\u5165\u529b\u306f\u300c\u52e4\u6020\u3092\u5165\u529b\u3059\u308b\u300d\u304b\u3089\u59cb\u3081\u3066\u304f\u3060\u3055\u3044\u3002",
  helpMonthly:
    "\u6708\u672b\u306f\u300c\u6708\u6b21\u7d66\u4e0e\u3092\u4f5c\u6210\u3059\u308b\u300d\u2192\u300c\u7d66\u4e0e\u3092\u78ba\u8a8d\u30fb\u4fee\u6b63\u3059\u308b\u300d\u306e\u9806\u756a\u3067\u9032\u3081\u307e\u3059\u3002",
};

const steps = [
  {
    number: "1",
    title: "\u52e4\u6020\u3092\u5165\u529b",
    description:
      "\u51fa\u52e4\u30fb\u9000\u52e4\u30fb\u4f11\u61a9\u3092\u65e5\u3054\u3068\u306b\u5165\u308c\u307e\u3059\u3002",
  },
  {
    number: "2",
    title: "\u6708\u6b21\u7d66\u4e0e\u3092\u4f5c\u6210",
    description:
      "\u5165\u529b\u6e08\u307f\u306e\u52e4\u6020\u304b\u3089\u7d66\u4e0e\u3092\u81ea\u52d5\u8a08\u7b97\u3057\u307e\u3059\u3002",
  },
  {
    number: "3",
    title: "\u7d66\u4e0e\u3092\u78ba\u8a8d\u30fb\u4fee\u6b63",
    description:
      "\u4ea4\u901a\u8cbb\u3084\u63a7\u9664\u3092\u78ba\u8a8d\u3057\u3066\u4fdd\u5b58\u3057\u307e\u3059\u3002",
  },
];

const mainMenus = [
  {
    title: "\u52e4\u6020\u3092\u5165\u529b\u3059\u308b",
    href: "/attendance/monthly",
    description:
      "\u6708\u3054\u3068\u30fb\u5f93\u696d\u54e1\u3054\u3068\u306b\u51fa\u52e4\u3001\u9000\u52e4\u3001\u4f11\u61a9\u3092\u5165\u529b\u3057\u307e\u3059\u3002",
    action: "\u307e\u305a\u306f\u3053\u3061\u3089",
    icon: CalendarClock,
    featured: true,
  },
  {
    title: "\u5f93\u696d\u54e1\u3092\u7ba1\u7406\u3059\u308b",
    href: "/employees",
    description:
      "\u5f93\u696d\u54e1\u540d\u3001\u8868\u793a\u540d\u3001\u6642\u7d66\u3001\u4ea4\u901a\u8cbb\u3001\u5728\u7c4d\u72b6\u6cc1\u3092\u78ba\u8a8d\u30fb\u7de8\u96c6\u3057\u307e\u3059\u3002",
    action: "\u78ba\u8a8d\u3059\u308b",
    icon: UsersRound,
  },
  {
    title: "\u6708\u6b21\u7d66\u4e0e\u3092\u4f5c\u6210\u3059\u308b",
    href: "/payroll/generate",
    description:
      "\u5165\u529b\u6e08\u307f\u306e\u52e4\u6020\u304b\u3089\u3001\u5bfe\u8c61\u6708\u306e\u7d66\u4e0e\u3092\u81ea\u52d5\u8a08\u7b97\u3057\u307e\u3059\u3002",
    action: "\u4f5c\u6210\u3059\u308b",
    icon: Calculator,
  },
  {
    title: "\u7d66\u4e0e\u3092\u78ba\u8a8d\u30fb\u4fee\u6b63\u3059\u308b",
    href: "/payroll",
    description:
      "\u4f5c\u6210\u6e08\u307f\u306e\u7d66\u4e0e\u3092\u78ba\u8a8d\u3057\u3001\u4ea4\u901a\u8cbb\u3084\u63a7\u9664\u3092\u4fee\u6b63\u3057\u307e\u3059\u3002",
    action: "\u78ba\u8a8d\u3059\u308b",
    icon: ClipboardCheck,
  },
];

function FlowSteps() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-950">
          {TEXT.flowTitle}
        </h2>
        <p className="text-sm leading-6 text-slate-600">
          {TEXT.flowDescription}
        </p>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.number}
            className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              {step.number}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-950">{step.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MainMenuCards() {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {mainMenus.map((item) => {
        const Icon = item.icon;
        const featuredClasses = item.featured
          ? "border-emerald-300 bg-emerald-50 shadow-md shadow-emerald-100/80 hover:border-emerald-400"
          : "border-slate-200 bg-white shadow-sm hover:border-slate-300";

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex min-h-[188px] flex-col justify-between rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 md:p-6 ${featuredClasses}`}
          >
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={
                      item.featured
                        ? "flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-700 text-white"
                        : "flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700"
                    }
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    {item.featured ? (
                      <span className="mb-1 inline-flex rounded-full bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white">
                        {item.action}
                      </span>
                    ) : null}
                    <h3 className="text-xl font-semibold tracking-normal text-slate-950">
                      {item.title}
                    </h3>
                  </div>
                </div>
                <ArrowRight
                  className="mt-1 h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-4 text-base leading-7 text-slate-600">
                {item.description}
              </p>
            </div>
            <div
              className={
                item.featured
                  ? "mt-5 inline-flex w-fit items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm"
                  : "mt-5 inline-flex w-fit items-center rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
              }
            >
              {item.featured ? "\u5165\u529b\u753b\u9762\u3092\u958b\u304f" : item.action}
            </div>
          </Link>
        );
      })}
    </section>
  );
}

function AdminMenu() {
  return (
    <section className="border-t border-slate-200 pt-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {TEXT.adminTitle}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{TEXT.adminNote}</p>
        </div>
      </div>
      <Link
        href="/admin/exports"
        className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-950">
              \u7ba1\u7406\u8005\u5c02\u7528\uff1aExcel\u51fa\u529b
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              \u7d66\u4e0e\u660e\u7d30Excel\u3001\u4f1a\u8a08\u58eb\u63d0\u51fa\u7528Excel\u3092\u51fa\u529b\u3057\u307e\u3059\u3002
            </p>
          </div>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
          \u958b\u304f
          <ArrowRight
            className="h-4 w-4 transition group-hover:translate-x-1"
            aria-hidden="true"
          />
        </div>
      </Link>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm md:px-8 md:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                {TEXT.managerMenu}
              </div>
              <h1 className="text-3xl font-bold tracking-normal text-slate-950 md:text-4xl">
                {TEXT.appName}
              </h1>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                {TEXT.subtitle}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              {!hasEnvVars ? (
                <EnvVarWarning />
              ) : (
                <Suspense fallback={null}>
                  <AuthButton />
                </Suspense>
              )}
            </div>
          </div>
        </header>

        <FlowSteps />

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              {TEXT.mainMenu}
            </h2>
          </div>
          <MainMenuCards />
        </section>

        <AdminMenu />

        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600 shadow-sm">
          <p>{TEXT.helpDaily}</p>
          <p className="mt-1">{TEXT.helpMonthly}</p>
        </section>
      </div>
    </main>
  );
}
