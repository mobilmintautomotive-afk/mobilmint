'use client'

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'
import { formatAngka, formatRupiah, formatRupiahSingkat } from '@/lib/format'
import { ChartTooltip, chartColors } from './chart-shell'

export type TitikTrend = {
  bulan: string
  unit: number
  nilai: number
}

/**
 * Combo chart: bar = jumlah unit terjual per bulan,
 * line = nilai penjualan (Rp). Dipakai di dashboard holding & investor.
 */
export function SalesTrendChart({
  data,
  labelBar = 'Unit Terjual',
  labelLine = 'Nilai Penjualan',
  lineColor = chartColors.success,
}: {
  data: TitikTrend[]
  labelBar?: string
  labelLine?: string
  lineColor?: string
}) {
  return (
    <div className="h-[260px] w-full sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={chartColors.grid} />
          <XAxis
            dataKey="bulan"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: chartColors.muted }}
          />
          <YAxis
            yAxisId="unit"
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={34}
            tick={{ fontSize: 12, fill: chartColors.muted }}
          />
          <YAxis
            yAxisId="nilai"
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={60}
            tickFormatter={(v) => formatRupiahSingkat(v)}
            tick={{ fontSize: 12, fill: chartColors.muted }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(37,99,235,.06)' }}
            content={
              <ChartTooltip
                formatter={(p: any) =>
                  p.dataKey === 'unit' ? `${formatAngka(p.value)} unit` : formatRupiah(p.value)
                }
              />
            }
          />
          <Legend
            verticalAlign="top"
            align="right"
            height={28}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: chartColors.muted }}
          />
          <Bar
            yAxisId="unit"
            dataKey="unit"
            name={labelBar}
            fill={chartColors.accent}
            radius={[6, 6, 0, 0]}
            maxBarSize={38}
          />
          <Line
            yAxisId="nilai"
            type="monotone"
            dataKey="nilai"
            name={labelLine}
            stroke={lineColor}
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 0, fill: lineColor }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
