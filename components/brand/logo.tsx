import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold display text-lg", className)}>
      <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M12 3c2.5 2.5 4 5 4 7.5A4 4 0 0 1 12 14a4 4 0 0 1-4-3.5C8 8 9.5 5.5 12 3z" />
          <path d="M5.5 14.5c1.6-.9 3.4-1 4.5-.5.6.3 1 .9 1 1.6 0 1.2-1.1 2.4-2.6 2.4-1.7 0-3.2-1.4-2.9-3.5z" opacity=".8" />
          <path d="M18.5 14.5c-1.6-.9-3.4-1-4.5-.5-.6.3-1 .9-1 1.6 0 1.2 1.1 2.4 2.6 2.4 1.7 0 3.2-1.4 2.9-3.5z" opacity=".8" />
          <rect x="11" y="13" width="2" height="8" rx="1" />
        </svg>
      </span>
      Floraverse
    </span>
  );
}
