import {
  BadgePercent,
  Banknote,
  Boxes,
  Car,
  FileBarChart,
  Handshake,
  LayoutDashboard,
  PackageCheck,
  Receipt,
  Scale,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  UserRound,
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

/** Sidebar admin & holding (PRD 04 bagian 2.8). */
export const NAV_BACKOFFICE: NavGroup[] = [
  {
    label: 'Utama',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Master',
    items: [
      { label: 'Mobil', href: '/master/mobil', icon: Car, matchPrefix: true },
      { label: 'Investor', href: '/master/investor', icon: Users, matchPrefix: true },
      { label: 'Golongan Investasi', href: '/master/golongan', icon: BadgePercent },
      { label: 'Customer', href: '/master/customer', icon: UserRound },
      { label: 'Sales', href: '/master/sales', icon: Store },
      { label: 'Supplier', href: '/master/supplier', icon: Truck },
      { label: 'Vendor', href: '/master/vendor', icon: Wrench },
    ],
  },
  {
    label: 'Transaksi',
    items: [
      { label: 'Akad Investor', href: '/transaksi/akad', icon: Handshake },
      { label: 'Pembelian', href: '/transaksi/pembelian', icon: ShoppingCart },
      { label: 'Perbaikan', href: '/transaksi/perbaikan', icon: Wrench },
      { label: 'Stock', href: '/transaksi/stock', icon: PackageCheck },
      { label: 'Penjualan', href: '/transaksi/penjualan', icon: Receipt },
      { label: 'Bagi Hasil', href: '/transaksi/bagi-hasil', icon: Banknote },
      { label: 'Biaya Operasional', href: '/transaksi/biaya', icon: Wallet },
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
