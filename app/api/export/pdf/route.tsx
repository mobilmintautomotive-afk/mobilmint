import { NextResponse, type NextRequest } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { LaporanLabaRugiPDF, LaporanInvestorPDF } from '@/components/pdf/laporan-pdf'
import { getDataDashboard, getLaporanPerUnit } from '@/lib/queries/dashboard'
import { getDashboardInvestor } from '@/lib/queries/investor'
import { getPengaturan } from '@/lib/queries/settings'
import { resolvePeriode } from '@/lib/periode'
import { getCurrentRole, getCurrentInvestorId } from '@/lib/dev-role'
import { hitungSaldoBerjalanServer } from '@/lib/pdf-helper'
import { errorMessage } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Export PDF:
 *   /api/export/pdf?jenis=laba-rugi&periode=tahun-ini
 *   /api/export/pdf?jenis=investor            (pakai investor yang sedang aktif)
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const jenis = sp.get('jenis') ?? 'laba-rugi'

  try {
    const setting = await getPengaturan()
    const kop = {
      nama: setting.data.nama_perusahaan,
      alamat: setting.data.alamat,
      no_tlp: setting.data.no_tlp,
    }

    if (jenis === 'investor') {
      const role = await getCurrentRole()
      const investorId = sp.get('id') ?? (await getCurrentInvestorId())

      // Investor hanya boleh menarik laporannya sendiri
      if (role === 'investor') {
        const milikSendiri = await getCurrentInvestorId()
        if (!milikSendiri || (sp.get('id') && sp.get('id') !== milikSendiri)) {
          return NextResponse.json({ error: 'Anda tidak punya akses ke laporan ini.' }, { status: 403 })
        }
      }

      if (!investorId) {
        return NextResponse.json({ error: 'Investor tidak ditemukan.' }, { status: 400 })
      }

      const { data } = await getDashboardInvestor(investorId)
      const mutasi = hitungSaldoBerjalanServer(data.ledger)

      const buffer = await renderToBuffer(
        <LaporanInvestorPDF
          kop={kop}
          data={{
            nama: data.nama,
            nisbahPct: data.nisbahPct,
            saldo: data.saldo,
            totalInvestasi: data.totalInvestasi,
            totalBagiHasil: data.totalBagiHasil,
            totalPenarikan: data.totalPenarikan,
            modalBerjalan: data.modalBerjalan,
            unitTerjual: data.unitTerjual,
            unitDidanai: data.unitDidanai.map((u) => ({
              unit: u.unit,
              no_polisi: u.no_polisi,
              status: u.status,
              porsi_modal: u.porsi_modal,
              bagi_hasil: u.bagi_hasil,
            })),
            mutasi,
          }}
        />,
      )

      return pdfResponse(buffer, `laporan-${slug(data.nama)}.pdf`)
    }

    // Laporan laba rugi — hanya admin & holding
    const role = await getCurrentRole()
    if (role === 'investor') {
      return NextResponse.json({ error: 'Anda tidak punya akses ke laporan ini.' }, { status: 403 })
    }

    const rentang = resolvePeriode({
      periode: sp.get('periode') ?? undefined,
      from: sp.get('from') ?? undefined,
      to: sp.get('to') ?? undefined,
    })

    const [dash, perUnit] = await Promise.all([
      getDataDashboard(rentang),
      getLaporanPerUnit(rentang),
    ])

    const buffer = await renderToBuffer(
      <LaporanLabaRugiPDF
        kop={kop}
        data={{
          periodeLabel: rentang.label,
          from: rentang.from,
          to: rentang.to,
          labaRugi: dash.data.labaRugi,
          perUnit: perUnit.data.map((u: any) => ({
            unit: u.unit,
            no_polisi: u.no_polisi,
            tanggal_jual: u.tanggal_jual,
            harga_jual: u.harga_jual,
            hpp: u.hpp,
            laba_bersih: u.laba_bersih,
          })),
        }}
      />,
    )

    return pdfResponse(buffer, `laporan-laba-rugi-${rentang.from}-sd-${rentang.to}.pdf`)
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e, 'Gagal membuat PDF.') }, { status: 500 })
  }
}

function pdfResponse(buffer: Buffer, filename: string) {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

function slug(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'investor'
}
