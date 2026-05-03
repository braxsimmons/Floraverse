import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Users, Sprout, ShoppingBag, ListChecks, Flag, Settings, BarChart3 } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/plants", label: "Plants", icon: Sprout },
  { href: "/admin/shop", label: "Shop", icon: ShoppingBag },
  { href: "/admin/quests", label: "Quests", icon: ListChecks },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin");
  if (session.user.role !== "ADMIN" && session.user.role !== "MODERATOR") {
    redirect("/app");
  }

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-60 flex-col border-r p-4 gap-1 bg-card/60 backdrop-blur">
        <Link href="/" className="mb-4 px-2"><Logo /></Link>
        {NAV.map((n) => {
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm hover:bg-muted"
            >
              <Icon className="h-4 w-4" /> {n.label}
            </Link>
          );
        })}
        <div className="mt-auto pt-4">
          <Button asChild variant="outline" className="w-full">
            <Link href="/app">Back to app</Link>
          </Button>
        </div>
      </aside>
      <div className="flex-1">
        <main className="container py-6">{children}</main>
      </div>
    </div>
  );
}
