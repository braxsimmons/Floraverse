import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminOverview() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [users, plants, txs, dau] = await Promise.all([
    prisma.user.count(),
    prisma.userPlant.count(),
    prisma.transaction.count({ where: { status: "SUCCEEDED" } }),
    prisma.activityLog.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: since }, userId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="display text-3xl">Overview</h1>
      <div className="grid sm:grid-cols-4 gap-4">
        <Stat title="Users" value={users} />
        <Stat title="Plants" value={plants} />
        <Stat title="Successful txs" value={txs} />
        <Stat title="WAU" value={dau.length} />
      </div>
      <Card>
        <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
        <CardContent>
          <RecentActivity />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl display">{value.toLocaleString()}</CardTitle>
      </CardHeader>
    </Card>
  );
}

async function RecentActivity() {
  const rows = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { user: { select: { username: true } } },
  });
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-muted-foreground">
        <tr>
          <th className="py-2">When</th>
          <th>User</th>
          <th>Event</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t">
            <td className="py-2 text-muted-foreground">{r.createdAt.toISOString().slice(0, 19).replace("T", " ")}</td>
            <td>{r.user?.username ?? "—"}</td>
            <td className="capitalize">{r.event.replace(/_/g, " ")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
