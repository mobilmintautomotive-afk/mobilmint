-- =====================================================================
-- MobilMint — Migration: edit pembelian (update_purchase_funding)
--
-- Sebelum ini, pembelian cuma bisa dibuat sekali, tidak bisa diedit.
-- Fungsi ini dipakai server action `perbaruiPembelian` supaya admin bisa
-- betulkan harga beli, biaya lain, supplier, tanggal, atau alokasi
-- pendananya belakangan.
--
-- Prinsip anti dobel hitung: alokasi LAMA (car_fundings + investor_ledger
-- ALOKASI_MODAL milik pembelian ini) dihapus DULU di awal fungsi supaya
-- saldo investor kembali "bersih", baru validasi saldo & insert alokasi
-- BARU dijalankan. Semua dalam SATU fungsi plpgsql = satu transaksi —
-- kalau ada exception di tengah jalan (mis. saldo investor kurang),
-- SELURUH perubahan (termasuk penghapusan alokasi lama) ikut batal,
-- tidak ada state setengah jadi.
--
-- BEDA dengan allocate_purchase_funding (dipakai saat pembelian baru):
-- fungsi ini SENGAJA tidak mengubah cars.status. Unit yang sudah lanjut
-- ke Perbaikan/Ready Stock/Terbooking tidak boleh mundur ke Dibeli hanya
-- karena datanya diedit.
--
-- Unit yang sudah TERJUAL/SELESAI tidak boleh diedit lagi (HPP-nya sudah
-- terkunci di car_sales.hpp_snapshot saat penjualan).
-- =====================================================================

create or replace function update_purchase_funding(
  p_purchase_id uuid,
  p_supplier_id uuid,
  p_tanggal_beli date,
  p_harga_beli numeric,
  p_biaya_lain numeric,
  p_rincian_biaya_lain jsonb,
  p_catatan text,
  p_allocations jsonb
)
returns void
language plpgsql
as $$
declare
  v_purchase purchases%rowtype;
  v_car_status car_status;
  v_car_label text;
  v_total_modal numeric;
  v_total_alokasi numeric := 0;
  r record;
  v_saldo numeric;
  v_contract investor_contracts%rowtype;
begin
  select * into v_purchase from purchases where id = p_purchase_id;
  if not found then
    raise exception 'Pembelian tidak ditemukan';
  end if;

  select status into v_car_status from cars where id = v_purchase.car_id;
  if v_car_status in ('TERJUAL', 'SELESAI') then
    raise exception 'Unit ini sudah terjual, data pembeliannya tidak bisa diedit lagi.';
  end if;

  select merek || ' ' || tipe || ' ' || tahun into v_car_label from cars where id = v_purchase.car_id;

  v_total_modal := round(p_harga_beli) + round(p_biaya_lain);

  select coalesce(sum((e->>'amount')::numeric), 0) into v_total_alokasi
  from jsonb_array_elements(p_allocations) e;

  if round(v_total_alokasi, 2) <> round(v_total_modal, 2) then
    raise exception 'Total alokasi (%) tidak sama dengan total modal (%)',
      v_total_alokasi, v_total_modal;
  end if;

  -- Balikin dulu alokasi & potongan saldo yang lama sebelum realokasi,
  -- supaya validasi saldo di bawah dihitung dari kondisi "bersih".
  delete from car_fundings where purchase_id = p_purchase_id;
  delete from investor_ledger where ref_table = 'purchases' and ref_id = p_purchase_id;

  update purchases set
    supplier_id = p_supplier_id,
    tanggal_beli = p_tanggal_beli,
    harga_beli = p_harga_beli,
    biaya_lain = p_biaya_lain,
    rincian_biaya_lain = p_rincian_biaya_lain,
    catatan = p_catatan
  where id = p_purchase_id;

  for r in
    select (e->>'investor_id')::uuid as investor_id, (e->>'amount')::numeric as amount
    from jsonb_array_elements(p_allocations) e
  loop
    if r.amount <= 0 then
      continue;
    end if;

    select coalesce(saldo, 0) into v_saldo from v_investor_balance where investor_id = r.investor_id;
    if v_saldo < r.amount then
      raise exception 'Saldo investor % tidak mencukupi (saldo %, dibutuhkan %)',
        r.investor_id, v_saldo, r.amount;
    end if;

    select * into v_contract
    from investor_contracts
    where investor_id = r.investor_id and status = 'AKTIF'
    order by tanggal_akad desc, created_at desc
    limit 1;

    insert into car_fundings (
      car_id, purchase_id, investor_id, contract_id, amount, porsi_pct, nisbah_investor_pct
    ) values (
      v_purchase.car_id,
      p_purchase_id,
      r.investor_id,
      v_contract.id,
      r.amount,
      round(r.amount / nullif(v_total_modal, 0) * 100, 4),
      coalesce(v_contract.nisbah_investor_pct, 0)
    );

    insert into investor_ledger (investor_id, contract_id, tipe, amount, keterangan, ref_table, ref_id, tanggal)
    values (
      r.investor_id,
      v_contract.id,
      'ALOKASI_MODAL',
      -r.amount,
      'Modal dipakai beli ' || coalesce(v_car_label, 'unit') || ' (edit)',
      'purchases',
      p_purchase_id,
      p_tanggal_beli
    );
  end loop;
end;
$$;
