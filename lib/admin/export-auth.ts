import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_EXPORT_COOKIE_NAME = "admin_export_auth";
export const ADMIN_EXPORT_MAX_AGE_SECONDS = 60 * 60 * 12;

const COOKIE_PURPOSE = "payroll-attendance-admin-export-v1";

export function getAdminExportPassword() {
  return process.env.ADMIN_EXPORT_PASSWORD?.trim() ?? "";
}

export function isAdminExportPasswordConfigured() {
  return getAdminExportPassword().length > 0;
}

export function createAdminExportToken() {
  const password = getAdminExportPassword();

  if (!password) {
    return "";
  }

  return createHmac("sha256", password).update(COOKIE_PURPOSE).digest("hex");
}

export function verifyAdminExportPassword(inputPassword: string) {
  const password = getAdminExportPassword();

  if (!password || !inputPassword) {
    return false;
  }

  const actual = Buffer.from(inputPassword);
  const expected = Buffer.from(password);

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

export function verifyAdminExportToken(token: string | undefined) {
  const expectedToken = createAdminExportToken();

  if (!expectedToken || !token) {
    return false;
  }

  const actual = Buffer.from(token);
  const expected = Buffer.from(expectedToken);

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

export function adminExportCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/admin/exports",
    maxAge: ADMIN_EXPORT_MAX_AGE_SECONDS,
  };
}
