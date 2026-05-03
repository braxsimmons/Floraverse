import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResolveReport } from "./resolve";

export default async function AdminReportsPage() {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      reporter: { select: { username: true } },
      targetUser: { select: { username: true } },
    },
  });
  return (
    <Card>
      <CardHeader><CardTitle>Reports</CardTitle></CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr><th className="py-2">When</th><th>Reporter</th><th>Target</th><th>Reason</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-2 text-xs text-muted-foreground">{r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td>@{r.reporter.username ?? "—"}</td>
                <td>@{r.targetUser?.username ?? "—"}</td>
                <td className="text-xs">{r.reason}</td>
                <td><Badge variant={r.status === "PENDING" ? "rose" : "mint"}>{r.status}</Badge></td>
                <td className="text-right">
                  {r.status === "PENDING" && <ResolveReport id={r.id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
