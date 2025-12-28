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
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">{eyebrow}</p>
        <h1 className="font-display text-balance text-3xl md:text-4xl">{title}</h1>
        <p className="max-w-2xl text-pretty text-muted-foreground">{description}</p>
        {meta ? <div className="text-sm text-muted-foreground">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
