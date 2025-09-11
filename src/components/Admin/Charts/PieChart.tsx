'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DataPoint {
  name: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: DataPoint[];
  title?: string;
  height?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  colors?: string[];
}

const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
  '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
];

export default function AdminPieChart({
  data,
  title,
  height = 300,
  showLegend = true,
  showTooltip = true,
  colors = DEFAULT_COLORS,
}: PieChartProps) {
  const dataWithColors = data.map((item, index) => ({
    ...item,
    color: item.color || colors[index % colors.length],
  }));

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={dataWithColors}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
          >
            {dataWithColors.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          {showTooltip && (
            <Tooltip 
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg)',
                border: '1px solid var(--tooltip-border)',
                borderRadius: '6px',
                color: 'var(--tooltip-color)',
              }}
            />
          )}
          {showLegend && (
            <Legend 
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '14px',
              }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}