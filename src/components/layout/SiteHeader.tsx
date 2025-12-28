"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/try", label: "Try" },
  { href: "/audit", label: "Audit" },
  { href: "/validate", label: "Validate" },
  { href: "/directory", label: "Directory" },
  { href: "/monitors", label: "Monitors" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname.startsWith("/embed")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="group inline-flex items-center gap-2">
          <span className="font-display text-lg tracking-tight">CortSeal</span>
          <span className="rounded-full border border-border/70 bg-card/70 px-2 py-0.5 text-[11px] text-muted-foreground transition group-hover:text-foreground">
            PoI + PoUW
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium text-muted-foreground transition hover:text-foreground",
                isActive(pathname, link.href) && "text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="secondary" size="sm">
            <Link href="/validate">Mint a seal</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/try">Start a check</Link>
          </Button>
        </div>

        <div className="md:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? "Close" : "Menu"}
          </Button>
        </div>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-border/60 bg-background/90 px-6 py-4 md:hidden">
          <div className="grid gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "text-sm font-medium text-muted-foreground transition hover:text-foreground",
                  isActive(pathname, link.href) && "text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href="/validate" onClick={() => setOpen(false)}>
                  Mint a seal
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/try" onClick={() => setOpen(false)}>
                  Start a check
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
