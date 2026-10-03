-- ==============================================================================
-- Scelta Makeup — Catalogo row-level (fine dei "salvataggi fantasma")
-- File: supabase/migrations/20261003_row_level_catalog.sql
--
-- Prima: tutto il catalogo in UNA riga JSONB (scelta_catalog_overrides.singleton)
-- riscritta per intero a ogni salvataggio da più istanze Vercel → lost update.
-- Ora: una riga per prodotto, una per variante, scatola nera append-only.
-- Ogni scrittura è un merge atomico sulla sola riga interessata (row lock).
-- La vecchia tabella singleton resta intatta come archivio di sola lettura.
-- ==============================================================================

create table if not exists public.scelta_product_overrides (
  product_id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.scelta_variant_stocks (
  variant_id text primary key,
  product_id text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists scelta_variant_stocks_product_idx on public.scelta_variant_stocks (product_id);

create table if not exists public.scelta_audit_log (
  id text primary key,
  ts timestamptz not null,
  payload jsonb not null,
  inserted_at timestamptz not null default now()
);
create index if not exists scelta_audit_log_ts_idx on public.scelta_audit_log (ts desc);

alter table public.scelta_product_overrides enable row level security;
alter table public.scelta_variant_stocks enable row level security;
alter table public.scelta_audit_log enable row level security;

-- ------------------------------------------------------------------------------
-- Merge varianti per id.
--  replace_mode = false: mantiene ordine e varianti esistenti, fonde i campi
--                        delle varianti presenti nella patch, aggiunge le nuove.
--  replace_mode = true : l'elenco (ordine e appartenenza) è quello della patch
--                        (serve quando si elimina una variante dall'editor),
--                        ma i campi non inviati restano quelli esistenti.
-- ------------------------------------------------------------------------------
create or replace function public.scelta_merge_variants(base jsonb, patch jsonb, replace_mode boolean)
returns jsonb
language plpgsql
immutable
as $$
declare
  result jsonb := '[]'::jsonb;
  pv jsonb;
  bv jsonb;
begin
  if patch is null or jsonb_typeof(patch) <> 'array' then
    return base;
  end if;
  if base is null or jsonb_typeof(base) <> 'array' then
    base := '[]'::jsonb;
  end if;

  if replace_mode then
    for pv in select value from jsonb_array_elements(patch) loop
      bv := null;
      select e.value into bv from jsonb_array_elements(base) e where e.value->>'id' = pv->>'id' limit 1;
      result := result || jsonb_build_array(coalesce(bv, '{}'::jsonb) || pv);
    end loop;
    return result;
  end if;

  for bv in select value from jsonb_array_elements(base) loop
    pv := null;
    select e.value into pv from jsonb_array_elements(patch) e where e.value->>'id' = bv->>'id' limit 1;
    result := result || jsonb_build_array(case when pv is null then bv else bv || pv end);
  end loop;

  for pv in select value from jsonb_array_elements(patch) loop
    if not exists (select 1 from jsonb_array_elements(base) e where e.value->>'id' = pv->>'id') then
      result := result || jsonb_build_array(pv);
    end if;
  end loop;

  return result;
end;
$$;

-- ------------------------------------------------------------------------------
-- Patch atomica di un override prodotto (solo i campi inviati).
-- p_base_variants: varianti del catalogo base, usate come punto di partenza se
-- l'override non ha ancora un proprio elenco varianti.
-- ------------------------------------------------------------------------------
create or replace function public.scelta_patch_product_override(
  p_product_id text,
  p_patch jsonb,
  p_base_variants jsonb default null,
  p_replace_variants boolean default false
)
returns jsonb
language plpgsql
as $$
declare
  cur jsonb;
  merged jsonb;
  vpatch jsonb;
  ts text := to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  insert into public.scelta_product_overrides (product_id, data)
  values (p_product_id, '{}'::jsonb)
  on conflict (product_id) do nothing;

  select data into cur from public.scelta_product_overrides
  where product_id = p_product_id
  for update;

  vpatch := p_patch -> 'variants';
  merged := coalesce(cur, '{}'::jsonb) || (coalesce(p_patch, '{}'::jsonb) - 'variants' - '_updatedAt');

  if vpatch is not null and jsonb_typeof(vpatch) = 'array' then
    merged := jsonb_set(
      merged,
      '{variants}',
      public.scelta_merge_variants(coalesce(cur -> 'variants', p_base_variants, '[]'::jsonb), vpatch, coalesce(p_replace_variants, false))
    );
  end if;

  merged := jsonb_set(merged, '{_updatedAt}', to_jsonb(ts));

  update public.scelta_product_overrides
  set data = merged, updated_at = now()
  where product_id = p_product_id;

  return merged;
end;
$$;

-- ------------------------------------------------------------------------------
-- Patch atomica delle giacenze: p_items = { variantId: { campi da aggiornare } }
-- ------------------------------------------------------------------------------
create or replace function public.scelta_patch_variant_stocks(p_items jsonb)
returns jsonb
language plpgsql
as $$
declare
  k text;
  v jsonb;
  out_rows jsonb := '{}'::jsonb;
  row_data jsonb;
  ts text := to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if p_items is null or jsonb_typeof(p_items) <> 'object' then
    return out_rows;
  end if;
  for k, v in select key, value from jsonb_each(p_items) loop
    insert into public.scelta_variant_stocks as s (variant_id, product_id, data, updated_at)
    values (k, v->>'productId', (v || jsonb_build_object('variantId', k, 'updatedAt', ts)), now())
    on conflict (variant_id) do update
      set data = s.data || excluded.data,
          product_id = coalesce(excluded.product_id, s.product_id),
          updated_at = now()
    returning data into row_data;
    out_rows := out_rows || jsonb_build_object(k, row_data);
  end loop;
  return out_rows;
end;
$$;

-- ------------------------------------------------------------------------------
-- Rettifica atomica della quantità (delta oppure valore assoluto).
-- p_seed: record completo usato solo se la giacenza non esiste ancora.
-- ------------------------------------------------------------------------------
create or replace function public.scelta_adjust_variant_stock(
  p_variant_id text,
  p_delta integer default null,
  p_new_quantity integer default null,
  p_seed jsonb default null
)
returns jsonb
language plpgsql
as $$
declare
  cur jsonb;
  qty integer;
  status text;
  ts text := to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  insert into public.scelta_variant_stocks (variant_id, product_id, data)
  values (p_variant_id, p_seed->>'productId', coalesce(p_seed, '{}'::jsonb) || jsonb_build_object('variantId', p_variant_id))
  on conflict (variant_id) do nothing;

  select data into cur from public.scelta_variant_stocks where variant_id = p_variant_id for update;

  if p_new_quantity is not null then
    qty := greatest(0, p_new_quantity);
  else
    qty := greatest(0, coalesce((cur->>'stockQuantity')::numeric::integer, 0) + coalesce(p_delta, 0));
  end if;
  status := case when qty <= 0 then 'out_of_stock' when qty < 5 then 'low_stock' else 'available' end;

  cur := cur || jsonb_build_object('stockQuantity', qty, 'stockStatus', status, 'updatedAt', ts);
  update public.scelta_variant_stocks set data = cur, updated_at = now() where variant_id = p_variant_id;
  return cur;
end;
$$;

revoke all on function public.scelta_patch_product_override(text, jsonb, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.scelta_patch_variant_stocks(jsonb) from public, anon, authenticated;
revoke all on function public.scelta_adjust_variant_stock(text, integer, integer, jsonb) from public, anon, authenticated;
grant execute on function public.scelta_patch_product_override(text, jsonb, jsonb, boolean) to service_role;
grant execute on function public.scelta_patch_variant_stocks(jsonb) to service_role;
grant execute on function public.scelta_adjust_variant_stock(text, integer, integer, jsonb) to service_role;

notify pgrst, 'reload schema';
