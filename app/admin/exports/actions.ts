"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ADMIN_EXPORT_COOKIE_NAME,
  adminExportCookieOptions,
  createAdminExportToken,
  isAdminExportPasswordConfigured,
  verifyAdminExportPassword,
} from "@/lib/admin/export-auth";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeYearMonth(yearMonth: string) {
  if (/^\d{4}-\d{2}$/.test(yearMonth)) {
    return yearMonth;
  }

  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 7);
}

export async function authenticateAdminExports(formData: FormData) {
  const yearMonth = normalizeYearMonth(readText(formData, "yearMonth"));
  const password = readText(formData, "password");

  if (!isAdminExportPasswordConfigured()) {
    redirect(
      `/admin/exports?yearMonth=${encodeURIComponent(
        yearMonth,
      )}&error=password_unset`,
    );
  }

  if (!verifyAdminExportPassword(password)) {
    redirect(
      `/admin/exports?yearMonth=${encodeURIComponent(
        yearMonth,
      )}&error=invalid_password`,
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(
    ADMIN_EXPORT_COOKIE_NAME,
    createAdminExportToken(),
    adminExportCookieOptions(),
  );

  redirect(`/admin/exports?yearMonth=${encodeURIComponent(yearMonth)}`);
}

export async function logoutAdminExports(formData: FormData) {
  const yearMonth = normalizeYearMonth(readText(formData, "yearMonth"));
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_EXPORT_COOKIE_NAME, "", {
    ...adminExportCookieOptions(),
    maxAge: 0,
  });

  redirect(`/admin/exports?yearMonth=${encodeURIComponent(yearMonth)}`);
}
