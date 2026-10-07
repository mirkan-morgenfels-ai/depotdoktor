"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, CHART_COLORS, TOOLTIP_CONTENT_STYLE, TOOLTIP_ITEM_STYLE, TOOLTIP_LABEL_STYLE } from "./theme";

export interface ValuePoint {
  time: number;
  date: string;
  label: string;
  value: number;
  flow: number;
}

export interface ValueChartProps {
  points: ValuePoint[];
  formatValue: (value: number) => string;
  formatAxis?: (value: number) => string;
  height?: number;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDayMonth(time: number): string {
  const date = new Date(time);
  return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.`;
}

export function formatFullDate(time: number): string {
  const date = new Date(time);
  return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`;
}

export function ValueChart({ points, formatValue, formatAxis, height = 280 }: ValueChartProps) {
  const gradientId = `value-fill-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (points.length === 0) return null;
  return (
    <div style={{ width: "100%", height }} data-testid="value-chart">
      <ResponsiveContainer>
        <AreaChart data={points} margin={{ top: 16, right: 12, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.navy} stopOpacity={0.09} />
              <stop offset="100%" stopColor={CHART_COLORS.navy} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: CHART_COLORS.line }}
            tickFormatter={(v: number) => formatDayMonth(v)}
            tickMargin={10}
            minTickGap={24}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={76}
            tickMargin={6}
            tickFormatter={(v: number) => (formatAxis ?? formatValue)(v)}
          />
          <Tooltip
            cursor={{ stroke: CHART_COLORS.gold, strokeWidth: 1, strokeDasharray: "3 4" }}
            contentStyle={TOOLTIP_CONTENT_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            separator=": "
            labelFormatter={(v) => formatFullDate(Number(v))}
            formatter={(value) => [formatValue(Number(value)), "Depotwert"]}
          />
          <Area
            type="stepAfter"
            dataKey="value"
            stroke={CHART_COLORS.navy}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={{ r: 4, fill: CHART_COLORS.surface, stroke: CHART_COLORS.navy, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: CHART_COLORS.gold, stroke: CHART_COLORS.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
