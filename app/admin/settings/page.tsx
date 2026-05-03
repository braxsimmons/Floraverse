import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ECONOMY } from "@/lib/config";

export default async function AdminSettingsPage() {
  const settings = await prisma.adminSetting.findMany();
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Economy</CardTitle>
          <CardDescription>Edit values in /lib/config.ts and redeploy.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-3 rounded-xl overflow-x-auto">{JSON.stringify(ECONOMY, null, 2)}</pre>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Admin settings</CardTitle>
          <CardDescription>Stored in `AdminSetting` for runtime tweaks.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-3 rounded-xl overflow-x-auto">{JSON.stringify(settings, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
