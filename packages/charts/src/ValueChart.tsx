"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, CHART_COLORS } from "./theme";

export interface ValuePoint {
  date: string;
  label: string;
  value: number;
  flow: number;
}

export interface ValueChartProps {
  points: ValuePoint[];
  formatValue: (value: number) => string;
  height?: number;
}

export function ValueChart({ points, formatValue, height = 260 }: ValueChartProps) {
  if (points.length === 0) return null;
  return (
    <div style={{ width: "100%", height }} data-testid="value-chart">
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid stroke={CHART_COLORS.line} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: CHART_COLORS.line }} minTickGap={24} />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={80}
            tickFormatter={(v: number) => formatValue(v)}
          />
          <Tooltip
            cursor={{ stroke: CHART_COLORS.muted, strokeDasharray: "3 3" }}
            contentStyle={{ borderColor: CHART_COLORS.line, borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: CHART_COLORS.muted }}
            formatter={(value) => [formatValue(Number(value)), "Depotwert"]}
          />
          <Line
            type="linear"
            dataKey="value"
            stroke={CHART_COLORS.green}
            strokeWidth={2}
            dot={{ r: 4, fill: CHART_COLORS.surface, stroke: CHART_COLORS.green, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: CHART_COLORS.green, stroke: CHART_COLORS.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
