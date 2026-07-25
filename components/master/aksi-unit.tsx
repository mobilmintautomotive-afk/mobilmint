'use client'

import * as React from 'react'
import { CheckCircle2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/shared/confirm-dialog'
import { useAksi } from '@/components/forms/form-dialog'
import { MobilFormDialog } from './mobil-form'
import { tandaiSiapJual } from '@/app/actions/master'
import type { CarOverview } from '@/types/database'

/** Tombol aksi di halaman detail unit. */
export function AksiUnit({ car }: { car: CarOverview }) {
  const [openEdit, setOpenEdit] = React.useState(false)
  const { confirm, dialog } = useConfirm()
  const { jalankan, loading } = useAksi()

  const bisaSiapJual = car.status === 'DIBELI' || car.status === 'PERBAIKAN'

  return (
    <>
      {bisaSiapJual ? (
        <Button
          variant="accent"
          loading={loading}
          onClick={() =>
            confirm({
              title: 'Tandai unit siap jual?',
              description:
                'Status unit akan berubah jadi Ready Stock dan muncul di halaman Stock. Perbaikan yang masih berjalan akan ditandai selesai.',
              confirmLabel: 'Ya, siap jual',
              variant: 'accent',
              successMessage: 'Unit sekarang berstatus Ready Stock',
              onConfirm: async () => {
                const ok = await jalankan(() => tandaiSiapJual(car.id))
                if (!ok) throw new Error('')
              },
            })
          }
        >
          <CheckCircle2 />
          Tandai Siap Jual
        </Button>
      ) : null}

      <Button variant="secondary" onClick={() => setOpenEdit(true)}>
        <Pencil />
        Edit
      </Button>

      <MobilFormDialog open={openEdit} onOpenChange={setOpenEdit} mobil={car} />
      {dialog}
    </>
  )
}
