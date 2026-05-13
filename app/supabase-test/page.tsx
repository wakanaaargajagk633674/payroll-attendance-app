import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

async function SupabaseResult() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("employees").select("*").limit(10);

  const result = {
    data,
    error: error
      ? {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      : null,
  };

  return (
    <pre className="overflow-auto rounded-md border bg-muted p-4 text-sm">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}

export default function SupabaseTestPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-4 text-2xl font-bold">Supabase Connection Test</h1>
      <Suspense
        fallback={
          <pre className="overflow-auto rounded-md border bg-muted p-4 text-sm">
            Loading Supabase data...
          </pre>
        }
      >
        <SupabaseResult />
      </Suspense>
    </main>
  );
}
