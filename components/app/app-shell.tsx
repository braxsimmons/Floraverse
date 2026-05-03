"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sprout, ShoppingBag, Users, ListChecks, User } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CurrencyPill } from "@/components/game/currency-pill";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/garden", label: "Garden", icon: Sprout },
  { href: "/app/quests", label: "Quests", icon: ListChecks },
  { href: "/app/shop", label: "Shop", icon: ShoppingBag },
  { href: "/app/friends", label: "Friends", icon: Users },
  { href: "/app/profile", label: "You", icon: User },
];

export function AppShell({
  user,
  children,
}: {
  user: { name?: string | null; image?: string | null; petals: number; coins: number; gems: number; level: number };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen pb-24 sm:pb-0">
      <header className="sticky top-0 z-30 border-b backdrop-blur bg-background/70">
        <div className="container flex items-center justify-between gap-2 py-2.5">
          <Link href="/app" className="shrink-0">
            <Logo className="text-base sm:text-lg" />
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = n.href === "/app" ? pathname === n.href : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5",
                    active ? "bg-primary text-primary-foreground shadow-soft" : "hover:bg-muted",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <CurrencyPill kind="petals" amount={user.petals} />
            <CurrencyPill kind="coins" amount={user.coins} />
            <CurrencyPill kind="gems" amount={user.gems} />
            <Link href="/app/profile" className="hidden sm:block">
              <Avatar className="h-9 w-9 ring-2 ring-card ml-1">
                <AvatarImage src={user.image ?? undefined} alt={user.name ?? "You"} />
                <AvatarFallback>{(user.name ?? "U").slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-4 sm:py-6">{children}</main>

      {/* Bottom tab bar (mobile) */}
      <nav className="sm:hidden fixed bottom-2 inset-x-2 z-30 glass rounded-full px-1.5 py-1 shadow-cozy">
        <div className="flex items-center justify-between">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = n.href === "/app" ? pathname === n.href : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex-1 grid place-items-center py-1.5 rounded-full text-[10px] font-medium",
                  active ? "bg-primary text-primary-foreground" : "text-foreground/70",
                )}
              >
                <Icon className="h-4 w-4 mb-0.5" />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
