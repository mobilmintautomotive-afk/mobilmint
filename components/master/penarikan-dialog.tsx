'use client'

import * as React from 'react'
import { ArrowDownToLine } from 'lucide-react'
import { FormDialog, FormGrid } from '@/components/forms/form-dialog'
import { Button } from '@/components/ui/button'
import { Field, Input, MoneyInput, Textarea } from '@/components/ui/input'
import { Money } from '@/components/shared/money'
import { catatPenarikan } from '@/app/actions/master'
import { todayJakarta } from '@/lib/format'

/**
 * Catat penarikan dana investor (PRD 05 bagian 3).
 * Membuat entri ledger PENARIKAN bernilai negatif.
 */
export function PenarikanDialog({
  investorId,
  namaInvestor,
  saldo,
}: {
  investorId: string
  namaInvestor: string
  saldo: number
}) {
  const [open, setOpen] = React.useState(false)
  const [amount, setAmount] = React.useState(0)
  const [tanggal, setTanggal] = React.useState(todayJakarta())
  const [catatan, setCatatan] = React.useState('')

  const melebihi = amount > saldo

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <ArrowDownToLine />
        Catat Penarikan
      </Button>

      <FormDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (v) {
            setAmount(0)
            setTanggal(todayJakarta())
            setCatatan('')
          }
        }}
        title="Catat Penarikan Dana"
        description={`Dana keluar dari saldo ${namaInvestor}. Transfer dilakukan di luar sistem — ini hanya pencatatan.`}
        submitLabel="Simpan Penarikan"
        successMessage="Penarikan berhasil dicatat"
        disabled={melebihi || amount <= 0}
        onSubmit={() =>
          catatPenarikan({
            investor_id: investorId,
            amount,
            tanggal,
            catatan: catatan || `Penarikan dana ${namaInvestor}`,
          })
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-surface-alt p-4">
            <p className="mm-label-caps">Saldo tersedia</p>
            <Money value={saldo} size="lg" className="mt-1 block" />
          </div>

          <FormGrid>
            <Field
              label="Jumlah Penarikan"
              required
              error={melebihi ? 'Jumlah melebihi saldo tersedia' : undefined}
            >
              <MoneyInput value={amount} onChange={setAmount} />
            </Field>
            <Field label="Tanggal" required htmlFor="tgl-tarik">
              <Input
                id="tgl-tarik"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </Field>
          </FormGrid>

          <Field label="Catatan" htmlFor="catatan-tarik">
            <Textarea
              id="catatan-tarik"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Mis. penarikan sebagian atas permintaan investor"
            />
          </Field>
        </div>
      </FormDialog>
    </>
  )
}
