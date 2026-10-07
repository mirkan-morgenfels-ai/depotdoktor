import type { ReactNode } from "react";
import { cx } from "@portfolio/ui";

export interface PanelProps {
  title: string;
  eyebrow?: string;
  aside?: ReactNode;
  testId?: string;
  className?: string;
  children: ReactNode;
}

export function Panel({ title, eyebrow, aside, testId, className, children }: PanelProps) {
  return (
    <section className={cx("rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-8", className)} data-testid={testId}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
          <h2 className="font-display text-[1.625rem] leading-tight font-medium tracking-[-0.01em] text-ink sm:text-[1.75rem]">{title}</h2>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
