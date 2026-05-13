import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function getSupabaseBrowserConfigError() {
  const url = supabaseUrl?.trim();
  const publishableKey = supabasePublishableKey?.trim();

  if (!url || !publishableKey) {
    return "Supabase環境変数が未設定です";
  }

  if (publishableKey.startsWith("sb_secret_")) {
    return "SupabaseのPublishable KeyにSecret Keyは使えません。";
  }

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      return "Supabase URLの形式が不正です。";
    }
  } catch {
    return "Supabase URLの形式が不正です。";
  }

  return null;
}

export function createClient() {
  const configError = getSupabaseBrowserConfigError();

  if (configError) {
    throw new Error(configError);
  }

  return createBrowserClient(supabaseUrl!.trim(), supabasePublishableKey!.trim());
}
