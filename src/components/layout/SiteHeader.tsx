"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { SiteLogo } from "@/components/layout/SiteLogo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
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
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const updateHeight = () => {
      document.documentElement.style.setProperty(
        "--site-header-height",
        `${header.offsetHeight}px`
      );
    };

    updateHeight();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateHeight);
      return () => window.removeEventListener("resize", updateHeight);
    }

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(header);
    return () => resizeObserver.disconnect();
  }, []);

  if (pathname.startsWith("/embed")) return null;

  return (
    <div className="relative">
      <div aria-hidden="true" className="h-[var(--site-header-height)] w-full" />
      <header
        ref={headerRef}
        className={cn(
          "fixed inset-x-0 top-0 z-50 w-full border-b border-border/60 backdrop-blur transition",
          isScrolled ? "bg-background/95 shadow-sm shadow-black/5" : "bg-background/80"
        )}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <SiteLogo showTagline taglineClassName="hidden lg:block" priority />
            <span className="hidden items-center rounded-full border border-border/70 bg-card/70 px-2.5 py-0.5 text-[11px] text-muted-foreground sm:inline-flex">
              PoI + PoUW
            </span>
          </div>

          <nav className="hidden items-center gap-3 md:flex" aria-label="Primary">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(pathname, link.href) ? "page" : undefined}
                className={cn(
                  "relative rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition hover:text-foreground after:absolute after:-bottom-1 after:left-2 after:right-2 after:h-0.5 after:origin-left after:scale-x-0 after:bg-primary/70 after:transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/60",
                  isActive(pathname, link.href) && "text-foreground after:scale-x-100"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 md:flex">
              <Button asChild variant="secondary" size="sm">
                <Link href="/validate">Mint a seal</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-linear-to-r from-primary via-indigo-500 to-primary text-primary-foreground shadow-sm transition hover:opacity-90"
              >
                <Link href="/try">Start a check</Link>
              </Button>
            </div>
            <ThemeToggle />
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
        </div>

        {open ? (
          <div
            id="mobile-nav"
            className="animate-rise border-t border-border/60 bg-background/95 px-6 py-4 shadow-sm shadow-black/5 md:hidden"
          >
            <div className="grid gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/60",
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
                <Button
                  asChild
                  size="sm"
                  className="bg-linear-to-r from-primary via-indigo-500 to-primary text-primary-foreground shadow-sm transition hover:opacity-90"
                >
                  <Link href="/try" onClick={() => setOpen(false)}>
                    Start a check
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </header>
    </div>
  );
}
