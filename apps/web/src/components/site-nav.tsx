import Link from 'next/link';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

/** Sticky top navigation shared across the landing page. */
export function SiteNav() {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-gold" />
          <span className="font-display text-lg font-semibold tracking-tight">did:hacd</span>
        </Link>
        <div className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link href="/#resolver" className="transition-colors hover:text-foreground">
            Resolve
          </Link>
          <Link href="/mint" className="transition-colors hover:text-foreground">
            Mint
          </Link>
          <Link href="/verify" className="transition-colors hover:text-foreground">
            Verify
          </Link>
          <a
            href="https://github.com"
            className="transition-colors hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            Spec
          </a>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:border-gold hover:text-foreground"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link
            href="/chat/did%3Ahacd%3ANHMYYM"
            className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Chat with PolyMind →
          </Link>
        </div>
      </div>
    </nav>
  );
}
