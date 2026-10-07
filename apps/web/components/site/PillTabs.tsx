"use client";

import type { KeyboardEvent } from "react";
import { cx } from "./cx";

export interface PillTab<T extends string> {
  id: T;
  label: string;
}

export interface PillTabsProps<T extends string> {
  tabs: ReadonlyArray<PillTab<T>>;
  active: T;
  onChange: (id: T) => void;
  label: string;
  idPrefix?: string;
  panelPrefix?: string;
  className?: string;
}

export function tabId(prefix: string, id: string): string {
  return `${prefix}-${id}`;
}

export function PillTabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
  idPrefix = "tab",
  panelPrefix = "panel",
  className,
}: PillTabsProps<T>) {
  function handleKey(event: KeyboardEvent<HTMLButtonElement>) {
    const index = tabs.findIndex((tab) => tab.id === active);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    const target = tabs[next];
    if (!target) return;
    onChange(target.id);
    document.getElementById(tabId(idPrefix, target.id))?.focus();
  }

  return (
    <div className={cx("max-w-full", className)}>
      <div
        role="tablist"
        aria-label={label}
        className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface p-1 shadow-[0_1px_2px_rgb(11_22_38/0.04)] min-[380px]:flex min-[380px]:flex-nowrap min-[380px]:gap-0.5 min-[380px]:rounded-full sm:inline-flex sm:w-auto"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              id={tabId(idPrefix, tab.id)}
              role="tab"
              aria-selected={selected}
              aria-controls={tabId(panelPrefix, tab.id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={handleKey}
              className={cx(
                "rounded-xl px-3 py-2 text-[0.8125rem] whitespace-nowrap transition-colors duration-150 min-[380px]:flex-auto min-[380px]:shrink-0 min-[380px]:rounded-full min-[380px]:px-2 min-[380px]:text-[0.78rem] sm:flex-none sm:px-5 sm:text-sm",
                selected ? "bg-navy-950 font-medium text-ivory shadow-[0_2px_8px_rgb(11_22_38/0.18)]" : "text-slate hover:bg-ivory hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
