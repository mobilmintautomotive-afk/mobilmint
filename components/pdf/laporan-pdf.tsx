import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import { formatRupiah, formatTanggal, formatTanggalPanjang, formatPersen } from '@/lib/format'

const warna = {
  ink: '#0f172a',
  muted: '#64748b',
  subtle: '#94a3b8',
  line: '#e5e7eb',
  alt: '#f8fafc',
  accent: '#006ead',
  success: '#16a34a',
  danger: '#dc2626',
}

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9, color: warna.ink, fontFamily: 'Helvetica' },
  kop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: warna.ink,
    paddingBottom: 10,
    marginBottom: 16,
  },
  brand: { fontSize: 18, fontFamily: 'Helvetica-BoldOblique', color: warna.accent },
  perusahaan: { fontSize: 9, color: warna.muted, marginTop: 2 },
  judul: { fontSize: 13, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  periode: { fontSize: 9, color: warna.muted, textAlign: 'right', marginTop: 2 },

  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: warna.muted,
  },

  kartuRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  kartu: { flex: 1, backgroundColor: warna.alt, padding: 8, borderRadius: 4 },
  kartuLabel: { fontSize: 7, color: warna.subtle, textTransform: 'uppercase', letterSpacing: 0.5 },
  kartuNilai: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 3 },

  baris: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: warna.line,
  },
  barisTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: warna.ink,
    marginTop: 2,
  },
  labelSub: { color: warna.muted, paddingLeft: 10 },
  tebal: { fontFamily: 'Helvetica-Bold' },

  tHead: {
    flexDirection: 'row',
    backgroundColor: warna.alt,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: warna.line,
  },
  th: { fontSize: 7, color: warna.subtle, textTransform: 'uppercase', letterSpacing: 0.4 },
  td: { fontSize: 8 },
  kanan: { textAlign: 'right' },

  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: warna.subtle,
    borderTopWidth: 0.5,
    borderTopColor: warna.line,
    paddingTop: 6,
  },
})

export type KopPerusahaan = {
  nama: string
  alamat?: string | null
  no_tlp?: string | null
}

/* ------------------------- Laporan Laba Rugi ------------------------- */

export type DataLaporanPDF = {
  periodeLabel: string
  from: string
  to: string
  labaRugi: {
    pendapatan: number
    hppPembelian: number
    biayaPerbaikan: number
    komisiSales: number
    biayaPenjualanLain: number
    biayaOperasional: number
    labaBersih: number
    bagiHasilInvestor: number
    labaPengelola: number
  }
  perUnit: {
    unit: string
    no_polisi: string | null
    tanggal_jual: string
    harga_jual: number
    hpp: number
    laba_bersih: number
  }[]
}

export function LaporanLabaRugiPDF({
  kop,
  data,
}: {
  kop: KopPerusahaan
  data: DataLaporanPDF
}) {
  const lr = data.labaRugi
  const labaKotor = lr.pendapatan - lr.hppPembelian - lr.biayaPerbaikan

  return (
    <Document title={`Laporan Laba Rugi — ${data.periodeLabel}`} author={kop.nama}>
      <Page size="A4" style={s.page}>
        <View style={s.kop}>
          <View>
            <Text style={s.brand}>MobilMint</Text>
            <Text style={s.perusahaan}>{kop.nama}</Text>
            {kop.alamat ? <Text style={s.perusahaan}>{kop.alamat}</Text> : null}
            {kop.no_tlp ? <Text style={s.perusahaan}>Telp. {kop.no_tlp}</Text> : null}
          </View>
          <View>
            <Text style={s.judul}>LAPORAN LABA RUGI</Text>
            <Text style={s.periode}>{data.periodeLabel}</Text>
            <Text style={s.periode}>
              {formatTanggal(data.from)} – {formatTanggal(data.to)}
            </Text>
          </View>
        </View>

        <View style={s.kartuRow}>
          <View style={s.kartu}>
            <Text style={s.kartuLabel}>Pendapatan</Text>
            <Text style={s.kartuNilai}>{formatRupiah(lr.pendapatan)}</Text>
          </View>
          <View style={s.kartu}>
            <Text style={s.kartuLabel}>Laba Bersih</Text>
            <Text style={[s.kartuNilai, { color: lr.labaBersih < 0 ? warna.danger : warna.success }]}>
              {formatRupiah(lr.labaBersih)}
            </Text>
          </View>
          <View style={s.kartu}>
            <Text style={s.kartuLabel}>Bagi Hasil Investor</Text>
            <Text style={s.kartuNilai}>{formatRupiah(lr.bagiHasilInvestor)}</Text>
          </View>
          <View style={s.kartu}>
            <Text style={s.kartuLabel}>Laba Pengelola</Text>
            <Text style={s.kartuNilai}>{formatRupiah(lr.labaPengelola)}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Ringkasan</Text>

          <View style={s.baris}>
            <Text>Pendapatan Penjualan</Text>
            <Text>{formatRupiah(lr.pendapatan)}</Text>
          </View>
          <View style={s.baris}>
            <Text style={s.labelSub}>Harga Pokok Pembelian</Text>
            <Text>-{formatRupiah(lr.hppPembelian)}</Text>
          </View>
          <View style={s.baris}>
            <Text style={s.labelSub}>Biaya Perbaikan</Text>
            <Text>-{formatRupiah(lr.biayaPerbaikan)}</Text>
          </View>
          <View style={s.baris}>
            <Text style={s.tebal}>Laba Kotor</Text>
            <Text style={s.tebal}>{formatRupiah(labaKotor)}</Text>
          </View>
          <View style={s.baris}>
            <Text style={s.labelSub}>Komisi Sales</Text>
            <Text>-{formatRupiah(lr.komisiSales)}</Text>
          </View>
          <View style={s.baris}>
            <Text style={s.labelSub}>Biaya Penjualan Lain</Text>
            <Text>-{formatRupiah(lr.biayaPenjualanLain)}</Text>
          </View>
          <View style={s.baris}>
            <Text style={s.labelSub}>Biaya Operasional</Text>
            <Text>-{formatRupiah(lr.biayaOperasional)}</Text>
          </View>
          <View style={s.barisTotal}>
            <Text style={s.tebal}>Laba Bersih</Text>
            <Text style={s.tebal}>{formatRupiah(lr.labaBersih)}</Text>
          </View>
          <View style={s.baris}>
            <Text style={s.labelSub}>Bagi Hasil Investor</Text>
            <Text>-{formatRupiah(lr.bagiHasilInvestor)}</Text>
          </View>
          <View style={s.barisTotal}>
            <Text style={s.tebal}>Laba Bersih Pengelola</Text>
            <Text style={s.tebal}>{formatRupiah(lr.labaPengelola)}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Rincian per Unit</Text>
          <View style={s.tHead}>
            <Text style={[s.th, { flex: 3 }]}>Unit</Text>
            <Text style={[s.th, { flex: 1.4 }]}>Tanggal Jual</Text>
            <Text style={[s.th, { flex: 1.6 }, s.kanan]}>Harga Jual</Text>
            <Text style={[s.th, { flex: 1.6 }, s.kanan]}>HPP</Text>
            <Text style={[s.th, { flex: 1.6 }, s.kanan]}>Laba Bersih</Text>
          </View>
          {data.perUnit.length === 0 ? (
            <View style={s.tRow}>
              <Text style={[s.td, { color: warna.muted }]}>
                Tidak ada penjualan pada periode ini.
              </Text>
            </View>
          ) : (
            data.perUnit.map((u, i) => (
              <View key={i} style={s.tRow}>
                <Text style={[s.td, { flex: 3 }]}>
                  {u.unit}
                  {u.no_polisi ? ` (${u.no_polisi})` : ''}
                </Text>
                <Text style={[s.td, { flex: 1.4 }]}>{formatTanggal(u.tanggal_jual)}</Text>
                <Text style={[s.td, { flex: 1.6 }, s.kanan]}>{formatRupiah(u.harga_jual)}</Text>
                <Text style={[s.td, { flex: 1.6 }, s.kanan]}>{formatRupiah(u.hpp)}</Text>
                <Text
                  style={[
                    s.td,
                    { flex: 1.6, color: u.laba_bersih < 0 ? warna.danger : warna.success },
                    s.kanan,
                  ]}
                >
                  {formatRupiah(u.laba_bersih)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={s.footer} fixed>
          <Text>Dicetak {formatTanggalPanjang(new Date())} — {kop.nama}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}

/* -------------------------- Laporan Investor -------------------------- */

export type DataLaporanInvestorPDF = {
  nama: string
  nisbahPct: number | null
  saldo: number
  totalInvestasi: number
  totalBagiHasil: number
  totalPenarikan: number
  modalBerjalan: number
  unitTerjual: number
  unitDidanai: {
    unit: string
    no_polisi: string | null
    status: string
    porsi_modal: number
    bagi_hasil: number | null
  }[]
  mutasi: { tanggal: string; keterangan: string; amount: number; saldo: number }[]
}

export function LaporanInvestorPDF({
  kop,
  data,
}: {
  kop: KopPerusahaan
  data: DataLaporanInvestorPDF
}) {
  return (
    <Document title={`Laporan Investor — ${data.nama}`} author={kop.nama}>
      <Page size="A4" style={s.page}>
        <View style={s.kop}>
          <View>
            <Text style={s.brand}>MobilMint</Text>
            <Text style={s.perusahaan}>{kop.nama}</Text>
            {kop.alamat ? <Text style={s.perusahaan}>{kop.alamat}</Text> : null}
          </View>
          <View>
            <Text style={s.judul}>LAPORAN INVESTOR</Text>
            <Text style={s.periode}>{data.nama}</Text>
            {data.nisbahPct !== null ? (
              <Text style={s.periode}>Porsi bagi hasil {formatPersen(data.nisbahPct)}</Text>
            ) : null}
          </View>
        </View>

        <View style={s.kartuRow}>
          <View style={s.kartu}>
            <Text style={s.kartuLabel}>Saldo Anda</Text>
            <Text style={s.kartuNilai}>{formatRupiah(data.saldo)}</Text>
          </View>
          <View style={s.kartu}>
            <Text style={s.kartuLabel}>Modal Awal</Text>
            <Text style={s.kartuNilai}>{formatRupiah(data.totalInvestasi)}</Text>
          </View>
          <View style={s.kartu}>
            <Text style={s.kartuLabel}>Bagi Hasil Diterima</Text>
            <Text style={[s.kartuNilai, { color: warna.success }]}>
              {formatRupiah(data.totalBagiHasil)}
            </Text>
          </View>
          <View style={s.kartu}>
            <Text style={s.kartuLabel}>Modal Berjalan</Text>
            <Text style={s.kartuNilai}>{formatRupiah(data.modalBerjalan)}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Mobil yang Anda Danai</Text>
          <View style={s.tHead}>
            <Text style={[s.th, { flex: 3 }]}>Unit</Text>
            <Text style={[s.th, { flex: 1.3 }]}>Status</Text>
            <Text style={[s.th, { flex: 1.8 }, s.kanan]}>Porsi Modal</Text>
            <Text style={[s.th, { flex: 1.8 }, s.kanan]}>Bagi Hasil</Text>
          </View>
          {data.unitDidanai.length === 0 ? (
            <View style={s.tRow}>
              <Text style={[s.td, { color: warna.muted }]}>
                Dana Anda belum dipakai untuk membeli mobil.
              </Text>
            </View>
          ) : (
            data.unitDidanai.map((u, i) => (
              <View key={i} style={s.tRow}>
                <Text style={[s.td, { flex: 3 }]}>
                  {u.unit}
                  {u.no_polisi ? ` (${u.no_polisi})` : ''}
                </Text>
                <Text style={[s.td, { flex: 1.3 }]}>{u.status.replace('_', ' ')}</Text>
                <Text style={[s.td, { flex: 1.8 }, s.kanan]}>{formatRupiah(u.porsi_modal)}</Text>
                <Text style={[s.td, { flex: 1.8 }, s.kanan]}>
                  {u.bagi_hasil === null ? 'Belum cair' : formatRupiah(u.bagi_hasil)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Mutasi Saldo</Text>
          <View style={s.tHead}>
            <Text style={[s.th, { flex: 1.3 }]}>Tanggal</Text>
            <Text style={[s.th, { flex: 4 }]}>Keterangan</Text>
            <Text style={[s.th, { flex: 1.8 }, s.kanan]}>Masuk / Keluar</Text>
            <Text style={[s.th, { flex: 1.8 }, s.kanan]}>Saldo</Text>
          </View>
          {data.mutasi.map((m, i) => (
            <View key={i} style={s.tRow} wrap={false}>
              <Text style={[s.td, { flex: 1.3 }]}>{formatTanggal(m.tanggal)}</Text>
              <Text style={[s.td, { flex: 4 }]}>{m.keterangan}</Text>
              <Text
                style={[
                  s.td,
                  { flex: 1.8, color: m.amount < 0 ? warna.danger : warna.success },
                  s.kanan,
                ]}
              >
                {formatRupiah(m.amount)}
              </Text>
              <Text style={[s.td, { flex: 1.8 }, s.kanan]}>{formatRupiah(m.saldo)}</Text>
            </View>
          ))}
        </View>

        <View style={s.footer} fixed>
          <Text>Dicetak {formatTanggalPanjang(new Date())} — {kop.nama}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
