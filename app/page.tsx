import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { Sparkles, Heart, Trophy, Sprout } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="container py-5 flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost"><Link href="/login">Log in</Link></Button>
          <Button asChild variant="default"><Link href="/signup">Start your garden</Link></Button>
        </nav>
      </header>

      <section className="container py-16 sm:py-28 grid lg:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <span className="pill bg-bloom-mint">
            <Sparkles className="h-3.5 w-3.5" /> Now in early bloom
          </span>
          <h1 className="display text-5xl sm:text-7xl font-semibold leading-[1.05]">
            A cozy little garden,<br />
            <span className="text-primary">tended together.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-prose">
            Plant. Grow. Visit friends. Leave kind notes. Floraverse is a slow, gentle game
            that fits in the corners of your day.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/signup">Plant your first seed</Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/login">I already have a garden</Link></Button>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 max-w-lg">
            {[
              { icon: Sprout, label: "20+ species" },
              { icon: Heart, label: "Visit friends" },
              { icon: Trophy, label: "Daily quests" },
              { icon: Sparkles, label: "Streak rewards" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="pretty-card p-3 text-xs flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" /> {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="pretty-card-cozy p-6 grid grid-cols-3 gap-3 mx-auto max-w-md aspect-square bg-gradient-to-br from-bloom-mint/40 via-card to-bloom-peach/40">
            {[
              "🌻", "🌸", "🌱",
              "🪻", "🌷", "🌿",
              "🌼", "🌹", "✨",
            ].map((emoji, i) => (
              <div
                key={i}
                className="rounded-2xl bg-card/80 grid place-items-center text-4xl shadow-soft animate-float"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                {emoji}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16 grid sm:grid-cols-3 gap-6">
        {[
          { title: "Plant + tend", body: "Real-time growth, gentle decay, and a soft daily loop." },
          { title: "Visit + delight", body: "Drop kind notes and sparkles in friends' gardens." },
          { title: "Collect + customize", body: "Rare seeds, decorations, and seasonal events." },
        ].map((f) => (
          <div key={f.title} className="pretty-card p-6">
            <h3 className="display text-2xl mb-2">{f.title}</h3>
            <p className="text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="container py-10 text-sm text-muted-foreground border-t mt-10 flex items-center justify-between">
        <span>© {new Date().getFullYear()} Floraverse</span>
        <span className="flex gap-4">
          <Link href="/login">Log in</Link>
          <Link href="/signup">Sign up</Link>
        </span>
      </footer>
    </div>
  );
}
