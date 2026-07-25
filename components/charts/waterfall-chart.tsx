'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatRupiah, formatRupiahSingkat } from '@/lib/format'
import type { BarisWaterfall } from '@/lib/calc'
import { ChartTooltip, chartColors } from './chart-shell'

/**
 * Waterfall pakai BarChart: satu bar transparan sebagai penopang
 * (`_base`) + satu bar nilai di atasnya (PRD 04 bagian 2.7).
 * Bar naik hijau, bar turun merah, bar total abu tua.
 */
export function WaterfallChart({ data, height = 320 }: { data: BarisWaterfall[]; height?: number }) {
  let kumulatif = 0
  const rows = data.map((d) => {
    if (d.tipe === 'total') {
      // bar total selalu berdiri dari nol
      kumulatif = d.value
      return { ...d, _base: 0, _span: Math.abs(d.value), _mulai: 0, _akhir: d.value }
    }
    const mulai = kumulatif
    const akhir = kumulatif + d.value
    kumulatif = akhir
    return {
      ...d,
      _base: Math.min(mulai, akhir),
      _span: Math.abs(d.value),
      _mulai: mulai,
      _akhir: akhir,
    }
  })

  const warna = (tipe: BarisWaterfall['tipe'], value: number) => {
    if (tipe === 'total') return chartColors.total
    return value < 0 ? chartColors.danger : chartColors.success
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 24, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke={chartColors.grid} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={0}
            height={56}
            tick={<TickMiring />}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={62}
            tickFormatter={(v) => formatRupiahSingkat(v)}
            tick={{ fontSize: 12, fill: chartColors.muted }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(15,23,42,.04)' }}
            content={
              <ChartTooltip
                formatter={(p: any) => formatRupiah(p.payload?.value ?? 0)}
              />
            }
          />
          <Bar dataKey="_base" stackId="w" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="_span" stackId="w" name="Nilai" radius={[6, 6, 0, 0]} maxBarSize={64}>
            {rows.map((r, i) => (
              <Cell key={i} fill={warna(r.tipe, r.value)} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              offset={8}
              style={{ fontSize: 11, fill: chartColors.total, fontWeight: 500 }}
              formatter={((v: number) => formatRupiahSingkat(v)) as any}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function TickMiring(props: any) {
  const { x, y, payload } = props
  const teks: string = payload?.value ?? ''
  const kata = teks.split(' ')
  const baris: string[] = []
  let buf = ''
  for (const k of kata) {
    if ((buf + ' ' + k).trim().length > 12) {
      baris.push(buf.trim())
      buf = k
    } else {
      buf = `${buf} ${k}`
    }
  }
  if (buf.trim()) baris.push(buf.trim())

  return (
    <g transform={`translate(${x},${y + 10})`}>
      {baris.slice(0, 3).map((b, i) => (
        <text
          key={i}
          x={0}
          y={i * 13}
          textAnchor="middle"
          fontSize={11}
          fill={chartColors.muted}
        >
          {b}
        </text>
      ))}
    </g>
  )
}
