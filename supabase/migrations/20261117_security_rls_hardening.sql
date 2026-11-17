-- ==============================================================================
-- Scelta Makeup — Hardening RLS & privilegi
-- File: supabase/migrations/20261117_security_rls_hardening.sql
--
-- Idempotente: rieseguibile con 1-click nel Supabase SQL Editor.
--
-- Cosa fa:
--   1. Tabelle server-only (scelta_admin_orders, scelta_heartbeat,
--      scelta_catalog_overrides_backup_20261003):
--      RLS attivo, policy residue rimosse e revoca totale dei privilegi ad
--      anon / authenticated. Resta il solo service_role, usato dalle API
--      server-side (lib/serverOrderStore.ts, app/api/cron/keepalive).
--      `ALTER TABLE IF EXISTS` non fallisce se la tabella non esiste ancora;
--      i REVOKE sono protetti da to_regclass per lo stesso motivo.
--
--   2. Tabelle dello schema core (supabase_schema.sql): rimozione delle
--      policy "FOR ALL TO authenticated, service_role" che davano scrittura
--      piena. L'accesso anon / authenticated resta in sola lettura (SELECT)
--      su scelta_products, scelta_variants, scelta_blocked_slots.
--
-- Perimetro finale per anon / authenticated: SELECT su prodotti, varianti e
-- slot bloccati. Nessuna scrittura su nessuna tabella scelta_*. Tutte le
-- scritture dell'app passano dalle API server-side con
-- SUPABASE_SERVICE_ROLE_KEY (che ignora la RLS): checkout, CRM, magazzino,
-- catalogo e appuntamenti restano invariati.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELLE SERVER-ONLY: RLS ATTIVO + SOLO service_role
-- ------------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.scelta_admin_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.scelta_heartbeat ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.scelta_catalog_overrides_backup_20261003 ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t TEXT;
    r RECORD;
    server_only_tables TEXT[] := ARRAY[
        'scelta_admin_orders',
        'scelta_heartbeat',
        'scelta_catalog_overrides_backup_20261003'
    ];
BEGIN
    FOREACH t IN ARRAY server_only_tables LOOP
        IF to_regclass(format('public.%I', t)) IS NULL THEN
            RAISE NOTICE 'Tabella public.% assente: revoca privilegi saltata', t;
            CONTINUE;
        END IF;

        -- Revoca totale ad anon / authenticated: nessun privilegio residuo
        -- (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER).
        EXECUTE format(
            'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated',
            t
        );

        -- Il solo service_role conserva l'accesso pieno (ha BYPASSRLS).
        EXECUTE format(
            'GRANT ALL PRIVILEGES ON TABLE public.%I TO service_role',
            t
        );

        -- Rimuove le eventuali policy già esistenti: senza GRANT non sarebbero
        -- comunque raggiungibili, ma restano un rischio se in futuro qualcuno
        -- ri-concedesse i privilegi al ruolo.
        FOR r IN
            SELECT p.polname
            FROM pg_policy p
            JOIN pg_class c ON c.oid = p.polrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relname = t
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.polname, t);
        END LOOP;
    END LOOP;
END
$$;

-- ------------------------------------------------------------------------------
-- 2. SCHEMA CORE: RIMOZIONE DELLE POLICY "FOR ALL"
--
-- Tutte le 11 tabelle di supabase_schema.sql avevano una policy
-- "Staff full access on <tabella>" FOR ALL TO authenticated, service_role
-- USING (true) WITH CHECK (true): scrittura totale per il ruolo authenticated.
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Staff full access on scelta_customers" ON public.scelta_customers;
DROP POLICY IF EXISTS "Staff full access on scelta_products" ON public.scelta_products;
DROP POLICY IF EXISTS "Staff full access on scelta_variants" ON public.scelta_variants;
DROP POLICY IF EXISTS "Staff full access on scelta_inventory" ON public.scelta_inventory;
DROP POLICY IF EXISTS "Staff full access on scelta_inventory_logs" ON public.scelta_inventory_logs;
DROP POLICY IF EXISTS "Staff full access on scelta_orders" ON public.scelta_orders;
DROP POLICY IF EXISTS "Staff full access on scelta_order_items" ON public.scelta_order_items;
DROP POLICY IF EXISTS "Staff full access on scelta_appointments" ON public.scelta_appointments;
DROP POLICY IF EXISTS "Staff full access on scelta_blocked_slots" ON public.scelta_blocked_slots;
DROP POLICY IF EXISTS "Staff full access on scelta_notification_logs" ON public.scelta_notification_logs;
DROP POLICY IF EXISTS "Staff full access on scelta_catalog_overrides" ON public.scelta_catalog_overrides;

-- Rete di sicurezza: elimina qualsiasi altra policy FOR ALL rimasta attiva
-- sulle stesse 11 tabelle per authenticated / service_role / PUBLIC, anche se
-- rinominata in passato. Copre solo polcmd = 'a' (ALL): le policy SELECT, INSERT
-- o DELETE con altri nomi restano intatte.
DO $$
DECLARE
    r RECORD;
    auth_oid OID := COALESCE((SELECT oid FROM pg_roles WHERE rolname = 'authenticated'), 0);
    svc_oid  OID := COALESCE((SELECT oid FROM pg_roles WHERE rolname = 'service_role'), 0);
    core_tables TEXT[] := ARRAY[
        'scelta_customers',
        'scelta_products',
        'scelta_variants',
        'scelta_inventory',
        'scelta_inventory_logs',
        'scelta_orders',
        'scelta_order_items',
        'scelta_appointments',
        'scelta_blocked_slots',
        'scelta_notification_logs',
        'scelta_catalog_overrides'
    ];
BEGIN
    FOR r IN
        SELECT c.relname AS tbl, p.polname AS pol
        FROM pg_policy p
        JOIN pg_class c ON c.oid = p.polrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = ANY (core_tables)
          AND p.polcmd = 'a'
          AND p.polroles && ARRAY[0::oid, auth_oid, svc_oid]
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.pol, r.tbl);
    END LOOP;
END
$$;

-- ------------------------------------------------------------------------------
-- 3. PERIMETRO anon / authenticated: SOLA LETTURA SUL CATALOGO
--
-- Le policy di INSERT pubblico del checkout ("Public can insert ...") sono
-- rimosse: le scritture passano già dalle API server-side con service_role,
-- quindi il negozio non cambia comportamento mentre sparisce la possibilità
-- di inserire ordini/clienti/appuntamenti direttamente via REST con la chiave
-- pubblica.
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public can insert customer on checkout" ON public.scelta_customers;
DROP POLICY IF EXISTS "Public can insert scelta_orders" ON public.scelta_orders;
DROP POLICY IF EXISTS "Public can insert scelta_order_items" ON public.scelta_order_items;
DROP POLICY IF EXISTS "Public can insert scelta_appointments" ON public.scelta_appointments;

-- Le tre letture pubbliche vengono ricreate in modo idempotente per garantire
-- lo stato finale atteso anche se fossero state rimosse manualmente.
DROP POLICY IF EXISTS "Public can view scelta_products" ON public.scelta_products;
CREATE POLICY "Public can view scelta_products"
    ON public.scelta_products FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Public can view scelta_variants" ON public.scelta_variants;
CREATE POLICY "Public can view scelta_variants"
    ON public.scelta_variants FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Public can view scelta_blocked_slots" ON public.scelta_blocked_slots;
CREATE POLICY "Public can view scelta_blocked_slots"
    ON public.scelta_blocked_slots FOR SELECT
    TO anon, authenticated
    USING (true);

NOTIFY pgrst, 'reload schema';
