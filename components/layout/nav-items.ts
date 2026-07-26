import {
  BadgePercent,
  Banknote,
  Boxes,
  Car,
  FileBarChart,
  Handshake,
  Landmark,
  LayoutDashboard,
  PackageCheck,
  Receipt,
  ReceiptText,
  Scale,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  UserRound,
  UserRoundCheck,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { UserRole } from '@/lib/constants'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  /** cocokkan juga sub-path, mis. /master/mobil/[id] */
  matchPrefix?: boolean
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

/**
 * Sidebar admin & holding.
 *
 * Dikelompokkan per domain bisnis, BUKAN per jenis data (Master vs
 * Transaksi). Alasannya satu pekerjaan biasanya butuh masternya sekaligus
 * transaksinya — mis. mengurus penjualan perlu Customer, Salesman, dan
 * Penjualan — jadi mengelompokkan begini bikin langkah kerjanya berdekatan
 * daripada tersebar di dua grup besar.
 */
export const NAV_BACKOFFICE: NavGroup[] = [
  {
    label: 'Utama',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Investasi',
    items: [
      { label: 'Investor', href: '/master/investor', icon: Users, matchPrefix: true },
      { label: 'Golongan Investasi', href: '/master/golongan', icon: BadgePercent },
      { label: 'Akad Investor', href: '/transaksi/akad', icon: Handshake },
    ],
  },
  {
    label: 'Stock Unit',
    items: [
      { label: 'Mobil', href: '/master/mobil', icon: Car, matchPrefix: true },
      { label: 'Stock', href: '/transaksi/stock', icon: PackageCheck },
    ],
  },
  {
    label: 'Penjualan',
    items: [
      { label: 'Customer', href: '/master/customer', icon: UserRound },
      { label: 'Salesman', href: '/master/sales', icon: UserRoundCheck },
      { label: 'Penjualan', href: '/transaksi/penjualan', icon: Receipt },
    ],
  },
  {
    label: 'Pembelian',
    items: [
      { label: 'Supplier', href: '/master/supplier', icon: Truck },
      { label: 'Pembelian', href: '/transaksi/pembelian', icon: ShoppingCart },
    ],
  },
  {
    label: 'Perbaikan',
    items: [
      { label: 'Vendor', href: '/master/vendor', icon: Store },
      { label: 'Perbaikan', href: '/transaksi/perbaikan', icon: Wrench },
    ],
  },
  {
    label: 'Kas & Bank',
    items: [
      { label: 'Akun Bank', href: '/master/bank', icon: Landmark },
      { label: 'Kas & Bank', href: '/transaksi/kas', icon: Wallet },
      { label: 'Pencairan Dana', href: '/transaksi/pencairan', icon: Banknote },
    ],
  },
  {
    label: 'Operasional',
    items: [
      { label: 'Biaya Operasional', href: '/transaksi/biaya', icon: ReceiptText },
      { label: 'Aset Perusahaan', href: '/transaksi/aset', icon: Boxes },
    ],
  },
  {
    label: 'Laporan',
    items: [
      { label: 'Laba Rugi', href: '/laporan/laba-rugi', icon: FileBarChart },
      { label: 'Neraca', href: '/laporan/neraca', icon: Scale },
    ],
  },
  {
    label: 'Pengaturan',
    items: [
      { label: 'Kelola Akses', href: '/admin/users', icon: ShieldCheck },
      { label: 'Pengaturan', href: '/admin/pengaturan', icon: Settings },
    ],
  },
]

/** Sidebar investor — sengaja hanya 3 menu. */
export const NAV_INVESTOR: NavGroup[] = [
  {
    label: 'Menu',
    items: [
      { label: 'Dashboard Saya', href: '/investor', icon: LayoutDashboard },
      { label: 'Unit Saya', href: '/investor/unit', icon: Car },
      { label: 'Mutasi Saldo', href: '/investor/mutasi', icon: Wallet },
    ],
  },
]

export function navUntukRole(role: UserRole): NavGroup[] {
  if (role === 'investor') return NAV_INVESTOR

  if (role === 'holding') {
    // Holding tidak punya akses Kelola Akses (PRD 04 bagian 5.4)
    return NAV_BACKOFFICE.filter((g) => g.label !== 'Pengaturan')
  }

  return NAV_BACKOFFICE
}
