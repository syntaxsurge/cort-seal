"use client";

import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type SiteLogoProps = {
  className?: string;
  showTagline?: boolean;
  taglineClassName?: string;
  priority?: boolean;
};

export function SiteLogo({
  className,
  showTagline = false,
  taglineClassName,
  priority = false,
}: SiteLogoProps) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-3", className)}>
      <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-card/80 shadow-sm">
        <Image
          src="/images/cort-seal-logo.png"
          alt="CortSeal logo"
          width={96}
          height={96}
          className="h-8 w-8 object-contain"
          priority={priority}
        />
      </span>
      <span className="flex flex-col">
        <span className="font-display text-lg tracking-tight text-foreground">
          CortSeal
        </span>
        {showTagline ? (
          <span className={cn("text-xs text-muted-foreground", taglineClassName)}>
            Proof for creators and teams
          </span>
        ) : null}
      </span>
    </Link>
  );
}
