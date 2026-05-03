"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        className: "rounded-2xl border bg-card text-foreground shadow-cozy",
      }}
    />
  );
}

export { toast } from "sonner";
