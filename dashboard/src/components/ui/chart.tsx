'use client';

import { ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface ChartDataPoint {
  [key: string]: string | number;
}

interface ChartProps {
  data: readonly ChartDataPoint[];
  height?: number;
  className?: string;
}

interface LineChartProps extends ChartProps {
  lines: readonly { key: string; color: string; label?: string }[];
  xAxisKey?: string;
}

export function ChartLine({ data, lines, xAxisKey = 'date', height = 300, className }: LineChartProps) {
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={[...data]}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey={xAxisKey} tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              boxShadow: 'var(--shadow-md)',
            }}
          />
          {lines.map((line) => (
            <Line key={line.key} type="monotone" dataKey={line.key} stroke={line.color} strokeWidth={2} dot={false} name={line.label ?? line.key} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface AreaChartProps extends ChartProps {
  areas: readonly { key: string; color: string; label?: string }[];
  xAxisKey?: string;
}

export function ChartArea({ data, areas, xAxisKey = 'date', height = 300, className }: AreaChartProps) {
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={[...data]}>
          <defs>
            {areas.map((area) => (
              <linearGradient key={area.key} id={`grad-${area.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={area.color} stopOpacity={0.15} />
                <stop offset="100%" stopColor={area.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey={xAxisKey} tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 12 }} />
          {areas.map((area) => (
            <Area key={area.key} type="monotone" dataKey={area.key} stroke={area.color} strokeWidth={2} fill={`url(#grad-${area.key})`} name={area.label ?? area.key} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface BarChartProps extends ChartProps {
  bars: readonly { key: string; color: string; label?: string }[];
  xAxisKey?: string;
}

export function ChartBar({ data, bars, xAxisKey = 'date', height = 300, className }: BarChartProps) {
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={[...data]}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey={xAxisKey} tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 12 }} />
          {bars.map((bar) => (
            <Bar key={bar.key} dataKey={bar.key} fill={bar.color} radius={[4, 4, 0, 0]} name={bar.label ?? bar.key} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const PIE_COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

interface PieChartProps extends ChartProps {
  nameKey?: string;
  valueKey?: string;
  colors?: string[];
}

export function ChartPie({ data, nameKey = 'name', valueKey = 'value', colors = PIE_COLORS, height = 300, className }: PieChartProps) {
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={[...data]} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey={valueKey} nameKey={nameKey}>
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 12 }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
