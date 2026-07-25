import { cn } from '@/lib/utils'
import {
  CAR_STATUS_LABEL,
  CONTRACT_STATUS_LABEL,
  REPAIR_STATUS_LABEL,
  USER_ROLE_LABEL,
  type CarStatus,
  type ContractStatus,
  type RepairStatus,
  type UserRole,
} from '@/lib/constants'

const base =
  'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium leading-none'

/** Warna badge sesuai tabel PRD 04 bagian 2.3. */
const STYLE: Record<string, string> = {
  DIBELI: 'bg-neutral-soft text-ink-muted',
  PERBAIKAN: 'bg-warning-soft text-warning-deep',
  READY_STOCK: 'bg-accent-soft text-accent',
  TERJUAL: 'bg-success-soft text-success',
  SELESAI: 'bg-success-deepsoft text-success-deep',
  MENUNGGU_DANA: 'bg-warning-soft text-warning-deep',
  AKTIF: 'bg-success-soft text-success',
  BATAL: 'bg-danger-soft text-danger',
  PROSES: 'bg-warning-soft text-warning-deep',
  admin: 'bg-accent-soft text-accent',
  holding: 'bg-neutral-soft text-ink-muted',
  investor: 'bg-success-soft text-success',
}

export function StatusBadge({
  status,
  className,
}: {
  status: CarStatus | ContractStatus | RepairStatus | string
  className?: string
}) {
  const label =
    CAR_STATUS_LABEL[status as CarStatus] ??
    CONTRACT_STATUS_LABEL[status as ContractStatus] ??
    REPAIR_STATUS_LABEL[status as RepairStatus] ??
    status
  return <span className={cn(base, STYLE[status] ?? STYLE.DIBELI, className)}>{label}</span>
}

export function RoleBadge({ role }: { role: UserRole }) {
  return <span className={cn(base, STYLE[role])}>{USER_ROLE_LABEL[role]}</span>
}

export function AktifBadge({ active }: { active: boolean }) {
  return (
    <span className={cn(base, active ? STYLE.AKTIF : 'bg-neutral-soft text-ink-muted')}>
      {active ? 'Aktif' : 'Nonaktif'}
    </span>
  )
}

export function BagiHasilBadge({ sudah }: { sudah: boolean }) {
  return (
    <span className={cn(base, sudah ? STYLE.SELESAI : 'bg-warning-soft text-warning-deep')}>
      {sudah ? 'Sudah' : 'Belum'}
    </span>
  )
}
