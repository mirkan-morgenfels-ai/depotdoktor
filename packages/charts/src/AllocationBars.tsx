import { CHART_COLORS, seriesColor } from "./theme";

export interface AllocationBar {
  label: string;
  share: number;
  shareLabel: string;
  valueLabel: string;
}

export interface AllocationBarsProps {
  slices: AllocationBar[];
  testId?: string;
}

const PERCENT_PATTERN = /^(.*\d)(\s?%)$/;

function ShareValue({ label }: { label: string }) {
  const match = PERCENT_PATTERN.exec(label);
  if (!match || match[1] === undefined || match[2] === undefined) return <>{label}</>;
  return (
    <>
      <span>{match[1]}</span>
      <span className="ml-[0.06em] align-[0.18em] font-sans text-[0.42em] font-medium tracking-normal">{match[2]}</span>
    </>
  );
}

export function AllocationBars({ slices, testId }: AllocationBarsProps) {
  if (slices.length === 0) return null;
  return (
    <ul className="space-y-6" data-testid={testId}>
      {slices.map((slice, index) => {
        const color = seriesColor(index);
        const width = Math.max(0, Math.min(1, slice.share)) * 100;
        return (
          <li key={slice.label} data-testid="allocation-bar">
            <div className="flex items-end justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="inline-flex items-center gap-2.5 text-sm font-medium text-ink">
                  <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  {slice.label}
                </span>
                <span className="pl-5 text-[13px] text-slate [font-variant-numeric:tabular-nums]">{slice.valueLabel}</span>
              </div>
              <span className="font-display text-[1.75rem] leading-[0.9] font-medium tracking-[-0.01em] whitespace-nowrap text-ink [font-variant-numeric:lining-nums_tabular-nums] sm:text-[2rem]">
                <ShareValue label={slice.shareLabel} />
              </span>
            </div>
            <div aria-hidden="true" className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: CHART_COLORS.grid }}>
              <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
