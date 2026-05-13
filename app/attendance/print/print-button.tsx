"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

const TEXT = {
  print: "\u5370\u5237\u3059\u308b",
};

export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
      {TEXT.print}
    </Button>
  );
}
