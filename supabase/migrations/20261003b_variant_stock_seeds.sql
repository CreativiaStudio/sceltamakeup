-- Seed per le giacenze nuove: usato SOLO all'inserimento (riga inesistente),
-- mai per sovrascrivere dati già presenti. Evita righe incomplete.
drop function if exists public.scelta_patch_variant_stocks(jsonb);

create or replace function public.scelta_patch_variant_stocks(p_items jsonb, p_seeds jsonb default null)
returns jsonb
language plpgsql
as $$
declare
  k text;
  v jsonb;
  seed jsonb;
  out_rows jsonb := '{}'::jsonb;
  row_data jsonb;
  ts text := to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if p_items is null or jsonb_typeof(p_items) <> 'object' then
    return out_rows;
  end if;
  for k, v in select key, value from jsonb_each(p_items) loop
    seed := case when p_seeds is not null and jsonb_typeof(p_seeds -> k) = 'object' then p_seeds -> k else '{}'::jsonb end;
    insert into public.scelta_variant_stocks as s (variant_id, product_id, data, updated_at)
    values (
      k,
      coalesce(v->>'productId', seed->>'productId'),
      (seed || v || jsonb_build_object('variantId', k, 'updatedAt', ts)),
      now()
    )
    on conflict (variant_id) do update
      set data = s.data || (v || jsonb_build_object('variantId', k, 'updatedAt', ts)),
          product_id = coalesce(v->>'productId', s.product_id),
          updated_at = now()
    returning data into row_data;
    out_rows := out_rows || jsonb_build_object(k, row_data);
  end loop;
  return out_rows;
end;
$$;

revoke all on function public.scelta_patch_variant_stocks(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.scelta_patch_variant_stocks(jsonb, jsonb) to service_role;
