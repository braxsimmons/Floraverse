import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-md pretty-card-cozy p-8">
        <Link href="/"><Logo className="mb-6" /></Link>
        <h1 className="display text-3xl mb-1">Plant your garden</h1>
        <p className="text-muted-foreground mb-6">Free forever. Plus is optional.</p>
        <SignupForm />
        <p className="mt-6 text-sm text-center text-muted-foreground">
          Already growing?{" "}
          <Link href="/login" className="text-primary font-medium underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
