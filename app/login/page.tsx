import Link from "next/link";
import { LoginForm } from "./login-form";
import { Logo } from "@/components/brand/logo";

export default function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string } }) {
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-md pretty-card-cozy p-8">
        <Link href="/"><Logo className="mb-6" /></Link>
        <h1 className="display text-3xl mb-1">Welcome back</h1>
        <p className="text-muted-foreground mb-6">Your garden missed you.</p>
        <LoginForm callbackUrl={searchParams.callbackUrl ?? "/app"} />
        <p className="mt-6 text-sm text-center text-muted-foreground">
          New here?{" "}
          <Link href="/signup" className="text-primary font-medium underline-offset-4 hover:underline">
            Plant your garden
          </Link>
        </p>
      </div>
    </div>
  );
}
