import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserActions } from "./user-actions";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <Card>
      <CardHeader><CardTitle>Users</CardTitle></CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-2">Name</th>
              <th>Role</th>
              <th>Tier</th>
              <th>Petals</th>
              <th>Coins</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="py-2">
                  <div className="font-medium">{u.name ?? u.username}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </td>
                <td><Badge variant={u.role === "ADMIN" ? "gold" : "secondary"}>{u.role}</Badge></td>
                <td>{u.subscriptionTier}</td>
                <td>{u.petals}</td>
                <td>{u.bloomCoins}</td>
                <td>{u.bannedAt ? <Badge variant="rose">Banned</Badge> : <Badge variant="mint">Active</Badge>}</td>
                <td className="text-right"><UserActions userId={u.id} banned={!!u.bannedAt} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
