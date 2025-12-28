"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SiteLogo } from "@/components/layout/SiteLogo";

const footerLinks = [
  { href: "/try", label: "Try" },
  { href: "/validate", label: "Validate" },
  { href: "/directory", label: "Directory" },
  { href: "/monitors", label: "Monitors" },
  { href: "/api/openapi.json", label: "OpenAPI" },
];

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/embed")) return null;

  return (
    <footer className="mt-auto border-t border-border/60 bg-background/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <SiteLogo showTagline taglineClassName="text-sm" />
          <p className="text-sm text-muted-foreground">
            Proof-backed claim checks with redundant inference, seals, and portable evidence.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
          <a
            href="https://docs.cortensor.network"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            Cortensor docs
          </a>
        </div>
      </div>
    </footer>
  );
}
