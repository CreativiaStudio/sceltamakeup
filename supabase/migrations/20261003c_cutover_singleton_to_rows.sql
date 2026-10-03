-- Cutover: copia dal vecchio documento unico (singleton) alle tabelle per-riga.
-- Idempotente: si può rieseguire. Vince sempre il dato con timestamp più recente.
begin;

with src as (
  select key as product_id, value as data,
         case when value->>'_updatedAt' ~ '^\d{4}-\d{2}-\d{2}T' then (value->>'_updatedAt')::timestamptz else null end as ts
  from public.scelta_catalog_overrides s, jsonb_each(s.data->'productOverrides')
  where s.id = 'singleton' and jsonb_typeof(value) = 'object'
)
insert into public.scelta_product_overrides as t (product_id, data, updated_at)
select product_id, data, coalesce(ts, now()) from src
on conflict (product_id) do update
  set data = excluded.data, updated_at = excluded.updated_at
  where coalesce(case when excluded.data->>'_updatedAt' ~ '^\d{4}-\d{2}-\d{2}T' then (excluded.data->>'_updatedAt')::timestamptz end, 'epoch'::timestamptz)
      > coalesce(case when t.data->>'_updatedAt' ~ '^\d{4}-\d{2}-\d{2}T' then (t.data->>'_updatedAt')::timestamptz end, 'epoch'::timestamptz);

with src as (
  select key as variant_id, value as data,
         case when value->>'updatedAt' ~ '^\d{4}-\d{2}-\d{2}T' then (value->>'updatedAt')::timestamptz else null end as ts
  from public.scelta_catalog_overrides s, jsonb_each(s.data->'variantStocks')
  where s.id = 'singleton' and jsonb_typeof(value) = 'object'
)
insert into public.scelta_variant_stocks as t (variant_id, product_id, data, updated_at)
select variant_id, data->>'productId', data || jsonb_build_object('variantId', variant_id), coalesce(ts, now()) from src
on conflict (variant_id) do update
  set data = excluded.data, product_id = coalesce(excluded.product_id, t.product_id), updated_at = excluded.updated_at
  where coalesce(case when excluded.data->>'updatedAt' ~ '^\d{4}-\d{2}-\d{2}T' then (excluded.data->>'updatedAt')::timestamptz end, 'epoch'::timestamptz)
      > coalesce(case when t.data->>'updatedAt' ~ '^\d{4}-\d{2}-\d{2}T' then (t.data->>'updatedAt')::timestamptz end, 'epoch'::timestamptz);

insert into public.scelta_audit_log (id, ts, payload)
select e->>'id',
       case when e->>'timestamp' ~ '^\d{4}-\d{2}-\d{2}T' then (e->>'timestamp')::timestamptz else now() end,
       e
from public.scelta_catalog_overrides s, jsonb_array_elements(s.data->'auditLogs') e
where s.id = 'singleton' and jsonb_typeof(e) = 'object' and coalesce(e->>'id', '') <> ''
on conflict (id) do nothing;

commit;

select (select count(*) from public.scelta_product_overrides) as overrides,
       (select count(*) from public.scelta_variant_stocks) as stocks,
       (select count(*) from public.scelta_audit_log) as audit;
