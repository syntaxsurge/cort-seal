import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
  meta?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions, meta }: PageHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/80 px-6 py-8 shadow-sm backdrop-blur">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -right-16 top-[-30%] h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -left-10 bottom-[-30%] h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
      </div>
      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">{eyebrow}</p>
          <h1 className="font-display text-balance text-3xl md:text-4xl">{title}</h1>
          <p className="max-w-2xl text-pretty text-muted-foreground">{description}</p>
          {meta ? <div className="text-sm text-muted-foreground">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
