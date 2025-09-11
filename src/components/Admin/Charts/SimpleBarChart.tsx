'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DataPoint {
  [key: string]: any;
}

interface SimpleBarChartProps {
  data: DataPoint[];
  dataKey?: string;
  xAxisKey?: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
}

export default function SimpleBarChart({
  data,
  dataKey = 'value',
  xAxisKey = 'name',
  color = '#3b82f6',
  height = 250,
  showGrid = true,
  showTooltip = true,
}: SimpleBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {showGrid && (
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#f0f0f0"
          />
        )}
        <XAxis 
          dataKey={xAxisKey}
          tick={{ fontSize: 12, fill: '#666' }}
          axisLine={{ stroke: '#e0e0e0' }}
        />
        <YAxis 
          tick={{ fontSize: 12, fill: '#666' }}
          axisLine={{ stroke: '#e0e0e0' }}
        />
        {showTooltip && (
          <Tooltip 
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{ color: '#333' }}
          />
        )}
        <Bar 
          dataKey={dataKey} 
          fill={color}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}