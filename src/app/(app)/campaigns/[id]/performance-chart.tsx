"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ChartPoint {
  date: string;
  spend: number;
  revenue: number;
  leads: number;
}

export function PerformanceChart({ data }: { data: ChartPoint[] }) {
  if (data.length < 2) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        The trend chart appears once there are at least two days of data.
      </p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickMargin={6} />
          <YAxis yAxisId="money" tick={{ fontSize: 11 }} width={48} />
          <YAxis
            yAxisId="leads"
            orientation="right"
            tick={{ fontSize: 11 }}
            width={36}
          />
          <Tooltip />
          <Legend />
          <Line
            yAxisId="money"
            type="monotone"
            dataKey="spend"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            name="Spend"
          />
          <Line
            yAxisId="money"
            type="monotone"
            dataKey="revenue"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            name="Revenue"
          />
          <Line
            yAxisId="leads"
            type="monotone"
            dataKey="leads"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            name="Leads"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
