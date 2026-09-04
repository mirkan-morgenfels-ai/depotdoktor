"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, CHART_COLORS } from "./theme";

export interface AllocationBar {
  label: string;
  share: number;
  value: number;
}

export interface AllocationBarsProps {
  slices: AllocationBar[];
  formatShare: (share: number) => string;
  formatValue: (value: number) => string;
  testId?: string;
}

export function AllocationBars({ slices, formatShare, formatValue, testId }: AllocationBarsProps) {
  if (slices.length === 0) return null;
  const height = 24 + slices.length * 36;
  return (
    <div style={{ width: "100%", height }} data-testid={testId}>
      <ResponsiveContainer>
        <BarChart data={slices} layout="vertical" margin={{ top: 4, right: 64, bottom: 4, left: 8 }} barCategoryGap={8}>
          <XAxis type="number" domain={[0, 1]} hide />
          <YAxis type="category" dataKey="label" width={170} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: CHART_COLORS.line, opacity: 0.4 }}
            contentStyle={{ borderColor: CHART_COLORS.line, borderRadius: 6, fontSize: 12 }}
            formatter={(value, _name, item) => [
              `${formatShare(Number(value))} · ${formatValue(Number((item.payload as AllocationBar).value))}`,
              "Anteil",
            ]}
          />
          <Bar dataKey="share" fill={CHART_COLORS.green} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="share" position="right" formatter={(v: unknown) => formatShare(Number(v))} style={{ fill: CHART_COLORS.ink, fontSize: 12 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
