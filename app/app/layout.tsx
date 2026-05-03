import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tickStreak } from "@/lib/streak";
import { AppShell } from "@/components/app/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Side-effect: bump streak on session bootstrap
  await tickStreak(session.user.id).catch(() => null);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      name: true,
      image: true,
      petals: true,
      bloomCoins: true,
      level: true,
      subscriptionTier: true,
    },
  });

  return (
    <AppShell user={{ ...user, coins: user.bloomCoins }}>
      {children}
    </AppShell>
  );
}
