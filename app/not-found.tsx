import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center px-4 text-center">
      <div className="space-y-4 max-w-md">
        <Logo />
        <h1 className="display text-5xl">Patch of dirt</h1>
        <p className="text-muted-foreground">We couldn't find that page. Maybe it never bloomed.</p>
        <Button asChild><Link href="/">Back home</Link></Button>
      </div>
    </div>
  );
}
