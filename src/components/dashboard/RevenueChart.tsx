'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useState, useEffect } from 'react';

const generateData = () => [
  { name: 'Jan', revenue: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Feb', revenue: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Mar', revenue: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Apr', revenue: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'May', revenue: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Jun', revenue: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Jul', revenue: 7240 },
  { name: 'Aug', revenue: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Sep', revenue: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Oct', revenue: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Nov', revenue: Math.floor(Math.random() * 5000) + 1000 },
  { name: 'Dec', revenue: Math.floor(Math.random() * 5000) + 1000 },
];

export function RevenueChart() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    setData(generateData());
  }, []);


  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
            contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))'
            }}
        />
        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
