import Link from "next/link";
import { Home } from "lucide-react";

import { cn } from "@/lib/utils";

export function BackToHomeLink({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline",
        className,
      )}
    >
      <Home className="h-4 w-4" aria-hidden="true" />
      {"\u30c8\u30c3\u30d7\u3078\u623b\u308b"}
    </Link>
  );
}
