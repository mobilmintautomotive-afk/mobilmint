-- =====================================================================
-- MobilMint — Migration: transfer antar rekening dalam satu transaksi
--
-- Sebelumnya, transfer antar rekening milik sendiri harus dicatat manual
-- dua kali (Transfer Keluar di rekening asal, Transfer Masuk di rekening
-- tujuan) lewat dua submit form terpisah -- gampang lupa salah satu sisi,
-- atau nominalnya beda karena diketik ulang.
--
-- catat_transfer_rekening bikin KEDUA baris cash_ledger dalam satu
-- transaksi, saling terhubung lewat ref_table='transfer_manual' +
-- ref_id yang sama, supaya:
--   1. Tidak mungkin cuma sebelah yang berhasil tercatat.
--   2. Bisa dibatalkan bareng (hapus_transfer_rekening) lewat salah satu
--      sisinya -- tidak mungkin kehapus sebelah doang jadi ga balance.
-- =====================================================================

create or replace function catat_transfer_rekening(
  p_dari_bank_id uuid,
  p_ke_bank_id uuid,
  p_tanggal date,
  p_amount numeric,
  p_keterangan text
)
returns uuid
language plpgsql
as $$
declare
  v_saldo numeric;
  v_ref_id uuid := gen_random_uuid();
  v_dari_nama text;
  v_ke_nama text;
begin
  if p_dari_bank_id = p_ke_bank_id then
    raise exception 'Rekening asal dan tujuan tidak boleh sama';
  end if;

  if p_amount <= 0 then
    raise exception 'Nominal transfer harus lebih dari nol';
  end if;

  select saldo into v_saldo from v_bank_balance where bank_account_id = p_dari_bank_id;
  if coalesce(v_saldo, 0) < p_amount then
    raise exception 'Saldo rekening asal tidak cukup (saldo %, dibutuhkan %)',
      coalesce(v_saldo, 0), p_amount;
  end if;

  select nama into v_dari_nama from bank_accounts where id = p_dari_bank_id;
  select nama into v_ke_nama from bank_accounts where id = p_ke_bank_id;

  insert into cash_ledger (bank_account_id, tanggal, tipe, amount, keterangan, is_auto, ref_table, ref_id)
  values (
    p_dari_bank_id, p_tanggal, 'TRANSFER_KELUAR', -p_amount,
    trim(both ' ' from coalesce(p_keterangan, '') || ' (transfer ke ' || coalesce(v_ke_nama, 'rekening lain') || ')'),
    false, 'transfer_manual', v_ref_id
  );

  insert into cash_ledger (bank_account_id, tanggal, tipe, amount, keterangan, is_auto, ref_table, ref_id)
  values (
    p_ke_bank_id, p_tanggal, 'TRANSFER_MASUK', p_amount,
    trim(both ' ' from coalesce(p_keterangan, '') || ' (transfer dari ' || coalesce(v_dari_nama, 'rekening lain') || ')'),
    false, 'transfer_manual', v_ref_id
  );

  return v_ref_id;
end;
$$;

-- Batalkan transfer: hapus KEDUA baris sekaligus lewat ref_id yang sama.
create or replace function hapus_transfer_rekening(p_ref_id uuid)
returns void
language plpgsql
as $$
begin
  delete from cash_ledger where ref_table = 'transfer_manual' and ref_id = p_ref_id;
end;
$$;
