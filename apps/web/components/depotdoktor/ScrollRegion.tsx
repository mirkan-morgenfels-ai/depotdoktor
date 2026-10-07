"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export interface ScrollRegionProps {
  label: string;
  className?: string;
  testId?: string;
  children: ReactNode;
}

export function ScrollRegion({ label, className, testId, children }: ScrollRegionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [moreRight, setMoreRight] = useState(false);

  const measure = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    const hasOverflow = element.scrollWidth - element.clientWidth > 1;
    setOverflowing(hasOverflow);
    setMoreRight(hasOverflow && element.scrollLeft + element.clientWidth < element.scrollWidth - 1);
  }, []);

  useEffect(() => {
    measure();
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div className={className}>
      <div className="relative">
        <div
          ref={ref}
          role="region"
          tabIndex={0}
          aria-label={label}
          data-testid={testId}
          data-overflowing={overflowing ? "true" : "false"}
          onScroll={measure}
          className="overflow-x-auto"
        >
          {children}
        </div>
        {moreRight ? (
          <div
            aria-hidden="true"
            data-testid="scroll-shadow"
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-surface to-transparent"
          />
        ) : null}
      </div>
      {overflowing ? <p className="mt-2 text-xs text-muted sm:hidden">Tabelle seitlich wischen</p> : null}
    </div>
  );
}
